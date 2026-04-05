"use client";

import { EmailPasswordAuthForm } from "@/components/email-password-auth-form";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

type Mode = "signin" | "signup";

type Props = {
  mode: Mode;
};

export function AuthLoginCardClient({ mode }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const authError = searchParams.get("error") === "auth";

  const isSignIn = mode === "signin";

  useEffect(() => {
    router.prefetch("/");
  }, [router]);

  return (
    <>
      <h2 className="login-split-form-title font-login-serif text-left text-2xl font-semibold tracking-tight sm:text-3xl">
        {isSignIn ? "Welcome back" : "Create your account"}
      </h2>
      <p className="login-split-form-subtitle mt-2 text-left text-[14px] leading-snug sm:text-[15px]">
        {isSignIn ? "Sign in to your account to continue." : "Get started in a few steps."}
      </p>

      {authError && (
        <p
          className="auth-login-alert-error mt-6 rounded-xl border px-3 py-2.5 text-left text-sm"
          role="alert"
        >
          Something went wrong signing in. Please try again.
        </p>
      )}

      <EmailPasswordAuthForm mode={mode} variant="split" />

      {isSignIn ? (
        <p className="login-split-form-footer mt-8 text-center text-sm sm:mt-10">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="login-split-gold-link">
            Sign up
          </Link>
        </p>
      ) : (
        <p className="login-split-form-footer mt-5 text-center text-sm sm:mt-6">
          Already have an account?{" "}
          <Link href="/login" className="login-split-gold-link">
            Sign in
          </Link>
        </p>
      )}
    </>
  );
}
