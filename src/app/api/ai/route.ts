import { NextRequest, NextResponse } from "next/server";
import { generateWithLLM, getLLMConfig, LLMProvider } from "@/lib/ai/client";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getSupabaseUrl, getSupabaseAnonKey } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

// ── Schema description for the LLM ──────────────────────────────────────────
const SCHEMA = `
## Database Schema (all tables are filtered by user_id automatically — never add user_id to filters)

**retailer_invoices** — the main bills/invoices table
  Columns: id, user_id, company_id, retailer_id, retailer_name, invoice_number,
           bill_date (date), quantity, basic_amount, gst_amount, invoice_amount,
           transportation_amount, cd_amount, total_amount, payment_received,
           outstanding_amount, is_draft, created_at
  FK: company_id → companies.id

**invoice_payments** — payments received against an invoice
  Columns: id, user_id, invoice_id, payment_date, method (Cheque/UPI/NEFT/Cash/Other), amount, created_at
  FK: invoice_id → retailer_invoices.id

**invoice_goods_returns** — goods returned for an invoice
  Columns: id, user_id, invoice_id, return_date, amount, quantity_returned, note, created_at
  FK: invoice_id → retailer_invoices.id

**invoice_transports** — transport details for an invoice
  Columns: id, user_id, invoice_id, transport_name, lr_no, lr_date, amount, created_at
  FK: invoice_id → retailer_invoices.id

**commissions** — commission per invoice
  Columns: id, user_id, retailer_id, invoice_id, invoice_number, retailer_name,
           basic_amount, gst_amount, commission_percent, commission_amount, created_at
  FK: invoice_id → retailer_invoices.id

**companies** — companies the user works with
  Columns: id, user_id, name, gst_no, address, state, created_at

**retailers** — retailers belonging to companies
  Columns: id, user_id, company_id, name, address, contact_no, gst_no, state, created_at
  FK: company_id → companies.id

**profiles** — user profile
  Columns: id, email, full_name, firm_name, phone, created_at
`;

// ── Query plan types ─────────────────────────────────────────────────────────
interface QueryPlan {
  table: string;
  select_columns?: string[]; // columns to include (default: all)
  join_companies?: boolean;  // include company name via company_id FK
  filters?: {
    company_name?: string;
    retailer_name?: string;
    date_from?: string;
    date_to?: string;
    is_draft?: boolean;
    method?: string;         // for invoice_payments
  };
  group_by?: string;         // "company", "retailer_name", "method", "bill_date"
  aggregate?: {
    field: string;           // e.g. "total_amount", "outstanding_amount", "*"
    fn: "count" | "sum";
  };
  limit?: number;
}

async function getProvider(): Promise<LLMProvider> {
  const priority = ["groq", "anthropic", "gemini"] as const;
  for (const p of priority) {
    try {
      getLLMConfig(p);
      return p;
    } catch { continue; }
  }
  throw new Error("No LLM provider configured");
}

// ── Execute a QueryPlan against Supabase ─────────────────────────────────────
async function executeQueryPlan(
  dbClient: ReturnType<typeof createSupabaseClient>,
  plan: QueryPlan,
  userId: string
): Promise<{ rows: any[]; error?: string }> {
  const { table, join_companies, filters = {}, group_by, aggregate, limit = 200 } = plan;

  // Build select string
  let selectStr = "*";
  if (join_companies && table === "retailer_invoices") {
    selectStr = "*, companies(id, name)";
  }

  let q = (dbClient as any).from(table).select(selectStr).eq("user_id", userId);

  // Filters
  if (filters.company_name) {
    const { data: companies } = await (dbClient as any)
      .from("companies")
      .select("id")
      .eq("user_id", userId)
      .ilike("name", `%${filters.company_name}%`);
    if (companies?.length) {
      q = q.in("company_id", companies.map((c: any) => c.id));
    } else {
      return { rows: [] };
    }
  }

  if (filters.retailer_name) q = q.ilike("retailer_name", `%${filters.retailer_name}%`);
  if (filters.date_from)     q = q.gte("bill_date", filters.date_from);
  if (filters.date_to)       q = q.lte("bill_date", filters.date_to);
  if (filters.is_draft !== undefined) q = q.eq("is_draft", filters.is_draft);
  if (filters.method)        q = q.eq("method", filters.method);

  // For payment tables, sort by the actual date field so "last" queries work correctly
  const dateField = table === "invoice_payments" ? "payment_date"
                  : table === "invoice_goods_returns" ? "return_date"
                  : "created_at";
  q = q.order(dateField, { ascending: false }).limit(limit);

  const { data, error } = await q;
  if (error) return { rows: [], error: `${error.code}: ${error.message}` };

  const rows: any[] = data || [];

  // GROUP BY + AGGREGATE in JavaScript
  if (group_by && rows.length) {
    return { rows: groupAndAggregate(rows, group_by, aggregate) };
  }

  return { rows };
}

