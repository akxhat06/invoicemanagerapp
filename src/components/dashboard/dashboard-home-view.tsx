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

function formatInr(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(
    Number.isFinite(n) ? n : 0
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

function RupeeStackIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M6 3h12M6 9h12M6 15h8" strokeLinecap="round" />
      <path d="M14 15l4 4m0-4l-4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function WalletIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M20 12V8H6a2 2 0 010-4h14V4a2 2 0 00-2-2H5a2 2 0 00-2 2v16a2 2 0 002 2h13a2 2 0 002-2v-4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 12h4v4h-4a2 2 0 010-4z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PercentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <circle cx="9" cy="9" r="2" strokeLinecap="round" />
      <circle cx="15" cy="15" r="2" strokeLinecap="round" />
      <path d="M7 17L17 7" strokeLinecap="round" />
    </svg>
  );
}

export type DashboardHomeViewProps = {
  username: string | undefined;
  email: string;
  companyCount: number;
  companiesTotalBilled: number;
  totalPaymentReceived: number;
  activeCompaniesCount: number;
  retailerCount: number;
  retailersNew30d: number;
  invoiceCount: number;
  invoicesThisMonth: number;
  invoiceMonthTrendPct: number | null;
  commissionCount: number;
  totalCommissionAmount: number;
};

