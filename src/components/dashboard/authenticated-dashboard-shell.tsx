import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { getAuthUser } from "@/lib/supabase/auth-user";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

/**
 * Auth gate + dashboard chrome for signed-in areas. Used by `app/page.tsx` and `(dashboard)/layout.tsx`.
 */
export async function AuthenticatedDashboardShell({
  children,
  showWelcomeTour = false,
}: {
  children: React.ReactNode;
  showWelcomeTour?: boolean;
}) {
  const user = await getAuthUser();

  if (!user) {
    redirect("/login");
  }

  const meta = (user.user_metadata ?? {}) as { username?: string; avatar_url?: string };
  const username = meta.username;

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  const avatarUrl = profile?.avatar_url ?? meta.avatar_url ?? undefined;

  return (
    <DashboardLayout
      username={username}
      email={user.email ?? ""}
      userId={user.id}
      avatarUrl={avatarUrl}
      showWelcomeTour={showWelcomeTour}
    >
      {children}
    </DashboardLayout>
  );
}