function groupAndAggregate(
  rows: any[],
  groupBy: string,
  aggregate?: QueryPlan["aggregate"]
): any[] {
  const groupMap = new Map<string, any[]>();

  for (const row of rows) {
    let key: string;
    if (groupBy === "company") {
      key = row.companies?.name ?? row.company_id ?? "Unknown";
    } else {
      key = String(row[groupBy] ?? "Unknown");
    }
    if (!groupMap.has(key)) groupMap.set(key, []);
    groupMap.get(key)!.push(row);
  }

  return Array.from(groupMap.entries()).map(([groupKey, groupRows]) => {
    const base: any = { [groupBy === "company" ? "company_name" : groupBy]: groupKey };
    if (aggregate) {
      if (aggregate.fn === "count") {
        base.count = groupRows.length;
      } else if (aggregate.fn === "sum") {
        base[`total_${aggregate.field}`] = groupRows.reduce(
          (s, r) => s + (Number(r[aggregate.field]) || 0), 0
        );
      }
    } else {
      base.count = groupRows.length;
    }
    return base;
  }).sort((a, b) => (b.count ?? 0) - (a.count ?? 0));
}

function buildSummary(rows: any[], plan: QueryPlan): string {
  if (rows.length === 0) return "No records found";

  // Helper: format a single row as a readable string
  function rowLabel(r: any): string {
    const name = r.name ?? r.retailer_name ?? r.company_name ?? r.transport_name ?? null;
    const amount = r.total_amount ?? r.amount ?? r.commission_amount ?? null;
    const parts: string[] = [];
    if (name) parts.push(`name: ${name}`);
    if (r.payment_date) parts.push(`payment_date: ${r.payment_date}`);
    if (r.bill_date) parts.push(`bill_date: ${r.bill_date}`);
    if (r.return_date) parts.push(`return_date: ${r.return_date}`);
    if (amount !== null) parts.push(`amount: ₹${Number(amount).toLocaleString("en-IN")}`);
    if (r.outstanding_amount !== undefined) parts.push(`outstanding: ₹${Number(r.outstanding_amount).toLocaleString("en-IN")}`);
    if (r.payment_received !== undefined) parts.push(`payment_received: ₹${Number(r.payment_received).toLocaleString("en-IN")}`);
    if (r.invoice_number) parts.push(`invoice_number: ${r.invoice_number}`);
    if (r.method) parts.push(`method: ${r.method}`);
    if (r.created_at) parts.push(`created_at: ${r.created_at}`);
    return parts.length ? parts.join(", ") : JSON.stringify(r);
  }

  // Grouped results
  if (plan.group_by) {
    const lines = rows
      .slice(0, 20)
      .map(r => {
        const groupKey = r[plan.group_by === "company" ? "company_name" : plan.group_by!] ?? "Unknown";
        const rest = Object.entries(r)
          .filter(([k]) => k !== (plan.group_by === "company" ? "company_name" : plan.group_by))
          .map(([k, v]) => {
            if (typeof v === "number" && k.includes("amount")) return `${k}: ₹${(v as number).toLocaleString("en-IN")}`;
            return `${k}: ${v}`;
          })
          .join(", ");
        return `${groupKey}: ${rest}`;
      })
      .join("\n");
    return `${rows.length} group(s):\n${lines}`;
  }

  // Count-only aggregate — still list the names
  if (plan.aggregate?.fn === "count" && !plan.group_by) {
    const names = rows
      .slice(0, 20)
      .map(r => r.name ?? r.retailer_name ?? r.invoice_number ?? r.id)
      .filter(Boolean);
    const nameList = names.length ? `: ${names.join(", ")}` : "";
    return `Count: ${rows.length}${nameList}`;
  }

  // Sum aggregate
  if (plan.aggregate?.fn === "sum" && !plan.group_by) {
    const { field } = plan.aggregate;
    const total = rows.reduce((s, r) => s + (Number(r[field]) || 0), 0);
    return `sum(${field}): ₹${total.toLocaleString("en-IN")}, records: ${rows.length}`;
  }

  // Single row — readable label
  if (rows.length === 1) return rowLabel(rows[0]);

  // Multi-row list — show names + key numeric totals
  const nameLines = rows.slice(0, 20).map(rowLabel).join("\n");
  const numericCols = Object.keys(rows[0]).filter(k => typeof rows[0][k] === "number");
  const totals: Record<string, string> = {};
  numericCols.forEach(col => {
    const t = rows.reduce((s, r) => s + (Number(r[col]) || 0), 0);
    totals[col] = `₹${t.toLocaleString("en-IN")}`;
  });
  return `${rows.length} records:\n${nameLines}\n\nTotals: ${JSON.stringify(totals)}`;
}

