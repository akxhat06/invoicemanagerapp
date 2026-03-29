import { InvoiceAuthScreen } from "@/components/invoice-auth-screen";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";

function AuthScreenFallback() {
  return (
    <div className="bg-auth-canvas min-h-screen">
      <div className="bg-primary min-h-[42vh] animate-pulse" />
    </div>
  );
}

export default async function SignupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/");

  return (
    <Suspense fallback={<AuthScreenFallback />}>
      <InvoiceAuthScreen mode="signup" />
    </Suspense>
  );
}
