"use client";

import {
  DASHBOARD_NAV_ITEMS,
  isDashboardNavActive,
  type DashboardNavKey,
} from "@/components/dashboard/dashboard-nav-config";
import Link from "next/link";
import { useEffect, useState } from "react";

type Props = {
  pathname: string;
  invoiceBadgeCount?: number;
  onOpenChange?: (open: boolean) => void;
  hidden?: boolean;
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
      <path d="M6 12h12M6 16h12M6 8h12" />
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

function IconPayments({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20M6 15h.01M10 15h4" />
    </svg>
  );
}

function IconCreditNote({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6M9 14h6M9 18h4" />
      <path d="M8 11l-2 2 2 2" />
    </svg>
  );
}

function IconCommission({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="9" cy="9" r="3" />
      <circle cx="15" cy="15" r="3" />
      <path d="M5 19L19 5" />
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
  commission: IconCommission,
};

// Semi-circle positions: 7 items spread from 170° to 10° with radius 118px
const ARC_RADIUS = 118;
const ARC_START = 170;
const ARC_END = 10;
function arcPosition(index: number, total: number) {
  const angle = ARC_START - (index / (total - 1)) * (ARC_START - ARC_END);
  const rad = (angle * Math.PI) / 180;
  return {
    x: Math.round(ARC_RADIUS * Math.cos(rad)),
    y: Math.round(-ARC_RADIUS * Math.sin(rad)),
  };
}

export function DashboardMobileNav({ pathname, invoiceBadgeCount, onOpenChange, hidden }: Props) {
  const [open, setOpen] = useState(false);
  const total = DASHBOARD_NAV_ITEMS.length;

  function toggle(next: boolean) {
    setOpen(next);
    onOpenChange?.(next);
  }

  // Close on route change
  useEffect(() => { toggle(false); }, [pathname]);

  // Lock body scroll when open
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <div className={`md:hidden transition-opacity duration-200 ${hidden ? "pointer-events-none opacity-0" : "opacity-100"}`} data-tour="bottom-nav">
      {/* Backdrop */}
      {open && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-[45] bg-black/60 backdrop-blur-sm"
          onClick={() => toggle(false)}
        />
      )}

      {/* Arc nav items */}
      <nav aria-label="Primary" className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-1/2 z-[47] -translate-x-1/2">
        {DASHBOARD_NAV_ITEMS.map(({ key, label, href, showBadge }, i) => {
          const active = isDashboardNavActive(pathname, key);
          const Icon = ICONS[key];
          const badge = showBadge && typeof invoiceBadgeCount === "number" && invoiceBadgeCount > 0 ? invoiceBadgeCount : null;
          const { x, y } = arcPosition(i, total);
          const delay = open ? i * 35 : (total - 1 - i) * 25;

          return (
            <div
              key={key}
              className="absolute bottom-0 left-0"
              style={{
                transform: open ? `translate(calc(${x}px - 50%), calc(${y}px - 50%))` : `translate(-50%, -50%)`,
                opacity: open ? 1 : 0,
                pointerEvents: open ? "auto" : "none",
                transition: `transform 400ms cubic-bezier(0.34,1.56,0.64,1) ${delay}ms, opacity 250ms ease ${delay}ms`,
                willChange: "transform, opacity",
              }}
            >
              <Link
                href={href}
                onClick={() => toggle(false)}
                aria-current={active ? "page" : undefined}
                className="group relative flex flex-col items-center gap-1"
              >
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-2xl shadow-lg transition-transform active:scale-90 ${
                    active
                      ? "bg-violet-600 text-white ring-2 ring-violet-400/40 shadow-[0_0_16px_rgba(124,58,237,0.5)]"
                      : "bg-zinc-800/95 text-zinc-300 ring-1 ring-white/10"
                  }`}
                >
                  <Icon />
                  {badge !== null && (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-violet-500 px-1 text-[9px] font-bold text-white ring-1 ring-black">
                      {badge > 9 ? "9+" : badge}
                    </span>
                  )}
                </span>
                <span
                  className={`rounded-md px-1.5 py-0.5 text-[9px] font-semibold leading-none tracking-wide ${
                    active ? "bg-violet-600/20 text-violet-200" : "bg-zinc-900/80 text-zinc-400"
                  }`}
                  style={{ backdropFilter: "blur(4px)" }}
                >
                  {label}
                </span>
              </Link>
            </div>
          );
        })}
      </nav>

      {/* Center FAB trigger */}
      <div className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-1/2 z-[48] -translate-x-1/2">
        <button
          type="button"
          onClick={() => toggle(!open)}
          aria-label={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open}
          className={`flex h-12 w-12 items-center justify-center rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.5)] transition-all duration-300 ${
            open
              ? "bg-zinc-700 ring-1 ring-white/20 rotate-45"
              : "bg-[#1a1a2e] ring-1 ring-violet-500/30 shadow-[0_0_16px_rgba(124,58,237,0.35)]"
          }`}
          style={{ transition: "transform 300ms cubic-bezier(0.34,1.56,0.64,1), background-color 200ms, box-shadow 200ms" }}
        >
          {open ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          ) : (
            /* 3×3 dot grid */
            <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor" aria-hidden className="text-violet-200">
              <circle cx="3"  cy="3"  r="1.5" />
              <circle cx="9"  cy="3"  r="1.5" />
              <circle cx="15" cy="3"  r="1.5" />
              <circle cx="3"  cy="9"  r="1.5" />
              <circle cx="9"  cy="9"  r="1.5" />
              <circle cx="15" cy="9"  r="1.5" />
              <circle cx="3"  cy="15" r="1.5" />
              <circle cx="9"  cy="15" r="1.5" />
              <circle cx="15" cy="15" r="1.5" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
