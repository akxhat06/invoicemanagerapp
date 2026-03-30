import { createClient } from "@/lib/supabase/server";
import { cache } from "react";

/**
 * Deduplicate auth user fetches within a single request.
 */
export const getAuthUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
