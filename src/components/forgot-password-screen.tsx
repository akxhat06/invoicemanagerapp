"use client";

import { resolveIdentifierToEmail } from "@/lib/auth/resolve-login-email";
import { ThemeToggle } from "@/components/theme-toggle";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useState } from "react";

type Props = {
  /** When `split`, render only the form column content (use inside `AuthLoginShell`). */
  variant?: "standalone" | "split";
};

function LogoMark() {
  return (
    <div className="border-primary bg-accent text-primary flex h-16 w-16 items-center justify-center rounded-2xl border-2 shadow-sm">
      <svg
        className="h-9 w-9"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.75}
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    </div>
  );
}

const inputSplit =
  "w-full rounded-lg border border-zinc-300/95 bg-white py-3 pl-4 pr-4 text-[15px] text-zinc-900 shadow-[0_1px_2px_rgba(24,24,27,0.06)] outline-none transition placeholder:text-zinc-500 focus:border-[#b29743] focus:ring-2 focus:ring-[#b29743]/25";

export function ForgotPasswordScreen({ variant = "standalone" }: Props) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Please enter your email or username.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { email: resolvedEmail, error: resolveError } = await resolveIdentifierToEmail(supabase, trimmed);
    if (resolveError) {
      setLoading(false);
      setError(resolveError);
      return;
    }
    if (!resolvedEmail) {
      setLoading(false);
      setError("Could not resolve that email or username.");
      return;
    }

    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(resolvedEmail, {
      redirectTo: `${origin}/auth/reset-password`,
    });
    setLoading(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setMessage(
      "Check your email for a link to reset your password. If it doesn’t appear in a few minutes, check your spam folder."
    );
  }

  const form = (
    <form onSubmit={handleSubmit} className={variant === "split" ? "mt-6 space-y-4 sm:mt-8" : "mt-6 space-y-4"}>
      <div>
        <label
          htmlFor="forgot-email"
          className={
            variant === "split"
              ? "login-split-field-label mb-1.5 block text-sm font-medium"
              : "text-foreground mb-1.5 block text-sm font-medium"
          }
        >
          Email or username
        </label>
        <input
          id="forgot-email"
          name="email"
          type="text"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className={
            variant === "split"
              ? inputSplit
              : "border-border bg-card text-foreground focus:border-primary focus:ring-primary w-full rounded-xl border px-4 py-3 text-[15px] outline-none ring-2 ring-transparent transition placeholder:text-zinc-400 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-800/90 dark:placeholder:text-zinc-500"
          }
          placeholder="you@example.com or username"
        />
      </div>

      {error && (
        <p
          className={
            variant === "split"
              ? "rounded-xl border border-red-200/80 bg-red-50 px-3 py-2.5 text-left text-sm text-red-900"
              : "rounded-xl border border-red-200/80 bg-red-50 px-3 py-2.5 text-center text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
          }
          role="alert"
        >
          {error}
        </p>
      )}

      {message && (
        <p
          className={
            variant === "split"
              ? "rounded-xl border border-emerald-200/80 bg-emerald-50 px-3 py-2.5 text-left text-sm text-emerald-900"
              : "rounded-xl border border-emerald-200/80 bg-emerald-50 px-3 py-2.5 text-center text-sm text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300"
          }
        >
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className={
          variant === "split"
            ? "auth-login-cta min-h-[48px] w-full cursor-pointer touch-manipulation rounded-xl px-4 py-3.5 text-[15px] font-bold text-white transition-[filter,opacity] hover:brightness-105 disabled:cursor-wait disabled:opacity-60 sm:min-h-0"
            : "bg-primary text-primary-foreground hover:bg-primary-hover w-full rounded-2xl px-4 py-3.5 text-[15px] font-medium shadow-sm transition disabled:opacity-60"
        }
      >
        {loading ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );

  if (variant === "split") {
    return (
      <>
        <h2 className="login-split-form-title font-login-serif text-left text-2xl font-semibold tracking-tight sm:text-3xl">
          Forgot password
        </h2>
        <p className="login-split-form-subtitle mt-2 text-left text-[14px] leading-snug sm:text-[15px]">
          Enter your email or username and we&apos;ll send a reset link to your inbox.
        </p>
        {form}
        <p className="login-split-form-footer mt-6 text-left text-sm">
          <Link href="/login" className="login-split-gold-link">
            Back to sign in
          </Link>
        </p>
      </>
    );
  }

  return (
    <div className="bg-auth-canvas relative flex min-h-screen flex-col font-sans transition-colors">
      <div className="absolute right-4 top-4 z-20">
        <div className="border-border bg-card/90 rounded-xl border shadow-sm backdrop-blur">
          <ThemeToggle />
        </div>
      </div>
      <div className="bg-primary relative flex min-h-[38vh] shrink-0 flex-col items-center justify-center overflow-hidden px-6 pb-24 pt-10">
        <div
          className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-black/15"
          aria-hidden
        />
        <div className="relative z-10 flex flex-col items-center text-center">
          <LogoMark />
          <h1 className="mt-5 text-2xl font-bold tracking-tight text-white">Invoice Manager</h1>
        </div>
      </div>

      <div className="relative z-10 -mt-20 flex flex-1 flex-col px-4 pb-10">
        <div className="border-border bg-card mx-auto w-full max-w-md rounded-3xl border px-6 py-8 shadow-[0_12px_40px_-12px_var(--auth-card-shadow)]">
          <h2 className="text-foreground text-center text-xl font-bold">Forgot password</h2>
          <p className="text-muted-foreground mt-2 text-center text-[15px]">
            Enter your email or username and we&apos;ll send a reset link to your email.
          </p>
          <div className="border-border mx-auto mt-5 max-w-[280px] border-t" />
          {form}
          <p className="text-muted-foreground mt-6 text-center text-[15px]">
            <Link href="/login" className="text-auth-link font-semibold transition hover:opacity-90">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
