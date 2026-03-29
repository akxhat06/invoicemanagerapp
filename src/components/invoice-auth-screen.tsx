"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { EmailPasswordAuthForm } from "./email-password-auth-form";

type Mode = "signin" | "signup";

type Props = {
  mode: Mode;
};

function LogoMark() {
  return (
    <div className="relative flex items-center justify-center">
      {/* Soft halo — matches logo gradient without a heavy box */}
      <Image
        src="/logo.svg"
        alt="Invoice Manager"
        width={128}
        height={128}
        priority
        className="relative h-28 w-28 object-contain drop-shadow-[0_12px_32px_rgba(0,0,0,0.38)] sm:h-32 sm:w-32"
      />
    </div>
  );
}

export function InvoiceAuthScreen({ mode }: Props) {
  const searchParams = useSearchParams();
  const authError = searchParams.get("error") === "auth";

  const isSignIn = mode === "signin";

  return (
    <div className="bg-auth-canvas relative flex min-h-screen flex-col font-sans transition-colors">
      <div className="absolute right-4 top-4 z-30">
        <div className="border-border bg-card/90 rounded-xl border shadow-sm backdrop-blur">
          <ThemeToggle />
        </div>
      </div>

      <div className="bg-auth-hero relative flex min-h-[38vh] shrink-0 flex-col items-center justify-center overflow-hidden px-6 pb-28 pt-10 sm:min-h-[40vh]">
        <div
          className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full blur-3xl"
          style={{ background: "var(--auth-hero-glow)" }}
          aria-hidden
        />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-amber-900/20 blur-3xl" aria-hidden />
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl"
          style={{ background: "var(--auth-hero-glow-mid)" }}
          aria-hidden
        />

        <div className="relative z-10 flex flex-col items-center text-center">
          <LogoMark />
          <h1 className="mt-2 text-[1.65rem] font-bold tracking-tight text-white sm:mt-3">Invoice Manager</h1>
          <p className="mt-2 max-w-sm text-[15px] leading-relaxed text-white/75">
            Manage your business, effortlessly
          </p>
        </div>
      </div>

      <div className="relative z-10 -mt-24 flex flex-1 flex-col px-4 pb-12">
        <div
          className="border-auth-card-border bg-auth-card mx-auto w-full max-w-md rounded-2xl border px-6 py-8 shadow-[0_20px_50px_-20px_var(--auth-card-shadow)] dark:shadow-[0_24px_60px_-20px_var(--auth-card-shadow)]"
        >
          <h2 className="text-foreground text-center text-2xl font-bold tracking-tight">
            {isSignIn ? "Welcome back" : "Create your account"}
          </h2>
          <p className="text-muted-foreground mt-2 text-center text-[15px]">
            {isSignIn
              ? "Sign in to continue to your account"
              : "Get started — create your account in a few steps"}
          </p>

          {authError && (
            <p
              className="mt-4 rounded-xl border border-red-200/80 bg-red-50 px-3 py-2.5 text-center text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
              role="alert"
            >
              Something went wrong signing in. Please try again.
            </p>
          )}

          <EmailPasswordAuthForm mode={mode} />

          <p className="text-muted-foreground mt-8 text-center text-[15px]">
            {isSignIn ? (
              <>
                Don&apos;t have an account?{" "}
                <Link href="/signup" className="text-auth-link font-semibold transition hover:opacity-90">
                  Sign Up
                </Link>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <Link href="/login" className="text-auth-link font-semibold transition hover:opacity-90">
                  Sign In
                </Link>
              </>
            )}
          </p>
        </div>

        <p className="text-muted-foreground mx-auto mt-auto max-w-sm px-2 pt-10 text-center text-xs leading-relaxed">
          By continuing you agree to{" "}
          <span className="underline decoration-zinc-300 underline-offset-2 dark:decoration-zinc-600">
            Terms &amp; Privacy Policy
          </span>
        </p>

        <div className="bg-border mx-auto mt-6 h-1 w-24 rounded-full" aria-hidden />
      </div>
    </div>
  );
}
