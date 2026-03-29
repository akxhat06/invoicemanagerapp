import { ForgotPasswordScreen } from "@/components/forgot-password-screen";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function ForgotPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    redirect("/");
  }

  return <ForgotPasswordScreen />;
}
