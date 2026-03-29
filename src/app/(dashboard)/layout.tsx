import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { ensureUserProfile } from "@/lib/supabase/ensure-profile";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  await ensureUserProfile(supabase, user);

  const username = (user.user_metadata as { username?: string } | undefined)
    ?.username;

  const { data: profile } = await supabase
    .from("profiles")
    .select("welcome_tour_completed_at")
    .eq("id", user.id)
    .maybeSingle();

  const showWelcomeTour =
    profile != null && profile.welcome_tour_completed_at == null;

  return (
    <DashboardLayout
      username={username}
      email={user.email ?? ""}
      showWelcomeTour={showWelcomeTour}
    >
      {children}
    </DashboardLayout>
  );
}
