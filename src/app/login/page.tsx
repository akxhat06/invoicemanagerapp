import { AuthLoginCardClient } from "@/components/auth/auth-login-card-client";
import { AuthLoginShell } from "@/components/auth/auth-login-shell";
import { LoginCardSkeleton } from "@/components/auth/login-card-skeleton";
import { SignedInPanel } from "@/components/signed-in-panel";
import { createClient } from "@/lib/supabase/server";
import { Suspense } from "react";

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    return (
      <AuthLoginShell flow="signin">
        <SignedInPanel email={user.email ?? ""} />
      </AuthLoginShell>
    );
  }

  return (
    <AuthLoginShell flow="signin">
      <Suspense fallback={<LoginCardSkeleton />}>
        <AuthLoginCardClient mode="signin" />
      </Suspense>
    </AuthLoginShell>
  );
}
