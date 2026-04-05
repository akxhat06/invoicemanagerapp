"use client";

import {
  DASHBOARD_NAV_ITEMS,
  isDashboardNavActive,
  type DashboardNavKey,
} from "@/components/dashboard/dashboard-nav-config";
import Link from "next/link";

type Props = {
  pathname: string;
  invoiceBadgeCount?: number;
};

function IconDashboard({ className }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="11" width="7" height="10" rx="1" />
      <rect x="3" y="15" width="7" height="6" rx="1" />
    </svg>
  );
}

function IconCompanies({ className }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 22V4a2 2 0 012-2h8a2 2 0 012 2v18" />
      <path d="M6 12h12M6 16h12M6 8h12M10 6h4" />
    </svg>
  );
}

function IconRetailers({ className }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 21h18M5 21V8l7-4 7 4v13M9 21v-6h6v6" />
    </svg>
  );
}

function IconInvoices({ className }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
    </svg>
  );
}

function IconSettings({ className }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
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

const ACCENT = "#a40e4c";

export function DashboardMobileNav({ pathname, invoiceBadgeCount }: Props) {
  return (
    <nav
      className="dashboard-app-sidebar fixed bottom-0 left-0 right-0 z-40 border-t border-white/[0.08] pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 md:hidden"
      aria-label="Primary"
      data-tour="bottom-nav"
    >
      <ul className="flex items-stretch justify-around px-1">
        {DASHBOARD_NAV_ITEMS.map(({ key, label, href, showBadge }) => {
          const active = isDashboardNavActive(pathname, key);
          const Icon = ICONS[key];
          const badge =
            showBadge && typeof invoiceBadgeCount === "number" && invoiceBadgeCount > 0 ? invoiceBadgeCount : null;
          return (
            <li key={key} className="flex min-w-0 flex-1 justify-center">
              <Link
                href={href}
                className={`flex w-full max-w-[4.5rem] flex-col items-center gap-0.5 py-2 text-[10px] font-semibold leading-tight transition-colors ${
                  active ? "" : "text-white/50"
                }`}
                style={active ? { color: ACCENT } : undefined}
              >
                <span className="relative flex h-8 w-8 items-center justify-center">
                  <Icon className={active ? "" : "opacity-90"} />
                  {badge !== null && (
                    <span
                      className="absolute -right-1 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold text-white"
                      style={{ backgroundColor: ACCENT }}
                    >
                      {badge > 9 ? "9+" : badge}
                    </span>
                  )}
                </span>
                <span className="max-w-full truncate px-0.5 text-center">{label}</span>
                <span
                  className="mt-0.5 h-1 w-1 rounded-full transition-opacity"
                  style={{ backgroundColor: ACCENT, opacity: active ? 1 : 0 }}
                  aria-hidden
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
