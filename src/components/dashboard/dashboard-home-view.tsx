import { formatDisplayName } from "@/lib/display-name";
import Link from "next/link";

function BuildingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 9h.01M9 13h.01M9 17h.01M15 14h.01M15 18h.01" strokeLinecap="round" />
    </svg>
  );
}

function PersonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DocIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export type DashboardHomeViewProps = {
  username: string | undefined;
  email: string;
  companyCount: number;
  activeCompaniesCount: number;
  retailerCount: number;
  retailersNew30d: number;
  invoiceCount: number;
  invoicesThisMonth: number;
  invoiceMonthTrendPct: number | null;
};

export function DashboardHomeView({
  username,
  email,
  companyCount,
  activeCompaniesCount,
  retailerCount,
  retailersNew30d,
  invoiceCount,
  invoicesThisMonth,
  invoiceMonthTrendPct,
}: DashboardHomeViewProps) {
  const displayName = formatDisplayName(username, email);

  const companyBadge =
    companyCount > 0 && activeCompaniesCount === companyCount
      ? "Active"
      : companyCount > 0
        ? `${activeCompaniesCount} active`
        : "—";

  const retailerBadge = retailersNew30d > 0 ? `+${retailersNew30d} new` : retailerCount > 0 ? "Profiles" : "—";

  return (
    <div className="text-zinc-100">
      <header className="mb-6 border-b border-zinc-800/80 pb-5">
        <p className="text-xs text-zinc-500">Welcome back</p>
        <p className="mt-1 text-lg font-bold tracking-tight text-white">{displayName}</p>
        <h1 className="mt-4 font-login-serif text-xl font-semibold tracking-tight text-white sm:text-2xl">Dashboard</h1>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-zinc-500">
          Tap a card to open that section. Counts include everything you have access to.
        </p>
      </header>

      <div className="mt-4 space-y-2">
        {/* Companies + Retailers — top row */}
        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/companies"
            className="group flex flex-col rounded-xl border border-emerald-900/50 bg-gradient-to-br from-emerald-950/50 to-zinc-950/90 p-2.5 shadow-sm ring-1 ring-emerald-500/10 transition hover:border-emerald-500/35 hover:ring-emerald-500/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500/50"
          >
            <div className="flex items-start justify-between gap-1.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-950/80 text-emerald-400 ring-1 ring-emerald-500/20">
                <BuildingIcon className="h-4 w-4" />
              </div>
              <span className="max-w-[4.5rem] truncate rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-300">
                {companyBadge}
              </span>
            </div>
            <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.12em] text-zinc-500">Companies</p>
            <p className="mt-0.5 text-2xl font-bold tabular-nums leading-none text-white">{companyCount}</p>
          </Link>

          <Link
            href="/retailers"
            className="group flex flex-col rounded-xl border border-violet-900/50 bg-gradient-to-br from-violet-950/45 to-zinc-950/90 p-2.5 shadow-sm ring-1 ring-violet-500/10 transition hover:border-violet-500/35 hover:ring-violet-500/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500/50"
          >
            <div className="flex items-start justify-between gap-1.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-950/80 text-violet-300 ring-1 ring-violet-500/20">
                <PersonIcon className="h-4 w-4" />
              </div>
              <span className="max-w-[4.5rem] truncate rounded-full bg-violet-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-violet-200">
                {retailerBadge}
              </span>
            </div>
            <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.12em] text-zinc-500">Retailers</p>
            <p className="mt-0.5 text-2xl font-bold tabular-nums leading-none text-white">{retailerCount}</p>
          </Link>
        </div>

        {/* Invoices — full width */}
        <div className="overflow-hidden rounded-xl border border-amber-500/25 bg-gradient-to-br from-amber-950/40 via-zinc-950/80 to-zinc-950 shadow-sm ring-1 ring-amber-500/15">
          <Link
            href="/invoices"
            className="block p-3 transition hover:bg-white/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-amber-500/50"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-zinc-500">Invoices</p>
                <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-amber-200/90">
                  This month · {invoicesThisMonth}
                </span>
              </div>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/12 text-amber-300 ring-1 ring-amber-500/25">
                <DocIcon className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-end gap-1.5">
              <span className="text-3xl font-bold tabular-nums tracking-tight text-white">{invoiceCount}</span>
              {invoiceMonthTrendPct !== null && (
                <span className="mb-1 inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-400">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                    <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {invoiceMonthTrendPct >= 0 ? "+" : ""}
                  {invoiceMonthTrendPct}%
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-zinc-500">All recorded invoices</p>
          </Link>
          <Link
            href="/invoices"
            className="block border-t border-amber-500/15 bg-black/25 px-3 py-2.5 text-center text-xs font-bold text-white transition hover:bg-black/35"
          >
            + Add new invoice
          </Link>
        </div>
      </div>
    </div>
  );
}
