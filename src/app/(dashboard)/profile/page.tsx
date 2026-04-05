import { ProfileScreen } from "@/components/profile/profile-screen";
import { getAuthUser } from "@/lib/supabase/auth-user";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
  const user = await getAuthUser();
  if (!user) {
    redirect("/login");
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("username, phone, address, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  const meta = (user.user_metadata ?? {}) as { username?: string; avatar_url?: string };

  return (
    <ProfileScreen
      initialUsername={profile?.username ?? meta.username ?? ""}
      initialPhone={profile?.phone ?? ""}
      initialAddress={profile?.address ?? ""}
      email={user.email ?? ""}
      initialAvatarUrl={profile?.avatar_url ?? meta.avatar_url ?? ""}
    />
  );
}
