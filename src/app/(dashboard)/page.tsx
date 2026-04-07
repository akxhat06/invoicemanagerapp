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
  ]);

  const err =
    coRes.error ||
    activeCoRes.error ||
    retRes.error ||
    retNewRes.error ||
    invRes.error ||
    invThisRes.error ||
    invLastRes.error;

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

  let invoiceMonthTrendPct: number | null = null;
  if (invoicesLastMonth > 0) {
    invoiceMonthTrendPct = Math.round(((invoicesThisMonth - invoicesLastMonth) / invoicesLastMonth) * 100);
  } else if (invoicesThisMonth > 0) {
    invoiceMonthTrendPct = 100;
  }

  return (
    <DashboardHomeView
      username={username}
      email={user.email ?? ""}
      companyCount={companyCount}
      activeCompaniesCount={activeCompaniesCount}
      retailerCount={retailerCount}
      retailersNew30d={retailersNew30d}
      invoiceCount={invoiceCount}
      invoicesThisMonth={invoicesThisMonth}
      invoiceMonthTrendPct={invoiceMonthTrendPct}
    />
  );
}