// ── Main handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "") || "";

    let userId = "";
    let dbClient: any = supabase;

    if (token && token.length > 50) {
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        userId = user.id;
        dbClient = createSupabaseClient(getSupabaseUrl(), getSupabaseAnonKey(), {
          global: { headers: { Authorization: `Bearer ${token}` } },
        });
      }
    }

    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      userId = user.id;
    }

    const { query } = await req.json();
    if (!query) return NextResponse.json({ error: "Query required" }, { status: 400 });

    const provider = await getProvider();

    // ── Step 1: LLM generates a query plan ────────────────────────────────
    const extractPrompt = `${SCHEMA}

You are a SQL planning agent. Given a natural language question, produce a JSON query plan.

Rules:
- NEVER include user_id in filters — it is always applied automatically
- "bills" and "invoices" both mean the "retailer_invoices" table
- For "per company" / "by company" questions: set join_companies=true and group_by="company"
- For "per retailer" questions: group_by="retailer_name"
- For counting: aggregate={"field":"*","fn":"count"}
- For summing amounts: aggregate={"field":"total_amount","fn":"sum"} (or outstanding_amount, etc.)
- For "last/recent/latest" questions: set limit=1 so only the most recent record is returned
- date_from / date_to are ISO date strings (YYYY-MM-DD)

Output ONLY valid JSON matching this shape (omit optional fields if not needed):
{
  "table": "retailer_invoices",
  "join_companies": true,
  "filters": { "company_name": "...", "retailer_name": "...", "date_from": "...", "date_to": "..." },
  "group_by": "company",
  "aggregate": { "field": "*", "fn": "count" },
  "limit": 200
}

User question: "${query}"`;

    const planJson = await generateWithLLM(provider, extractPrompt, "");
    let plan: QueryPlan = { table: "retailer_invoices" };

    try {
      const match = planJson.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        // Normalise legacy table aliases
        parsed.table = parsed.table === "invoices" ? "retailer_invoices"
                     : parsed.table === "invoice_commissions" ? "commissions"
                     : parsed.table ?? "retailer_invoices";
        // Strip any user_id filter the LLM may have added
        if (parsed.filters) delete parsed.filters.user_id;
        plan = parsed;
      }
    } catch { /* keep default */ }

    console.log("Query plan:", JSON.stringify(plan));

    // ── Step 2: Execute plan ──────────────────────────────────────────────
    const { rows, error: dbError } = await executeQueryPlan(dbClient, plan, userId);

    if (dbError) {
      console.error("DB error:", dbError, plan);
    }

    const summary = dbError
      ? `Database error: ${dbError}`
      : buildSummary(rows, plan);

    // ── Step 3: LLM formats a natural-language answer ──────────────────────
    const answerPrompt = `You are a concise accounting assistant. Answer the question in natural, friendly sentences using ONLY the data provided.
Rules:
- Wrap every company name, retailer name, or entity name in ***name*** (bold + italic markdown)
- Format currency in ₹ Indian format (e.g. ₹1,23,456)
- If there are multiple groups, mention each one on a new line starting with "•"
- Do NOT repeat the same fact twice
- Do NOT say "based on the data" or "according to the records"
- Keep it to 1-3 sentences or bullet points max

Example for a single company: There is 1 company, ***Test Company***, and it has 5 bills.
Example for multiple companies:
• ***Alpha Corp*** — 8 bills
• ***Beta Ltd*** — 3 bills

Question: ${query}
Data: ${summary}`;

    const answer = await generateWithLLM(provider, answerPrompt, "");

    return NextResponse.json({
      answer,
      provider,
      debug: { userId: userId?.slice(0, 8), plan, summary },
      count: rows.length,
      raw: rows.slice(0, 10),
    });
  } catch (error) {
    console.error("AI error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
}
