import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { AuthenticatedDashboardShell } from "@/components/dashboard/authenticated-dashboard-shell";
import { aggregateBillingSummaries } from "@/lib/billing-summary";
import { getAuthUser } from "@/lib/supabase/auth-user";
import { ensureUserProfile } from "@/lib/supabase/ensure-profile";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

async function countForUser(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: string,
  userId: string
): Promise<number> {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  if (error) {
    return 0;
  }
  return count ?? 0;
}

export default async function HomePage() {
  const supabase = await createClient();
  const user = await getAuthUser();

  if (!user) {
    redirect("/login");
  }

  const username = (user.user_metadata as { username?: string } | undefined)?.username;
  const email = user.email ?? "";
  await ensureUserProfile(supabase, user);

  const { data: profile } = await supabase
    .from("profiles")
    .select("welcome_tour_completed_at")
    .eq("id", user.id)
    .maybeSingle();
  const showWelcomeTour = profile != null && profile.welcome_tour_completed_at == null;

  const [
    companyCount,
    retailerCount,
    transportCount,
    paymentCount,
    returnCount,
    commissionCount,
    invRes,
    compRes,
  ] = await Promise.all([
    countForUser(supabase, "companies", user.id),
    countForUser(supabase, "retailers", user.id),
    countForUser(supabase, "invoice_transports", user.id),
    countForUser(supabase, "invoice_payments", user.id),
    countForUser(supabase, "invoice_goods_returns", user.id),
    countForUser(supabase, "invoice_commissions", user.id),
    supabase
      .from("retailer_invoices")
      .select(
        "company_id, retailer_id, retailer_name, total_amount, payment_received, outstanding_amount, is_draft"
      )
      .eq("user_id", user.id),
    supabase.from("companies").select("id, name").eq("user_id", user.id),
  ]);

  const companyIdToName = new Map((compRes.data ?? []).map((c) => [c.id as string, c.name as string]));
  const billing = aggregateBillingSummaries(invRes.data ?? [], companyIdToName);

  return (
    <AuthenticatedDashboardShell showWelcomeTour={showWelcomeTour}>
      <DashboardOverview
        username={username}
        email={email}
        companyCount={companyCount}
        retailerCount={retailerCount}
        transportCount={transportCount}
        paymentCount={paymentCount}
        returnCount={returnCount}
        commissionCount={commissionCount}
        billingByCompany={billing.byCompany}
        billingByRetailer={billing.byRetailer}
        billingGrand={billing.grand}
      />
    </AuthenticatedDashboardShell>
  );
}
