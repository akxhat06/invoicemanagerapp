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

function IconPayments({ className }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
      <path d="M6 15h.01M10 15h4" />
    </svg>
  );
}

function IconCreditNote({ className }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6M9 14h6M9 18h4" />
      <path d="M8 11l-2 2 2 2" />
    </svg>
  );
}

const ICONS: Record<DashboardNavKey, typeof IconDashboard> = {
  dashboard: IconDashboard,
  companies: IconCompanies,
  retailers: IconRetailers,
  invoices: IconInvoices,
  payments: IconPayments,
  credit_notes: IconCreditNote,
};

export function DashboardMobileNav({ pathname, invoiceBadgeCount }: Props) {
  return (
    <nav
      className="dashboard-app-sidebar fixed bottom-0 left-0 right-0 z-40 border-t border-white/[0.08] bg-[#0a0a0c]/95 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur-md md:hidden"
      aria-label="Primary"
      data-tour="bottom-nav"
    >
      <ul className="flex items-end justify-around gap-0.5 px-1">
        {DASHBOARD_NAV_ITEMS.map(({ key, label, href, showBadge }) => {
          const active = isDashboardNavActive(pathname, key);
          const Icon = ICONS[key];
          const badge =
            showBadge && typeof invoiceBadgeCount === "number" && invoiceBadgeCount > 0 ? invoiceBadgeCount : null;
          return (
            <li key={key} className="flex min-w-0 flex-1 justify-center">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex w-full min-w-0 max-w-[5.25rem] flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-semibold leading-tight transition-colors ${
                  active
                    ? "bg-zinc-800/90 text-violet-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ring-1 ring-violet-500/25"
                    : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-400"
                }`}
              >
                <span className="relative flex h-8 w-8 items-center justify-center [&_svg]:stroke-current">
                  <Icon className={active ? "text-violet-200" : "text-zinc-500"} />
                  {badge !== null && (
                    <span
                      className={`absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold text-white ${
                        active ? "bg-violet-500" : "bg-zinc-600"
                      }`}
                    >
                      {badge > 9 ? "9+" : badge}
                    </span>
                  )}
                </span>
                <span className="max-w-full truncate px-0.5 text-center">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
