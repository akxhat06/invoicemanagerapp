"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  email: string;
};

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

export function SignedInPanel({ email }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function signOut() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
    setLoading(false);
  }

  return (
    <>
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-500/12 text-zinc-400">
        <CheckIcon />
      </div>
      <h2 className="login-split-form-title font-login-serif mt-6 text-left text-2xl font-semibold tracking-tight sm:text-3xl">
        You&apos;re signed in
      </h2>
      <p className="login-split-form-subtitle mt-2 text-left text-sm">Signed in as</p>
      <p className="login-split-form-emphasis mt-1 break-all text-left text-[15px] font-medium tabular-nums">
        {email || "Your account"}
      </p>
      <button
        type="button"
        onClick={() => void signOut()}
        disabled={loading}
        className="auth-login-cta mt-10 flex min-h-[48px] w-full cursor-pointer touch-manipulation items-center justify-center rounded-xl px-4 py-3.5 text-[15px] font-bold text-white transition-[filter,opacity] hover:brightness-105 disabled:cursor-wait disabled:opacity-75 sm:min-h-0"
      >
        {loading ? "Signing out…" : "Sign out"}
      </button>
    </>
  );
}
