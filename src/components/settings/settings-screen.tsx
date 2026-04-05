"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
    </svg>
  );
}

function UserCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <circle cx="12" cy="8" r="4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 20a8 8 0 0116 0" />
    </svg>
  );
}

function LogOutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M18 9l3 3m0 0l-3 3m3-3H9" />
    </svg>
  );
}

export function SettingsScreen() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const rowIcon = "text-zinc-400 shrink-0";
  const card =
    "overflow-hidden rounded-2xl border border-zinc-700/60 bg-[#2a2d36] shadow-sm dark:border-zinc-600/50 dark:bg-[#22252b]";

  return (
    <div className="mx-auto w-full max-w-lg pb-4">
      <h1 className="sr-only">Settings</h1>

      <nav className={card} aria-label="Settings">
        <Link
          href="/profile"
          className="flex min-h-[54px] items-center gap-3 border-b border-white/[0.08] px-4 py-3.5 text-[15px] font-medium text-white transition hover:bg-white/[0.04] active:bg-white/[0.06]"
        >
          <span className={`flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.08] ${rowIcon}`}>
            <UserCircleIcon />
          </span>
          <span className="min-w-0 flex-1">Edit profile</span>
          <ChevronRightIcon className="shrink-0 text-zinc-500" />
        </Link>

        <button
          type="button"
          onClick={() => void handleLogout()}
          disabled={loggingOut}
          className="flex min-h-[54px] w-full items-center gap-3 px-4 py-3.5 text-left text-[15px] font-medium text-rose-200 transition hover:bg-rose-500/10 active:bg-rose-500/[0.14] disabled:opacity-50"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-rose-400/25 bg-rose-500/10 text-rose-200" aria-hidden>
            <LogOutIcon />
          </span>
          <span>{loggingOut ? "Signing out…" : "Log out"}</span>
        </button>
      </nav>
    </div>
  );
}
