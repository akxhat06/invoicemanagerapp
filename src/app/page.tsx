import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { AuthenticatedDashboardShell } from "@/components/dashboard/authenticated-dashboard-shell";
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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const username = (user.user_metadata as { username?: string } | undefined)?.username;
  const email = user.email ?? "";

  const [companyCount, retailerCount] = await Promise.all([
    countForUser(supabase, "companies", user.id),
    countForUser(supabase, "retailer_invoices", user.id),
  ]);

  return (
    <AuthenticatedDashboardShell>
      <DashboardOverview
        username={username}
        email={email}
        companyCount={companyCount}
        retailerCount={retailerCount}
      />
    </AuthenticatedDashboardShell>
  );
}
