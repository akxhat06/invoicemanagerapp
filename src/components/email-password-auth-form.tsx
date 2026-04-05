"use client";

import { resolveIdentifierToEmail } from "@/lib/auth/resolve-login-email";
import { createClient } from "@/lib/supabase/client";
import { skipRequiredFieldValidation } from "@/lib/dev-validation";
import { toastError } from "@/lib/toast";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

type Mode = "signin" | "signup";

type Props = {
  mode: Mode;
  /** Split-screen login: teal CTA, light form fields, optional “keep signed in”. */
  variant?: "default" | "split";
};

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  );
}

function MailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function ButtonSpinner() {
  return (
    <svg
      className="h-5 w-5 shrink-0 animate-spin text-white"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  );
}

const inputLight =
  "border-border bg-card text-foreground ring-primary/10 focus:border-primary/50 focus:ring-primary/15 dark:border-zinc-600/60 dark:bg-auth-input dark:text-zinc-100 dark:focus:border-amber-500/40 dark:focus:ring-amber-500/20";

const inputSplit =
  "rounded-lg border border-zinc-600/70 bg-zinc-900/90 text-zinc-100 shadow-inner ring-0 placeholder:text-zinc-500 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/25";

/** Full navigation: starts loading `/` immediately with cookies (faster than App Router soft nav after auth). */
function goToAppHome() {
  window.location.assign("/");
}

