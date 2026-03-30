import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { getAuthUser } from "@/lib/supabase/auth-user";
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

  const username = (user.user_metadata as { username?: string } | undefined)?.username;
  const avatarUrl = (user.user_metadata as { avatar_url?: string } | undefined)?.avatar_url;

  return (
    <DashboardLayout
      username={username}
      email={user.email ?? ""}
      avatarUrl={avatarUrl}
      showWelcomeTour={showWelcomeTour}
    >
      {children}
    </DashboardLayout>
  );
}
