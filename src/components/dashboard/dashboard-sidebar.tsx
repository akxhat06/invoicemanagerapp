"use client";

import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/theme-toggle";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type NavKey = "overview" | "companies" | "retailers" | "transport" | "payments" | "returns" | "commission";

type Props = {
  open: boolean;
  onClose: () => void;
  displayName: string;
  email: string;
  avatarInitial: string;
  avatarUrl?: string;
  pathname: string;
};

function IconOverview({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="11" width="7" height="10" rx="1" />
      <rect x="3" y="15" width="7" height="6" rx="1" />
    </svg>
  );
}

function IconCompanies({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 22V4a2 2 0 012-2h8a2 2 0 012 2v18" />
      <path d="M6 12h12" />
      <path d="M6 16h12" />
      <path d="M6 8h12" />
      <path d="M10 6h4" />
    </svg>
  );
}

function IconRetailers({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 21h18" />
      <path d="M5 21V8l7-4 7 4v13" />
      <path d="M9 21v-6h6v6" />
    </svg>
  );
}

function IconPayments({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 7h18M3 12h18M3 17h18" />
      <circle cx="7" cy="7" r="1" fill="currentColor" stroke="none" />
      <circle cx="7" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="7" cy="17" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconTransport({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="1.5" y="6" width="14" height="10" rx="2" />
      <path d="M15.5 9h3l2.5 2.5V16h-5.5" />
      <circle cx="6" cy="17.5" r="1.5" />
      <circle cx="17.5" cy="17.5" r="1.5" />
    </svg>
  );
}

function IconReturns({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 7h14a4 4 0 110 8H9" />
      <path d="M9 11l-4 4 4 4" />
    </svg>
  );
}

function IconCommission({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="8" />
      <path d="M10 9.5c0-1 1-1.8 2.2-1.8 1.1 0 2 .6 2 1.6 0 1.2-1 1.5-2.2 1.8-1.2.3-2.2.7-2.2 1.9 0 1.1 1 1.8 2.3 1.8 1.2 0 2.2-.7 2.2-1.8" />
    </svg>
  );
}

function LogOutIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M18 9l3 3m0 0l-3 3m3-3H9"
      />
    </svg>
  );
}

function isNavActive(pathname: string, key: NavKey): boolean {
  if (key === "overview") {
    return pathname === "/" || pathname === "";
  }
  if (key === "companies") {
    return pathname.startsWith("/companies");
  }
  if (key === "retailers") {
    return pathname.startsWith("/retailers");
  }
  if (key === "transport") {
    return pathname.startsWith("/transport");
  }
  if (key === "payments") {
    return pathname.startsWith("/payments");
  }
  if (key === "returns") {
    return pathname.startsWith("/returns");
  }
  return pathname.startsWith("/commission");
}

const NAV_CONFIG: {
  key: NavKey;
  label: string;
  href: string;
  Icon: typeof IconOverview;
  accent: string;
  iconBg: string;
}[] = [
  {
    key: "overview",
    label: "Overview",
    href: "/",
    Icon: IconOverview,
    accent: "text-sky-600 dark:text-sky-400",
    iconBg: "bg-sky-100 dark:bg-sky-500/15",
  },
  {
    key: "companies",
    label: "Companies",
    href: "/companies",
    Icon: IconCompanies,
    accent: "text-emerald-600 dark:text-emerald-400",
    iconBg: "bg-emerald-100 dark:bg-emerald-500/15",
  },
  {
    key: "retailers",
    label: "Retailer",
    href: "/retailers",
    Icon: IconRetailers,
    accent: "text-orange-600 dark:text-orange-400",
    iconBg: "bg-orange-100 dark:bg-orange-500/15",
  },
  {
    key: "payments",
    label: "Payments",
    href: "/payments",
    Icon: IconPayments,
    accent: "text-indigo-600 dark:text-indigo-400",
    iconBg: "bg-indigo-100 dark:bg-indigo-500/15",
  },
  {
    key: "transport",
    label: "Transport",
    href: "/transport",
    Icon: IconTransport,
    accent: "text-cyan-600 dark:text-cyan-400",
    iconBg: "bg-cyan-100 dark:bg-cyan-500/15",
  },
  {
    key: "returns",
    label: "Returns",
    href: "/returns",
    Icon: IconReturns,
    accent: "text-rose-600 dark:text-rose-400",
    iconBg: "bg-rose-100 dark:bg-rose-500/15",
  },
  {
    key: "commission",
    label: "Commission",
    href: "/commission",
    Icon: IconCommission,
    accent: "text-violet-600 dark:text-violet-400",
    iconBg: "bg-violet-100 dark:bg-violet-500/15",
  },
];

export function DashboardSidebar({
  open,
  onClose,
  displayName,
  email,
  avatarInitial,
  avatarUrl,
  pathname,
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
    <>
      <button
        type="button"
        aria-label="Close menu"
        className={`fixed inset-0 z-[80] bg-black/40 transition-opacity duration-200 dark:bg-black/60 ${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />

      <aside
        className={`border-border bg-background fixed inset-y-0 left-0 z-[90] flex w-[min(100%,18rem)] flex-col border-r shadow-2xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-hidden={!open}
      >
        {/* Profile */}
        <div className="border-border bg-card relative shrink-0 border-b px-4 pb-4 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-2.5 top-2.5 rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-200/80 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="flex items-start gap-3 pr-9">
            <div className="bg-accent text-accent-foreground flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-bold shadow-sm ring-2 ring-black/5 dark:ring-white/10">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                avatarInitial
              )}
            </div>
            <div className="min-w-0 pt-0.5">
              <p className="truncate text-[15px] font-semibold leading-tight text-zinc-900 dark:text-white">
                {displayName}
              </p>
              <p className="mt-0.5 truncate text-[13px] leading-tight text-zinc-500 dark:text-zinc-400">{email}</p>
            </div>
          </div>
        </div>

        {/* Nav + footer: flex-1 column; nav is only as tall as links; mt-auto pins logout to the bottom */}
        <div className="flex min-h-0 flex-1 flex-col">
          <nav className="px-3 pb-2 pt-3">
            <ul className="flex flex-col gap-0.5">
              {NAV_CONFIG.map(({ key, label, href, Icon, accent, iconBg }) => {
                const active = isNavActive(pathname, key);
                return (
                  <li key={key}>
                    <Link
                      href={href}
                      onClick={onClose}
                      className={`flex items-center gap-2.5 rounded-lg px-2 py-2 text-left text-[14px] font-medium transition-colors ${
                        active
                          ? "bg-muted text-foreground ring-1 ring-black/[0.06] dark:ring-white/10"
                          : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                      }`}
                    >
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${iconBg} ${accent}`}
                      >
                        <Icon />
                      </span>
                      <span className="min-w-0 flex-1 leading-snug">{label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="border-border mt-auto shrink-0 border-t px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
            <div className="mb-2">
              <div className="flex w-full items-center justify-between rounded-lg border border-border bg-card/60 px-3 py-2">
                <span className="text-sm font-medium text-muted-foreground">Theme</span>
                <ThemeToggle />
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-rose-200/90 bg-rose-50/80 px-3 py-2.5 text-[14px] font-semibold text-rose-600 transition hover:bg-rose-100/90 disabled:opacity-60 dark:border-rose-900/40 dark:bg-rose-950/35 dark:text-rose-400 dark:hover:bg-rose-950/55"
            >
              <LogOutIcon className="shrink-0" />
              {loggingOut ? "Logging out…" : "Log out"}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
