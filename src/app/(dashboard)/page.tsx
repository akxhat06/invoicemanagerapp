import { DashboardHomeView } from "@/components/dashboard/dashboard-home-view";
import { getAuthUser } from "@/lib/supabase/auth-user";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

function calendarMonthRange(year: number, month0: number) {
  const first = `${year}-${String(month0 + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month0 + 1, 0).getDate();
  const last = `${year}-${String(month0 + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { first, last };
}

export default async function DashboardHomePage() {
  const user = await getAuthUser();
  if (!user) {
    redirect("/login");
  }

  const supabase = await createClient();
  const username = (user.user_metadata as { username?: string } | undefined)?.username;

  const now = new Date();
  const thisMonth = calendarMonthRange(now.getFullYear(), now.getMonth());
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonth = calendarMonthRange(prevMonthDate.getFullYear(), prevMonthDate.getMonth());

  const since30 = new Date();
  since30.setDate(since30.getDate() - 30);
  const since30Iso = since30.toISOString();

  const [
    coRes,
    activeCoRes,
    retRes,
    retNewRes,
    invRes,
    invThisRes,
    invLastRes,
    invBilledSumRes,
    paymentsSumRes,
    commissionRes,
    commissionAmtRes,
  ] = await Promise.all([
    supabase.from("companies").select("id", { count: "exact", head: true }),
    supabase.from("companies").select("id", { count: "exact", head: true }).or("is_draft.eq.false,is_draft.is.null"),
    supabase.from("retailers").select("id", { count: "exact", head: true }),
    supabase.from("retailers").select("id", { count: "exact", head: true }).gte("created_at", since30Iso),
    supabase.from("retailer_invoices").select("id", { count: "exact", head: true }),
    supabase
      .from("retailer_invoices")
      .select("id", { count: "exact", head: true })
      .gte("bill_date", thisMonth.first)
      .lte("bill_date", thisMonth.last),
    supabase
      .from("retailer_invoices")
      .select("id", { count: "exact", head: true })
      .gte("bill_date", lastMonth.first)
      .lte("bill_date", lastMonth.last),
    supabase
      .from("retailer_invoices")
      .select("id, total_amount")
      .or("is_draft.eq.false,is_draft.is.null"),
    supabase.from("invoice_payments").select("amount, invoice_id"),
    supabase.from("commissions").select("id", { count: "exact", head: true }),
    supabase.from("commissions").select("commission_amount"),
  ]);

  const err =
    coRes.error ||
    activeCoRes.error ||
    retRes.error ||
    retNewRes.error ||
    invRes.error ||
    invThisRes.error ||
    invLastRes.error ||
    invBilledSumRes.error ||
    paymentsSumRes.error ||
    commissionRes.error ||
    commissionAmtRes.error;

  if (err) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
        Could not load dashboard: {err.message}
      </div>
    );
  }

  const companyCount = coRes.count ?? 0;
  const activeCompaniesCount = activeCoRes.count ?? 0;
  const retailerCount = retRes.count ?? 0;
  const retailersNew30d = retNewRes.count ?? 0;
  const invoiceCount = invRes.count ?? 0;
  const invoicesThisMonth = invThisRes.count ?? 0;
  const invoicesLastMonth = invLastRes.count ?? 0;
  const commissionCount = commissionRes.count ?? 0;
  const totalCommissionAmount = (commissionAmtRes.data ?? []).reduce((s, r) => {
    const v = (r as { commission_amount?: number | string | null }).commission_amount;
    const n = v === null || v === undefined ? 0 : typeof v === "string" ? parseFloat(v) : Number(v);
    return s + (Number.isFinite(n) ? n : 0);
  }, 0);

  let invoiceMonthTrendPct: number | null = null;
  if (invoicesLastMonth > 0) {
    invoiceMonthTrendPct = Math.round(((invoicesThisMonth - invoicesLastMonth) / invoicesLastMonth) * 100);
  } else if (invoicesThisMonth > 0) {
    invoiceMonthTrendPct = 100;
  }

  /** Sum in JS — PostgREST aggregate (e.g. total_amount.sum()) is disabled on this project. */
  const nonDraftInvoiceIds = new Set<string>();
  let companiesTotalBilledSafe = 0;
  for (const row of invBilledSumRes.data ?? []) {
    const r = row as { id?: string | null; total_amount?: number | string | null };
    if (r.id) nonDraftInvoiceIds.add(r.id);
    const ta = r.total_amount;
    const totalN = ta === null || ta === undefined ? 0 : typeof ta === "string" ? parseFloat(ta) : Number(ta);
    companiesTotalBilledSafe += Number.isFinite(totalN) ? totalN : 0;
  }

  /**
   * Total payment must come from `invoice_payments`, not `retailer_invoices.payment_received`.
   * The denormalized column can drift (e.g. after credit notes or legacy saves); summing rows matches reality.
   * Only count payments linked to non-draft invoices (same scope as before).
   */
  let totalPaymentReceived = 0;
  for (const row of paymentsSumRes.data ?? []) {
    const r = row as { amount?: number | string | null; invoice_id?: string | null };
    if (!r.invoice_id || !nonDraftInvoiceIds.has(r.invoice_id)) continue;
    const raw = r.amount;
    const n =
      raw === null || raw === undefined ? 0 : typeof raw === "string" ? parseFloat(raw.replace(/,/g, "")) : Number(raw);
    totalPaymentReceived += Number.isFinite(n) ? n : 0;
  }
  totalPaymentReceived = Math.round(totalPaymentReceived * 100) / 100;

  return (
    <DashboardHomeView
      username={username}
      email={user.email ?? ""}
      companyCount={companyCount}
      companiesTotalBilled={companiesTotalBilledSafe}
      totalPaymentReceived={totalPaymentReceived}
      activeCompaniesCount={activeCompaniesCount}
      retailerCount={retailerCount}
      retailersNew30d={retailersNew30d}
      invoiceCount={invoiceCount}
      invoicesThisMonth={invoicesThisMonth}
      invoiceMonthTrendPct={invoiceMonthTrendPct}
      commissionCount={commissionCount}
      totalCommissionAmount={totalCommissionAmount}
    />
  );
}
