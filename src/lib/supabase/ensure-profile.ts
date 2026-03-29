import type { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";

/**
 * Upserts the public.profiles row for the signed-in user so DB stays in sync
 * with auth (email, username, phone, user_metadata).
 */
export async function ensureUserProfile(
  supabase: SupabaseClient,
  user: User
): Promise<{ error: Error | null }> {
  const meta = user.user_metadata as Record<string, unknown> | undefined;

  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      email: user.email ?? null,
      username:
        typeof meta?.username === "string" && meta.username.trim()
          ? meta.username.trim()
          : null,
      phone: user.phone ?? null,
      user_metadata: meta ?? {},
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  return { error: error ? new Error(error.message) : null };
}
