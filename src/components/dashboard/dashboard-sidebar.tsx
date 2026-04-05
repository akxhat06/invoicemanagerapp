"use client";

import { createClient } from "@/lib/supabase/client";
import {
  DASHBOARD_NAV_ITEMS,
  isDashboardNavActive,
  type DashboardNavKey,
} from "@/components/dashboard/dashboard-nav-config";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  displayName: string;
  avatarInitial: string;
  avatarUrl?: string;
  pathname: string;
  /** Optional count for the Invoices nav badge (omit to hide). */
  invoiceBadgeCount?: number;
};

function IconDashboard({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="11" width="7" height="10" rx="1" />
      <rect x="3" y="15" width="7" height="6" rx="1" />
    </svg>
  );
}

function IconCompanies({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 22V4a2 2 0 012-2h8a2 2 0 012 2v18" />
      <path d="M6 12h12M6 16h12M6 8h12M10 6h4" />
    </svg>
  );
}

function IconRetailers({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 21h18M5 21V8l7-4 7 4v13M9 21v-6h6v6" />
    </svg>
  );
}

function IconInvoices({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
    </svg>
  );
}

function IconSettings({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}

function LogOutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M18 9l3 3m0 0l-3 3m3-3H9" />
    </svg>
  );
}

const ICONS: Record<DashboardNavKey, typeof IconDashboard> = {
  dashboard: IconDashboard,
  companies: IconCompanies,
  retailers: IconRetailers,
  invoices: IconInvoices,
  settings: IconSettings,
};

const ACCENT = "#a1a1aa";

export function DashboardSidebar({
  displayName,
  avatarInitial,
  avatarUrl,
  pathname,
  invoiceBadgeCount,
}: Props) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside
      className="dashboard-app-sidebar hidden w-[260px] shrink-0 flex-col border-r border-white/[0.06] md:flex"
      aria-label="Main navigation"
    >
      <div className="flex shrink-0 justify-center px-5 pb-6 pt-6">
        <img
          src="/logo3-dark.svg"
          alt="Vishwa Shree Enterprises"
          width={400}
          height={400}
          decoding="async"
          className="h-auto w-full max-w-[200px] object-contain"
        />
      </div>

      <nav className="flex min-h-0 flex-1 flex-col px-3">
        <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-white/40">Navigation</p>
        <ul className="flex flex-col gap-0.5">
          {DASHBOARD_NAV_ITEMS.map(({ key, label, href, showBadge }) => {
            const active = isDashboardNavActive(pathname, key);
            const Icon = ICONS[key];
            const badge =
              showBadge && typeof invoiceBadgeCount === "number" && invoiceBadgeCount > 0 ? invoiceBadgeCount : null;
            return (
              <li key={key}>
                <Link
                  href={href}
                  className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 pl-3 text-[14px] font-medium transition-colors ${
                    active
                      ? "bg-white/[0.08] text-white"
                      : "text-white/65 hover:bg-white/[0.05] hover:text-white/90"
                  }`}
                >
                  {active && (
                    <span
                      className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full"
                      style={{ backgroundColor: ACCENT }}
                      aria-hidden
                    />
                  )}
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${active ? "text-white" : "text-white/55 group-hover:text-white/80"}`}>
                    <Icon />
                  </span>
                  <span className="min-w-0 flex-1 leading-snug">{label}</span>
                  {badge !== null && (
                    <span
                      className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-bold text-white"
                      style={{ backgroundColor: ACCENT }}
                    >
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-auto shrink-0 space-y-3 border-t border-white/[0.08] px-4 py-4">
        <Link
          href="/profile"
          className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-white/[0.06]"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10 text-sm font-bold text-white ring-1 ring-white/10">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              avatarInitial
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold text-white">{displayName}</p>
            <p className="truncate text-xs text-white/45">Admin</p>
          </div>
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-rose-400/25 bg-rose-500/10 px-3 py-2.5 text-[13px] font-semibold text-rose-200 transition hover:bg-rose-500/20 disabled:opacity-60"
        >
          <LogOutIcon className="shrink-0" />
          {loggingOut ? "Signing out…" : "Log out"}
        </button>
      </div>
    </aside>
  );
}
