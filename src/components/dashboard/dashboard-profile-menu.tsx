"use client";

import { clearAllWorkspaceUiSessions } from "@/lib/workspace-ui-session";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Props = {
  displayName: string;
  avatarInitial: string;
  avatarUrl?: string;
  /** Menu opens above the trigger (sidebar) or below (mobile header). */
  menuPlacement: "above" | "below";
  /** Sidebar: avatar + name row. Header: circular avatar only. */
  variant: "card" | "icon";
};

function LogOutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M18 9l3 3m0 0l-3 3m3-3H9" />
    </svg>
  );
}

function UserPenIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
    </svg>
  );
}

export function DashboardProfileMenu({ displayName, avatarInitial, avatarUrl, menuPlacement, variant }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  async function handleLogout() {
    setLoggingOut(true);
    clearAllWorkspaceUiSessions();
    const supabase = createClient();
    await supabase.auth.signOut();
    setOpen(false);
    router.push("/login");
    router.refresh();
  }

  const menuPos =
    menuPlacement === "above"
      ? "bottom-full left-0 right-0 mb-2 origin-bottom"
      : "top-full right-0 mt-2 origin-top";

  const avatarCircle = (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10 text-sm font-bold text-white ring-1 ring-white/10">
      {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : avatarInitial}
    </div>
  );

  return (
    <div ref={wrapRef} className={`relative ${variant === "card" ? "w-full" : ""}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={
          variant === "card"
            ? "flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-white/[0.06]"
            : "flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-zinc-700 text-sm font-bold text-white ring-1 ring-white/10 transition hover:bg-zinc-600"
        }
        aria-label="Account menu"
      >
        {variant === "card" ? (
          <>
            {avatarCircle}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-semibold text-white">{displayName}</p>
              <p className="truncate text-xs text-white/45">Account</p>
            </div>
            <svg
              className={`h-4 w-4 shrink-0 text-white/40 transition ${open ? "-rotate-180" : ""}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
            </svg>
          </>
        ) : avatarUrl ? (
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          avatarInitial
        )}
      </button>

      {open ? (
        <div
          role="menu"
          aria-orientation="vertical"
          className={`absolute z-[60] min-w-[11.5rem] rounded-xl border border-white/[0.1] bg-[#16161a] py-1 shadow-[0_12px_40px_rgba(0,0,0,0.45)] ${menuPos}`}
        >
          <Link
            href="/profile"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2.5 text-[14px] font-medium text-zinc-200 transition hover:bg-white/[0.06] hover:text-white"
          >
            <UserPenIcon className="shrink-0 text-zinc-500" />
            Edit profile
          </Link>
          <button
            type="button"
            role="menuitem"
            disabled={loggingOut}
            onClick={() => void handleLogout()}
            className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[14px] font-medium text-rose-200/95 transition hover:bg-rose-500/15 disabled:opacity-60"
          >
            <LogOutIcon className="shrink-0 text-rose-400/80" />
            {loggingOut ? "Signing out…" : "Log out"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
