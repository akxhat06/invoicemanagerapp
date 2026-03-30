import type { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";

/**
 * Ensures a public.profiles row exists for the signed-in user.
 * Uses `ignoreDuplicates` so we don't rewrite profile data on every navigation.
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
    },
    { onConflict: "id", ignoreDuplicates: true }
  );

  return { error: error ? new Error(error.message) : null };
}