export function EmailPasswordAuthForm({ mode, variant = "split" }: Props) {
  const searchParams = useSearchParams();
  const passwordResetNotice = searchParams.get("message") === "password-reset";
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(true);

  const isSignIn = mode === "signin";
  const isSplit = variant === "split";
  /** Signup + split has more fields — tighter vertical rhythm so the column fits common desktop heights. */
  const compactSplitSignup = !isSignIn && isSplit;
  const relax = skipRequiredFieldValidation();
  const inputPadY = compactSplitSignup ? "py-2.5" : "py-3";
  const inputBase = `w-full rounded-lg border ${inputPadY} pl-11 pr-4 text-[15px] outline-none transition placeholder:text-zinc-400 focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60${isSplit ? "" : " dark:placeholder:text-zinc-500"}`;
  const inputWithToggle = `${inputBase} ${inputLight} pr-12`;
  const inputWithToggleSplit = `${inputBase} ${inputSplit} pr-12`;
  const fieldBase = isSplit ? inputSplit : inputLight;
  const fieldWithToggle = isSplit ? inputWithToggleSplit : inputWithToggle;
  const labelCls = isSplit
    ? compactSplitSignup
      ? "login-split-field-label mb-1 block text-sm font-medium"
      : "login-split-field-label mb-1.5 block text-sm font-medium"
    : "mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-200";
  const iconToggleCls = isSplit
    ? "absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-zinc-600 transition hover:bg-zinc-100/90 hover:text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500/35 disabled:pointer-events-none disabled:opacity-40"
    : "absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600/30 disabled:pointer-events-none disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-800/80 dark:hover:text-zinc-200 dark:focus-visible:ring-amber-500/25";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setErrorMessage(null);
    setLoading(true);

    let exitForFullNavigation = false;

    try {
      const supabase = createClient();

      if (isSignIn) {
        if (!relax) {
          if (!email.trim()) {
            setErrorMessage("Enter your email or username.");
            return;
          }
          if (!password) {
            setErrorMessage("Enter your password.");
            return;
          }
        } else if (!email.trim() || !password) {
          setErrorMessage("Enter your email or username and password.");
          return;
        }
        const { email: resolvedEmail, error: resolveError } = await resolveIdentifierToEmail(supabase, email);
        if (resolveError) {
          setErrorMessage(resolveError);
          return;
        }
        if (!resolvedEmail) {
          setErrorMessage("Enter your email or username.");
          return;
        }
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: resolvedEmail,
          password,
        });
        if (signInError) {
          setErrorMessage(signInError.message);
          return;
        }
        exitForFullNavigation = true;
        goToAppHome();
        return;
      }

      if (!relax) {
        if (!username.trim()) {
          toastError("Please enter a username.");
          return;
        }
        if (!email.trim()) {
          toastError("Please enter your email.");
          return;
        }
        if (password !== confirmPassword) {
          toastError("Passwords do not match.");
          return;
        }
        if (password.length < 6) {
          toastError("Password must be at least 6 characters.");
          return;
        }
      }

      const signUpEmail = relax ? email.trim() || "dev@example.local" : email.trim();
      const signUpUsername = relax ? username.trim() || "devuser" : username.trim();
      const signUpPassword = relax && password.length < 6 ? "devdevdev" : password;
      if (relax && password !== confirmPassword && confirmPassword.length > 0) {
        toastError("Passwords do not match.");
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: signUpEmail,
        password: signUpPassword,
        options: {
          data: {
            username: signUpUsername,
          },
        },
      });

      if (signUpError) {
        toastError(signUpError.message);
        return;
      }

      if (data.session) {
        exitForFullNavigation = true;
        goToAppHome();
        return;
      }

      setMessage(
        "Account created. If email confirmation is enabled, check your inbox before signing in."
      );
    } finally {
      if (!exitForFullNavigation) {
        setLoading(false);
      }
    }
  }

  const alertAlign = isSplit ? "text-left" : "text-center";

  return (
    <form
      onSubmit={handleSubmit}
      className={
        compactSplitSignup
          ? "mt-5 space-y-3 sm:mt-6 sm:space-y-3.5"
          : isSplit
            ? "mt-6 space-y-4 sm:mt-8 sm:space-y-5"
            : "mt-6 space-y-5"
      }
      aria-busy={loading}
    >
      {!isSignIn && (
        <div>
          <label htmlFor="username" className={labelCls}>
            Username
          </label>
          <div className="relative">
            <span
              className={
                isSplit
                  ? "pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"
                  : "pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500"
              }
            >
              <UserIcon />
            </span>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required={!isSignIn && !relax}
              disabled={loading}
              className={`${inputBase} ${fieldBase}`}
              placeholder="Enter your username"
            />
          </div>
        </div>
      )}

      <div>
        <label htmlFor="email" className={labelCls}>
          {isSignIn ? "Email or username" : "Email"}
        </label>
        <div className="relative">
          <span
            className={
              isSplit
                ? "pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"
                : "pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500"
            }
          >
            {isSignIn && isSplit ? <MailIcon /> : <UserIcon />}
          </span>
          <input
            id="email"
            name="email"
            type={isSignIn ? "text" : "email"}
            autoComplete={isSignIn ? "username" : "email"}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required={!relax}
            disabled={loading}
            className={`${inputBase} ${fieldBase}`}
            placeholder={
              isSignIn && isSplit ? "you@company.com or username" : isSignIn ? "Enter your email or username" : "Enter your email"
            }
          />
        </div>
      </div>

      <div>
        <div className={`flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 ${compactSplitSignup ? "mb-1" : "mb-1.5"}`}>
          <label htmlFor="password" className={labelCls + " mb-0"}>
            Password
          </label>
          {isSignIn && isSplit && (
            <Link href="/forgot-password" className="login-split-gold-link text-sm shrink-0">
              Forgot password?
            </Link>
          )}
        </div>
        <div className="relative">
          <span
            className={
              isSplit
                ? "pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"
                : "pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500"
            }
          >
            <LockIcon />
          </span>
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete={isSignIn ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required={!relax}
            minLength={relax ? undefined : 6}
            disabled={loading}
            className={fieldWithToggle}
            placeholder="Enter your password"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            disabled={loading}
            className={iconToggleCls}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
      </div>

      {!isSignIn && (
        <div>
          <label htmlFor="confirmPassword" className={labelCls}>
            Confirm password
          </label>
          <div className="relative">
            <span
              className={
                isSplit
                  ? "pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"
                  : "pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500"
              }
            >
              <LockIcon />
            </span>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required={!isSignIn && !relax}
              minLength={relax ? undefined : 6}
              disabled={loading}
              className={fieldWithToggle}
              placeholder="Enter your password again"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((v) => !v)}
              disabled={loading}
              className={iconToggleCls}
              aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
            >
              {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        </div>
      )}

      {isSignIn && isSplit && (
        <label className="login-split-form-check flex cursor-pointer items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            checked={keepSignedIn}
            onChange={(e) => setKeepSignedIn(e.target.checked)}
            className="rounded border-zinc-300 text-zinc-500 accent-zinc-500 focus:ring-zinc-500/35"
          />
          Keep me signed in
        </label>
      )}

      {passwordResetNotice && isSignIn && (
        <p
          className={
            isSplit
              ? `rounded-xl border border-emerald-200/80 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900 ${alertAlign}`
              : `rounded-xl border border-emerald-200/80 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300 ${alertAlign}`
          }
        >
          Your password was updated. Sign in with your new password.
        </p>
      )}

      {errorMessage && (
        <p
          className={
            isSplit
              ? `rounded-xl border border-red-200/80 bg-red-50 px-3 py-2.5 text-sm text-red-900 ${alertAlign}`
              : `rounded-xl border border-red-200/80 bg-red-50 px-3 py-2.5 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300 ${alertAlign}`
          }
        >
          {errorMessage}
        </p>
      )}

      {message && (
        <p
          className={
            isSplit
              ? `rounded-xl border border-emerald-200/80 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900 ${alertAlign}`
              : `rounded-xl border border-emerald-200/80 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300 ${alertAlign}`
          }
        >
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className={
          isSplit
            ? compactSplitSignup
              ? "auth-login-cta flex min-h-[44px] w-full cursor-pointer touch-manipulation items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[15px] font-bold text-white transition-[filter,opacity] hover:brightness-105 disabled:cursor-wait disabled:opacity-100 sm:min-h-0 md:py-3"
              : "auth-login-cta flex min-h-[48px] w-full cursor-pointer touch-manipulation items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-[15px] font-bold text-white transition-[filter,opacity] hover:brightness-105 disabled:cursor-wait disabled:opacity-100 sm:min-h-0"
            : "auth-login-cta flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-[15px] font-bold text-white transition-[filter,opacity] hover:brightness-105 disabled:cursor-wait disabled:opacity-100"
        }
      >
        {loading && <ButtonSpinner />}
        {loading
          ? isSignIn
            ? "Signing in…"
            : "Creating account…"
          : isSignIn
            ? "Sign in"
            : "Create account"}
      </button>
    </form>
  );
}
