import { NextRequest, NextResponse } from "next/server";
import { generateWithLLM, getLLMConfig, LLMProvider } from "@/lib/ai/client";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getSupabaseUrl, getSupabaseAnonKey } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

// ── Schema description for the LLM ──────────────────────────────────────────
const SCHEMA = `
## Hierarchy (top to bottom)
Company → Retailer → Invoice/Bill → [Payments, Goods Returns/Credits, Commission, Transport]

## Tables

**companies** — top-level entities
  Columns: id, user_id, name, gst_no, address, state, created_at

**retailers** — belong to a company
  Columns: id, user_id, company_id, name, address, contact_no, gst_no, state, created_at
  FK: company_id → companies.id

**retailer_invoices** — the main bills/invoices (linked to a retailer + company)
  Columns: id, user_id, company_id, retailer_id, retailer_name, invoice_number,
           bill_date, quantity, basic_amount, gst_amount, invoice_amount,
           transportation_amount, cd_amount, total_amount, payment_received,
           outstanding_amount, is_draft, created_at
  FK: company_id → companies.id

**invoice_payments** — payments received against a bill
  Columns: id, user_id, invoice_id, payment_date, method (Cheque/UPI/NEFT/Cash/Other), amount, created_at
  FK: invoice_id → retailer_invoices.id

**invoice_goods_returns** — goods returned / credit notes
  Columns: id, user_id, invoice_id, return_date, amount, quantity_returned, note, created_at
  FK: invoice_id → retailer_invoices.id

**invoice_transports** — transport for a bill
  Columns: id, user_id, invoice_id, transport_name, lr_no, lr_date, amount, created_at
  FK: invoice_id → retailer_invoices.id

**commissions** — commission per bill
  Columns: id, user_id, retailer_id, invoice_id, invoice_number, retailer_name,
           basic_amount, gst_amount, commission_percent, commission_amount,
           commission_paid, status (pending|completed), created_at
  FK: invoice_id → retailer_invoices.id

**profiles** — user profile
  Columns: id, email, full_name, firm_name, phone, created_at

## Key rule
All tables connect back to Company through:
  invoice_payments / invoice_goods_returns / invoice_transports / commissions
    → invoice_id → retailer_invoices.company_id → companies
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

// ── Tables that link to companies via invoice_id → retailer_invoices → company_id
const INVOICE_CHILD_TABLES = new Set([
  "invoice_payments",
  "invoice_goods_returns",
  "invoice_transports",
  "commissions",
]);

// ── Build the select string with the right join depth ────────────────────────
function buildSelectStr(table: string, joinCompanies: boolean): string {
  if (!joinCompanies) return "*";
  if (table === "retailer_invoices") return "*, companies(id, name)";
  if (table === "retailers")         return "*, companies(id, name)";
  if (INVOICE_CHILD_TABLES.has(table))
    return "*, retailer_invoices(id, company_id, retailer_name, companies(id, name))";
  return "*";
}

// ── Resolve the company name from any row regardless of join depth ───────────
function resolveCompanyName(row: any): string | null {
  return row.companies?.name                   // direct join (retailer_invoices / retailers)
      ?? row.retailer_invoices?.companies?.name // nested join (payments / returns / commission / transport)
      ?? null;
}

// ── Resolve retailer name from any row ───────────────────────────────────────
function resolveRetailerName(row: any): string | null {
  return row.retailer_name                   // direct (retailer_invoices, commissions)
      ?? row.retailer_invoices?.retailer_name // nested (payments, returns, transports)
      ?? null;
}

// ── Execute a QueryPlan against Supabase ─────────────────────────────────────
async function executeQueryPlan(
  dbClient: ReturnType<typeof createSupabaseClient>,
  plan: QueryPlan,
  userId: string
): Promise<{ rows: any[]; error?: string }> {
  const { table, join_companies, filters = {}, group_by, aggregate, limit = 200 } = plan;

  const selectStr = buildSelectStr(table, !!join_companies);
  let q = (dbClient as any).from(table).select(selectStr).eq("user_id", userId);

  // ── Company filter ────────────────────────────────────────────────────────
  if (filters.company_name) {
    const { data: companies } = await (dbClient as any)
      .from("companies").select("id").eq("user_id", userId)
      .ilike("name", `%${filters.company_name}%`);
    if (!companies?.length) return { rows: [] };
    const companyIds = companies.map((c: any) => c.id);

    if (table === "retailer_invoices" || table === "retailers") {
      q = q.in("company_id", companyIds);
    } else if (INVOICE_CHILD_TABLES.has(table)) {
      // Must go through retailer_invoices to find matching invoice_ids
      const { data: invoices } = await (dbClient as any)
        .from("retailer_invoices").select("id").eq("user_id", userId)
        .in("company_id", companyIds);
      if (!invoices?.length) return { rows: [] };
      q = q.in("invoice_id", invoices.map((i: any) => i.id));
    }
  }

  // ── Retailer filter ───────────────────────────────────────────────────────
  if (filters.retailer_name) {
    if (table === "retailer_invoices" || table === "commissions") {
      q = q.ilike("retailer_name", `%${filters.retailer_name}%`);
    } else if (INVOICE_CHILD_TABLES.has(table)) {
      const { data: invoices } = await (dbClient as any)
        .from("retailer_invoices").select("id").eq("user_id", userId)
        .ilike("retailer_name", `%${filters.retailer_name}%`);
      if (!invoices?.length) return { rows: [] };
      q = q.in("invoice_id", invoices.map((i: any) => i.id));
    } else if (table === "retailers") {
      q = q.ilike("name", `%${filters.retailer_name}%`);
    }
  }

  if (filters.date_from)              q = q.gte("bill_date", filters.date_from);
  if (filters.date_to)                q = q.lte("bill_date", filters.date_to);
  if (filters.is_draft !== undefined) q = q.eq("is_draft", filters.is_draft);
  if (filters.method)                 q = q.eq("method", filters.method);

  // Sort by the most relevant date field
  const dateField = table === "invoice_payments"      ? "payment_date"
                  : table === "invoice_goods_returns"  ? "return_date"
                  : "created_at";
  q = q.order(dateField, { ascending: false }).limit(limit);

  const { data, error } = await q;
  if (error) return { rows: [], error: `${error.code}: ${error.message}` };

  const rows: any[] = data || [];
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
      key = resolveCompanyName(row) ?? row.company_id ?? "Unknown";
    } else if (groupBy === "retailer_name") {
      key = resolveRetailerName(row) ?? "Unknown";
    } else {
      key = String(row[groupBy] ?? "Unknown");
    }
    if (!groupMap.has(key)) groupMap.set(key, []);
    groupMap.get(key)!.push(row);
  }

  return Array.from(groupMap.entries()).map(([groupKey, groupRows]) => {
    const labelKey = groupBy === "company" ? "company_name" : groupBy;
    const base: any = { [labelKey]: groupKey };
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
  }).sort((a, b) => (b.count ?? b[Object.keys(b).find(k => k.startsWith("total_")) ?? ""] ?? 0)
                  - (a.count ?? a[Object.keys(a).find(k => k.startsWith("total_")) ?? ""] ?? 0));
}

function buildSummary(rows: any[], plan: QueryPlan): string {
  if (rows.length === 0) return "No records found";

  function rowLabel(r: any): string {
    const parts: string[] = [];
    const company   = resolveCompanyName(r);
    const retailer  = resolveRetailerName(r);
    if (company)  parts.push(`company: ${company}`);
    if (retailer && retailer !== company) parts.push(`retailer: ${retailer}`);
    if (r.invoice_number)    parts.push(`invoice: ${r.invoice_number}`);
    if (r.payment_date)      parts.push(`payment_date: ${r.payment_date}`);
    if (r.bill_date)         parts.push(`bill_date: ${r.bill_date}`);
    if (r.return_date)       parts.push(`return_date: ${r.return_date}`);
    const amount = r.total_amount ?? r.amount ?? r.commission_amount ?? null;
    if (amount !== null)     parts.push(`amount: ₹${Number(amount).toLocaleString("en-IN")}`);
    if (r.outstanding_amount !== undefined) parts.push(`outstanding: ₹${Number(r.outstanding_amount).toLocaleString("en-IN")}`);
    if (r.payment_received  !== undefined)  parts.push(`payment_received: ₹${Number(r.payment_received).toLocaleString("en-IN")}`);
    if (r.method)            parts.push(`method: ${r.method}`);
    if (r.note)              parts.push(`note: ${r.note}`);
    return parts.length ? parts.join(", ") : JSON.stringify(r);
  }

  // Grouped results
  if (plan.group_by) {
    const labelKey = plan.group_by === "company" ? "company_name" : plan.group_by;
    const lines = rows.slice(0, 25).map(r => {
      const groupKey = r[labelKey] ?? "Unknown";
      const rest = Object.entries(r)
        .filter(([k]) => k !== labelKey)
        .map(([k, v]) => {
          if (typeof v === "number" && k.includes("amount"))
            return `${k}: ₹${(v as number).toLocaleString("en-IN")}`;
          return `${k}: ${v}`;
        }).join(", ");
      return `• ${groupKey}: ${rest}`;
    }).join("\n");
    return `${rows.length} group(s):\n${lines}`;
  }

  // Count-only — just return the number, no name list (avoids LLM listing everything)
  if (plan.aggregate?.fn === "count" && !plan.group_by) {
    return `Total count: ${rows.length}`;
  }

  // Sum
  if (plan.aggregate?.fn === "sum" && !plan.group_by) {
    const { field } = plan.aggregate;
    const total = rows.reduce((s, r) => s + (Number(r[field]) || 0), 0);
    return `Total ${field}: ₹${total.toLocaleString("en-IN")} across ${rows.length} records`;
  }

  // Single row
  if (rows.length === 1) return rowLabel(rows[0]);

  // Multi-row list — provide clean name list + totals separately so LLM can pick what's relevant
  const nameList = rows.slice(0, 30)
    .map((r, i) => {
      const name = resolveRetailerName(r) ?? r.invoice_number ?? r.name ?? `#${i + 1}`;
      const company = resolveCompanyName(r);
      const amount = r.total_amount ?? r.amount ?? r.commission_amount ?? null;
      const date = r.bill_date ?? r.payment_date ?? r.return_date ?? null;
      const parts = [name];
      if (company) parts.push(`(${company})`);
      if (date) parts.push(date);
      if (amount !== null) parts.push(`₹${Number(amount).toLocaleString("en-IN")}`);
      return parts.join(" · ");
    })
    .join("\n");

  const numericCols = Object.keys(rows[0]).filter(k => typeof rows[0][k] === "number" && k.includes("amount"));
  const totals: Record<string, string> = {};
  numericCols.forEach(col => {
    const t = rows.reduce((s, r) => s + (Number(r[col]) || 0), 0);
    totals[col] = `₹${t.toLocaleString("en-IN")}`;
  });
  const totalLine = Object.entries(totals).map(([k, v]) => `${k}: ${v}`).join(", ");
  return `${rows.length} records:\n${nameList}${totalLine ? `\n\nTotals: ${totalLine}` : ""}`;
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

    const { query, history = [] } = await req.json();
    if (!query) return NextResponse.json({ error: "Query required" }, { status: 400 });

    // Format prior turns for LLM context (capped at last 6 messages = 3 turns)
    const recentHistory: Array<{ role: string; content: string }> = (history as any[])
      .slice(-6)
      .filter((m) => m.role && m.content?.trim());
    const historyBlock = recentHistory.length
      ? `\n\nConversation so far:\n${recentHistory.map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`).join("\n")}`
      : "";

    const provider = await getProvider();

    // ── Step 1: LLM generates a query plan ────────────────────────────────
    const extractPrompt = `${SCHEMA}

