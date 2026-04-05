import { AuthLoginCardClient } from "@/components/auth/auth-login-card-client";
import { AuthLoginShell } from "@/components/auth/auth-login-shell";
import { LoginEntranceGate } from "@/components/auth/login-entrance-gate";
import { LoginCardSkeleton } from "@/components/auth/login-card-skeleton";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/");
  }

  return (
    <LoginEntranceGate>
      <AuthLoginShell flow="signin">
        <Suspense fallback={<LoginCardSkeleton />}>
          <AuthLoginCardClient mode="signin" />
        </Suspense>
      </AuthLoginShell>
    </LoginEntranceGate>
  );
}
