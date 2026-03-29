import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Resolves "user@domain.com" as email, or looks up email from profiles.username.
 */
export async function resolveIdentifierToEmail(
  supabase: SupabaseClient,
  identifier: string
): Promise<{ email: string | null; error: string | null }> {
  const trimmed = identifier.trim();
  if (!trimmed) {
    return { email: null, error: "Enter your email or username." };
  }

  if (trimmed.includes("@")) {
    return { email: trimmed, error: null };
  }

  const { data, error } = await supabase.rpc("get_email_for_login", {
    identifier: trimmed,
  });

  if (error) {
    return { email: null, error: error.message };
  }

  const resolved = data as string | null;
  if (!resolved) {
    return {
      email: null,
      error: "No account found with that username.",
    };
  }

  return { email: resolved, error: null };
}