You are a SQL planning agent. Given a natural language question, produce a JSON query plan.

Rules (MUST follow):
- NEVER include user_id in filters — it is always applied automatically
- "bills" and "invoices" both mean the "retailer_invoices" table
- "credit notes" / "credits" / "returns" / "goods returns" mean the "invoice_goods_returns" table
- "payments" mean the "invoice_payments" table
- "commission" / "commissions" mean the "commissions" table
- "transport" means the "invoice_transports" table

For company-level grouping/filtering (ANY table):
  - Always set join_companies=true when the question involves company names or grouping by company
  - This works for ALL tables: invoice_payments, invoice_goods_returns, commissions, invoice_transports, retailer_invoices, retailers
  - Use filters.company_name to filter by a specific company name

For grouping:
  - "per company" / "by company" → group_by="company"
  - "per retailer" / "by retailer" → group_by="retailer_name"
  - "per payment method" → group_by="method"
  - For counting: aggregate={"field":"*","fn":"count"}
  - For summing: aggregate={"field":"<field_name>","fn":"sum"}
    - invoices: total_amount / outstanding_amount / basic_amount
    - payments: amount
    - commissions: commission_amount
    - returns: amount

Specific patterns:
  - "bills/invoices per company" → table="retailer_invoices", join_companies=true, group_by="company", aggregate={"field":"*","fn":"count"}
  - "payments per company" → table="invoice_payments", join_companies=true, group_by="company", aggregate={"field":"amount","fn":"sum"}
  - "commission per company" → table="commissions", join_companies=true, group_by="company", aggregate={"field":"commission_amount","fn":"sum"}
  - "returns/credits per company" → table="invoice_goods_returns", join_companies=true, group_by="company", aggregate={"field":"amount","fn":"sum"}
  - "outstanding per company" → table="retailer_invoices", join_companies=true, group_by="company", aggregate={"field":"outstanding_amount","fn":"sum"}
  - "payments for company X" → table="invoice_payments", join_companies=true, filters={"company_name":"X"}
  - "last/recent/latest" → limit=1

