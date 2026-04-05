import { AuthLoginShell } from "@/components/auth/auth-login-shell";
import { ForgotPasswordScreen } from "@/components/forgot-password-screen";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Forgot password",
  description: "Reset your Invoice Manager password",
};

export default function ForgotPasswordPage() {
  return (
    <AuthLoginShell>
      <ForgotPasswordScreen variant="split" />
    </AuthLoginShell>
  );
}
