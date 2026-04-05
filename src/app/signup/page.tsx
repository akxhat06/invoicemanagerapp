import { AuthLoginCardClient } from "@/components/auth/auth-login-card-client";
import { AuthLoginShell } from "@/components/auth/auth-login-shell";
import { LoginCardSkeleton } from "@/components/auth/login-card-skeleton";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export default async function SignupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/");
  }

  return (
    <AuthLoginShell flow="signup">
      <Suspense fallback={<LoginCardSkeleton />}>
        <AuthLoginCardClient mode="signup" />
      </Suspense>
    </AuthLoginShell>
  );
}
