"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function completeWelcomeTour() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false as const, error: "Not signed in" };
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("profiles")
    .update({
      welcome_tour_completed_at: now,
      updated_at: now,
    })
    .eq("id", user.id);

  if (error) {
    return { ok: false as const, error: error.message };
  }

  revalidatePath("/", "layout");
  return { ok: true as const };
}
