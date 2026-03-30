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

  const usernameFromMeta = (user.user_metadata as { username?: string } | undefined)?.username ?? "";
  const avatarFromMeta = (user.user_metadata as { avatar_url?: string } | undefined)?.avatar_url ?? "";

  return (
    <ProfileScreen
      initialUsername={profile?.username ?? usernameFromMeta}
      initialPhone={profile?.phone ?? user.phone ?? ""}
      initialAddress={profile?.address ?? ""}
      email={user.email ?? ""}
      initialAvatarUrl={profile?.avatar_url ?? avatarFromMeta}
    />
  );
}
