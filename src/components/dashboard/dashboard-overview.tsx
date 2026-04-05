"use client";

import { firstName, formatDisplayName } from "@/lib/display-name";
import type { BillingGrandTotals, BillingSummaryLine } from "@/lib/billing-summary";
import Link from "next/link";
import { useMemo, useState } from "react";

function formatInr(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);
}

type Props = {
  username: string | undefined;
  email: string;
  companyCount: number;
  /** Retailer profiles you have created */
  retailerCount: number;
  transportCount: number;
  paymentCount: number;
  returnCount: number;
  commissionCount: number;
  billingByCompany: BillingSummaryLine[];
  billingByRetailer: BillingSummaryLine[];
  billingGrand: BillingGrandTotals;
};

function BillingLineCard({ line }: { line: BillingSummaryLine }) {
  return (
    <article className="border-border bg-card rounded-xl border px-3.5 py-3 shadow-[0_2px_10px_-3px_rgba(15,23,42,0.12)]">
      <p className="text-card-foreground truncate text-sm font-semibold leading-snug">{line.name}</p>
      <p className="text-muted-foreground mt-2 text-[11px] font-medium uppercase tracking-wider">Invoices</p>
      <p className="text-card-foreground mt-0.5 tabular-nums text-lg font-bold">{line.invoiceCount}</p>
      <dl className="mt-3 grid grid-cols-1 gap-2 text-xs">
        <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-2">
          <dt className="text-muted-foreground">Total billed</dt>
          <dd className="font-semibold tabular-nums text-zinc-900 dark:text-white">{formatInr(line.totalBilled)}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-muted-foreground">Paid</dt>
          <dd className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">{formatInr(line.totalPaid)}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-muted-foreground">Outstanding</dt>
          <dd className="font-semibold tabular-nums text-amber-700 dark:text-amber-400">{formatInr(line.totalOutstanding)}</dd>
        </div>
      </dl>
    </article>
  );
}

export function DashboardOverview({
  username,
  email,
  companyCount,
  retailerCount,
  transportCount,
  paymentCount,
  returnCount,
  commissionCount,
  billingByCompany,
  billingByRetailer,
  billingGrand,
}: Props) {
  const [exporting, setExporting] = useState(false);
  const displayName = useMemo(
    () => formatDisplayName(username, email),
    [username, email]
  );
  const greet = firstName(displayName);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  const cards = [
    { label: "Companies", value: companyCount, hint: "Businesses", tone: "bg-sky-500/10 text-sky-500" },
    { label: "Retailers", value: retailerCount, hint: "Profiles", tone: "bg-amber-500/10 text-amber-500" },
    { label: "Transport", value: transportCount, hint: "Entries", tone: "bg-cyan-500/10 text-cyan-500" },
    { label: "Payments", value: paymentCount, hint: "Received", tone: "bg-emerald-500/10 text-emerald-500" },
    { label: "Returns", value: returnCount, hint: "Goods return", tone: "bg-rose-500/10 text-rose-500" },
    { label: "Commission", value: commissionCount, hint: "Entries", tone: "bg-violet-500/10 text-violet-500" },
  ];

  async function downloadOverviewExcel() {
    if (exporting) return;
    setExporting(true);
    try {
      const res = await fetch("/api/overview-export", { method: "GET" });
      if (!res.ok) {
        throw new Error("Failed to export");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `overview-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <section className="bg-surface-brand relative overflow-hidden rounded-2xl p-6 shadow-[0_12px_40px_-12px_rgba(15,40,71,0.45)] ring-1 ring-black/10 dark:ring-white/10">
        <div
          className="pointer-events-none absolute -right-6 -top-10 h-36 w-36 rounded-full bg-accent/25 blur-2xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-8 left-1/3 h-28 w-52 rounded-full bg-primary/35 blur-3xl"
          aria-hidden
        />
        <div className="relative flex items-start gap-4">
          <div
            className="bg-accent w-1.5 shrink-0 self-stretch rounded-full shadow-[0_0_24px_rgba(224,192,104,0.45)]"
            style={{ minHeight: "4.75rem" }}
          />
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold leading-snug tracking-tight text-white sm:text-xl">
              {greeting}, {greet}!
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-white/75">
              Here&apos;s your overview for today
            </p>
          </div>
          <button
            type="button"
            onClick={() => void downloadOverviewExcel()}
            disabled={exporting}
            className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {exporting ? "Exporting..." : "Download"}
          </button>
        </div>
      </section>

      <section className="mt-6 grid grid-cols-2 gap-2.5">
        {cards.map((card) => (
          <article
            key={card.label}
            className="border-border bg-card relative min-w-0 overflow-hidden rounded-xl border px-3 py-2.5 shadow-[0_2px_10px_-3px_rgba(15,23,42,0.14)]"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">{card.label}</p>
                <p className="text-card-foreground mt-1 text-2xl font-bold leading-none tracking-tight tabular-nums">
                  {card.value}
                </p>
              </div>
              <span className={`inline-flex rounded-md px-2 py-1 text-[10px] font-semibold ${card.tone}`}>
                {card.hint}
              </span>
            </div>
          </article>
        ))}
      </section>

      <section className="mt-8" aria-labelledby="billing-summary-heading">
        <div className="mb-3 flex items-center gap-2.5">
          <div className="bg-primary h-5 w-1 shrink-0 rounded-full" />
          <h2 id="billing-summary-heading" className="text-base font-bold tracking-tight text-zinc-900 dark:text-white">
            Billing summary
          </h2>
        </div>
        <p className="text-muted-foreground mb-4 text-sm">
          Totals from saved invoices (drafts excluded), grouped by company and by retailer.
        </p>

        {billingGrand.invoiceCount === 0 ? (
          <div className="border-border bg-card rounded-2xl border border-dashed px-4 py-8 text-center">
            <p className="font-semibold text-zinc-900 dark:text-white">No billing yet</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Add retailers and use{" "}
              <Link href="/retailers" className="font-medium text-amber-700 underline-offset-2 hover:underline dark:text-amber-400">
                Invoice entry
              </Link>{" "}
              to create invoices.
            </p>
          </div>
        ) : (
          <>
            <div className="border-border bg-card mb-6 grid grid-cols-2 gap-3 rounded-2xl border p-4 shadow-sm">
              <div>
                <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">Invoices</p>
                <p className="text-card-foreground mt-1 text-xl font-bold tabular-nums">{billingGrand.invoiceCount}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">Total billed</p>
                <p className="text-card-foreground mt-1 text-xl font-bold tabular-nums">{formatInr(billingGrand.totalBilled)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">Paid</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {formatInr(billingGrand.totalPaid)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">Outstanding</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-amber-700 dark:text-amber-400">
                  {formatInr(billingGrand.totalOutstanding)}
                </p>
              </div>
            </div>

            <div className="mb-6">
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <h3 className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">By company</h3>
                <Link
                  href="/companies"
                  className="text-xs font-semibold text-sky-600 underline-offset-2 hover:underline dark:text-sky-400"
                >
                  Companies
                </Link>
              </div>
              <ul className="flex flex-col gap-2.5">
                {billingByCompany.map((line) => (
                  <li key={line.id}>
                    <BillingLineCard line={line} />
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <h3 className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">By retailer</h3>
                <Link
                  href="/retailers"
                  className="text-xs font-semibold text-amber-700 underline-offset-2 hover:underline dark:text-amber-500"
                >
                  Invoices
                </Link>
              </div>
              <ul className="flex flex-col gap-2.5">
                {billingByRetailer.map((line) => (
                  <li key={line.id}>
                    <BillingLineCard line={line} />
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </section>
    </>
  );
}
