import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { createClient } from "@/lib/supabase/server";

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

export default async function DashboardHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const username = (user?.user_metadata as { username?: string } | undefined)?.username;
  const email = user?.email ?? "";
  const userId = user?.id;

  let companyCount = 0;
  let retailerCount = 0;

  if (userId) {
    [companyCount, retailerCount] = await Promise.all([
      countForUser(supabase, "companies", userId),
      countForUser(supabase, "retailer_invoices", userId),
    ]);
  }

  return (
    <DashboardOverview
      username={username}
      email={email}
      companyCount={companyCount}
      retailerCount={retailerCount}
    />
  );
}