export function DashboardHomeView({
  username,
  email,
  companyCount,
  companiesTotalBilled,
  totalPaymentReceived,
  activeCompaniesCount,
  retailerCount,
  retailersNew30d,
  invoiceCount,
  invoicesThisMonth,
  invoiceMonthTrendPct,
  commissionCount,
  totalCommissionAmount,
}: DashboardHomeViewProps) {
  const displayName = formatDisplayName(username, email);

  const companyBadge =
    companyCount > 0 && activeCompaniesCount === companyCount
      ? "Active"
      : companyCount > 0
        ? `${activeCompaniesCount} active`
        : "—";

  const retailerChip = retailerCount > 0 ? "Profiles" : "—";

  return (
    <div className="text-zinc-100">
      <header className="mb-5">
        <p className="text-xs font-medium text-zinc-500">Welcome back</p>
        <h1 className="mt-1 flex items-center gap-2 truncate font-login-serif text-2xl font-semibold tracking-tight text-white sm:text-[1.6rem]">
          <span className="truncate">{displayName}</span>
          <span className="inline-block origin-[70%_70%] animate-[dashboard-wave_1.8s_ease-in-out_infinite] text-xl leading-none" aria-hidden>
            👋
          </span>
        </h1>
        <p className="mt-1 max-w-sm text-sm text-zinc-500">Open a section below to work with your data.</p>
      </header>

      <div className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Overview</p>

        {/* ── 5 stat cards ── */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">

          {/* Companies */}
          <Link href="/companies" className="group flex flex-col gap-3 rounded-2xl border border-zinc-800/80 bg-zinc-950/80 p-3 ring-1 ring-white/[0.04] transition hover:border-emerald-500/30 hover:bg-emerald-950/20 hover:ring-emerald-500/10">
            <div className="flex items-center justify-between">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20">
                <BuildingIcon className="h-4 w-4" />
              </div>
              <span className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-300/90">
                {companyBadge}
              </span>
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums leading-none tracking-tight text-white">{companyCount}</p>
              <p className="mt-1 text-[10px] font-medium text-zinc-500">Companies</p>
            </div>
          </Link>

          {/* Retailers */}
          <Link href="/retailers" className="group flex flex-col gap-3 rounded-2xl border border-zinc-800/80 bg-zinc-950/80 p-3 ring-1 ring-white/[0.04] transition hover:border-violet-500/30 hover:bg-violet-950/20 hover:ring-violet-500/10">
            <div className="flex items-center justify-between">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300 ring-1 ring-violet-500/20">
                <PersonIcon className="h-4 w-4" />
              </div>
              {retailersNew30d > 0 && (
                <span className="rounded-md bg-violet-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-violet-200/90">
                  +{retailersNew30d} new
                </span>
              )}
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums leading-none tracking-tight text-white">{retailerCount}</p>
              <p className="mt-1 text-[10px] font-medium text-zinc-500">Retailers</p>
            </div>
          </Link>

          {/* Invoices */}
          <Link href="/invoices" className="group flex flex-col gap-3 rounded-2xl border border-zinc-800/80 bg-zinc-950/80 p-3 ring-1 ring-white/[0.04] transition hover:border-amber-500/30 hover:bg-amber-950/20 hover:ring-amber-500/10">
            <div className="flex items-center justify-between">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/20">
                <DocIcon className="h-4 w-4" />
              </div>
              <span className="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-amber-200/90">
                {invoicesThisMonth} this mo.
              </span>
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums leading-none tracking-tight text-white">{invoiceCount}</p>
              <p className="mt-1 text-[10px] font-medium text-zinc-500">Invoices</p>
            </div>
          </Link>

          {/* Payments */}
          <Link href="/payments" className="group flex flex-col gap-3 rounded-2xl border border-zinc-800/80 bg-zinc-950/80 p-3 ring-1 ring-white/[0.04] transition hover:border-teal-500/30 hover:bg-teal-950/20 hover:ring-teal-500/10">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-500/10 text-teal-300 ring-1 ring-teal-500/20">
              <WalletIcon className="h-4 w-4" />
            </div>
            <div>
              <p className="break-words text-base font-bold tabular-nums leading-snug tracking-tight text-teal-100 sm:text-lg">
                {formatInr(Math.round(totalPaymentReceived))}
              </p>
              <p className="mt-1 text-[10px] font-medium text-zinc-500">Total Payments</p>
            </div>
          </Link>

          {/* Commissions */}
          <Link href="/commission" className="group flex flex-col gap-3 rounded-2xl border border-zinc-800/80 bg-zinc-950/80 p-3 ring-1 ring-white/[0.04] transition hover:border-pink-500/30 hover:bg-pink-950/20 hover:ring-pink-500/10">
            <div className="flex items-center justify-between">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-pink-500/10 text-pink-300 ring-1 ring-pink-500/20">
                <PercentIcon className="h-4 w-4" />
              </div>
              {commissionCount > 0 && (
                <span className="rounded-md bg-pink-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-pink-200/90">
                  {commissionCount} records
                </span>
              )}
            </div>
            <div>
              <p className="break-words text-base font-bold tabular-nums leading-snug tracking-tight text-pink-100 sm:text-lg">
                {formatInr(Math.round(totalCommissionAmount))}
              </p>
              <p className="mt-1 text-[10px] font-medium text-zinc-500">Total Commission</p>
            </div>
          </Link>
        </div>

        {/* ── Billed + Invoice widget ── */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {/* Total billed */}
          <div className="flex items-center gap-3 rounded-2xl border border-zinc-800/80 bg-zinc-950/80 p-3.5 ring-1 ring-white/[0.04]">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/20">
              <RupeeStackIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Total Billed</p>
              <p className="mt-0.5 break-words text-lg font-bold tabular-nums leading-snug tracking-tight text-amber-100">
                {formatInr(Math.round(companiesTotalBilled))}
              </p>
              <p className="text-[10px] text-zinc-600">Non-draft invoices</p>
            </div>
          </div>

          {/* Add invoice CTA */}
          <div className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950/80 ring-1 ring-white/[0.04]">
            <Link
              href="/invoices"
              className="flex items-center justify-between gap-3 p-3.5 transition hover:bg-white/[0.03]"
            >
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Invoices</p>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="text-2xl font-bold tabular-nums tracking-tight text-white">{invoiceCount}</span>
                  {invoiceMonthTrendPct !== null && (
                    <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ${invoiceMonthTrendPct >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                        {invoiceMonthTrendPct >= 0
                          ? <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
                          : <path d="M12 5v14M5 12l7 7 7-7" strokeLinecap="round" strokeLinejoin="round" />}
                      </svg>
                      {invoiceMonthTrendPct >= 0 ? "+" : ""}{invoiceMonthTrendPct}%
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-zinc-600">This month · {invoicesThisMonth}</p>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/20">
                <DocIcon className="h-5 w-5" />
              </div>
            </Link>
            <Link
              href="/invoices"
              className="block border-t border-white/[0.06] bg-black/20 px-3 py-2 text-center text-xs font-semibold text-white transition hover:bg-black/30"
            >
              + Add new invoice
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