Output ONLY valid JSON:
{
  "table": "retailer_invoices",
  "join_companies": true,
  "filters": { "company_name": "...", "retailer_name": "...", "date_from": "YYYY-MM-DD", "date_to": "YYYY-MM-DD", "method": "..." },
  "group_by": "company",
  "aggregate": { "field": "*", "fn": "count" },
  "limit": 200
}

User question: "${query}"${historyBlock}`;

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
    const answerPrompt = `You are a concise accounting assistant. Match your response style exactly to what the user asked. Use ONLY the data provided — never invent numbers.

Response style rules (pick the one that fits the question):
- "how many / count / total number" → ONE sentence: "You have X invoices." Nothing else.
- "list / show / which ones / what are / give me" → Bullet list of names only. No extra detail unless asked.
- "total amount / sum / how much" → ONE sentence with the amount. e.g. "Total outstanding is ₹1,23,456."
- "per company / by company / per retailer" → One bullet per group: "• ***Name*** — value"
- "details / tell me about / last / recent" → 2-3 sentences with relevant details.

Formatting:
- Wrap every company/retailer/entity name in ***name*** (bold + italic)
- Currency in ₹ Indian format (₹1,23,456)
- No filler phrases like "based on the data", "according to records", "I can see that"
- Never repeat the same fact twice
- Never mention a number not present in the Data section

Question: ${query}${historyBlock}
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
