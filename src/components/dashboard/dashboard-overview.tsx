"use client";

import { FinancialYearSelect } from "@/components/dashboard/financial-year-select";
import { firstName, formatDisplayName } from "@/lib/display-name";
import type { BillingGrandTotals, BillingSummaryLine } from "@/lib/billing-summary";
import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

function formatInr(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);
}

type DetailPanel = null | "companies" | "retailers" | "overall" | "report";

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
  /** Every company + billing (zeros if no invoices) */
  companyBillingTable: BillingSummaryLine[];
  /** Every retailer profile + billing; legacy name-only rows appended */
  retailerBillingTable: BillingSummaryLine[];
  financialYearStartYear: number;
  financialYearLabel: string;
  financialYearOptions: { startYear: number; label: string }[];
};

const thCls =
  "text-muted-foreground whitespace-nowrap px-2 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider";
const tdCls = "border-border/60 text-card-foreground border-t px-2 py-2.5 text-sm";
const numCls = `${tdCls} text-right tabular-nums`;

function BillingRowsTable({ rows }: { rows: BillingSummaryLine[] }) {
  if (rows.length === 0) {
    return <p className="text-muted-foreground py-6 text-center text-sm">No rows to show.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[760px] border-collapse text-left">
        <thead className="bg-muted/40">
          <tr>
            <th className={thCls}>Name</th>
            <th className={`${thCls} text-right`}>Invoices</th>
            <th className={`${thCls} text-right`}>Basic</th>
            <th className={`${thCls} text-right`}>GST</th>
            <th className={`${thCls} text-right`}>Invoice amt</th>
            <th className={`${thCls} text-right`}>Transport</th>
            <th className={`${thCls} text-right`}>Total billed</th>
            <th className={`${thCls} text-right`}>Paid</th>
            <th className={`${thCls} text-right`}>Outstanding</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-muted/25">
              <td className={`${tdCls} max-w-[200px] font-medium [overflow-wrap:anywhere]`}>{row.name}</td>
              <td className={numCls}>{row.invoiceCount}</td>
              <td className={numCls}>{formatInr(row.totalBasic)}</td>
              <td className={numCls}>{formatInr(row.totalGst)}</td>
              <td className={numCls}>{formatInr(row.totalInvoiceAmount)}</td>
              <td className={numCls}>{formatInr(row.totalTransport)}</td>
              <td className={numCls}>{formatInr(row.totalBilled)}</td>
              <td className={`${numCls} text-emerald-600 dark:text-emerald-400`}>{formatInr(row.totalPaid)}</td>
              <td className={`${numCls} text-amber-700 dark:text-amber-400`}>{formatInr(row.totalOutstanding)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OverviewFySummaryTables({
  financialYearLabel,
  billingGrand,
  companyCount,
  retailerCount,
  transportCount,
  paymentCount,
  returnCount,
  commissionCount,
}: {
  financialYearLabel: string;
  billingGrand: BillingGrandTotals;
  companyCount: number;
  retailerCount: number;
  transportCount: number;
  paymentCount: number;
  returnCount: number;
  commissionCount: number;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-muted-foreground mb-2 text-xs font-semibold uppercase tracking-wider">
          Invoice totals — {financialYearLabel} (non-draft)
        </h3>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[280px] text-sm">
            <tbody>
              {[
                ["Invoices", String(billingGrand.invoiceCount)],
                ["Total basic", formatInr(billingGrand.totalBasic)],
                ["Total GST", formatInr(billingGrand.totalGst)],
                ["Total invoice amount", formatInr(billingGrand.totalInvoiceAmount)],
                ["Total transportation", formatInr(billingGrand.totalTransport)],
                ["Total billed", formatInr(billingGrand.totalBilled)],
                ["Paid (on invoices)", formatInr(billingGrand.totalPaid)],
                ["Outstanding (on invoices)", formatInr(billingGrand.totalOutstanding)],
              ].map(([k, v]) => (
                <tr key={k} className="border-border/60 border-t first:border-t-0">
                  <td className="text-muted-foreground px-3 py-2.5">{k}</td>
                  <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-zinc-900 dark:text-white">
                    {v}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div>
        <h3 className="text-muted-foreground mb-2 text-xs font-semibold uppercase tracking-wider">Profiles (all time)</h3>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[280px] text-sm">
            <tbody>
              {[
                ["Companies", companyCount],
                ["Retailers", retailerCount],
              ].map(([k, v]) => (
                <tr key={k} className="border-border/60 border-t first:border-t-0">
                  <td className="text-muted-foreground px-3 py-2.5">{k}</td>
                  <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div>
        <h3 className="text-muted-foreground mb-2 text-xs font-semibold uppercase tracking-wider">
          Module entries — {financialYearLabel}
        </h3>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[280px] text-sm">
            <tbody>
              {[
                ["Transport entries", transportCount],
                ["Payment entries", paymentCount],
                ["Goods return entries", returnCount],
                ["Commission entries", commissionCount],
              ].map(([k, v]) => (
                <tr key={k} className="border-border/60 border-t first:border-t-0">
                  <td className="text-muted-foreground px-3 py-2.5">{k}</td>
                  <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

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
        <div className="grid grid-cols-2 gap-2 border-t border-border/60 pt-2">
          <div>
            <dt className="text-muted-foreground">Basic</dt>
            <dd className="mt-0.5 font-medium tabular-nums">{formatInr(line.totalBasic)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">GST</dt>
            <dd className="mt-0.5 font-medium tabular-nums">{formatInr(line.totalGst)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Invoice amt</dt>
            <dd className="mt-0.5 font-medium tabular-nums">{formatInr(line.totalInvoiceAmount)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Transport</dt>
            <dd className="mt-0.5 font-medium tabular-nums">{formatInr(line.totalTransport)}</dd>
          </div>
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
  companyBillingTable,
  retailerBillingTable,
  financialYearStartYear,
  financialYearLabel,
  financialYearOptions,
}: Props) {
  const [exporting, setExporting] = useState(false);
  const [detail, setDetail] = useState<DetailPanel>(null);

  const displayName = useMemo(
    () => formatDisplayName(username, email),
    [username, email]
  );
  const greet = firstName(displayName);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  const cards = [
    { label: "Companies", value: companyCount, hint: "All profiles", tone: "bg-sky-500/10 text-sky-500", key: "companies" as const },
    { label: "Retailers", value: retailerCount, hint: "All profiles", tone: "bg-amber-500/10 text-amber-500", key: "retailers" as const },
    { label: "Transport", value: transportCount, hint: "This FY", tone: "bg-cyan-500/10 text-cyan-500", key: null },
    { label: "Payments", value: paymentCount, hint: "This FY", tone: "bg-emerald-500/10 text-emerald-500", key: null },
    { label: "Returns", value: returnCount, hint: "This FY", tone: "bg-rose-500/10 text-rose-500", key: null },
    { label: "Commission", value: commissionCount, hint: "This FY", tone: "bg-violet-500/10 text-violet-500", key: null },
  ];

  const closeDetail = useCallback(() => setDetail(null), []);

  useEffect(() => {
    if (!detail) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDetail();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [detail, closeDetail]);

  useEffect(() => {
    if (detail) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [detail]);

  async function downloadOverviewExcel() {
    if (exporting) return;
    setExporting(true);
    try {
      const res = await fetch(`/api/overview-export?fy=${financialYearStartYear}`, { method: "GET" });
      if (!res.ok) {
        throw new Error("Failed to export");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const fyFile = financialYearLabel.replace(/\s/g, "");
      a.download = `overview-FY${fyFile}-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  const detailTitle =
    detail === "companies"
      ? `Companies — ${financialYearLabel}`
      : detail === "retailers"
        ? `Retailers — ${financialYearLabel}`
        : detail === "overall"
          ? `Overall — ${financialYearLabel}`
          : detail === "report"
            ? `Report preview — ${financialYearLabel}`
            : "";

  return (
    <>
      {detail && (
        <>
          <button
            type="button"
            aria-label="Close"
            className="fixed inset-0 z-[100] bg-black/55 backdrop-blur-[2px]"
            onClick={closeDetail}
          />
          <div
            className="border-border bg-card fixed left-1/2 top-1/2 z-[110] flex max-h-[min(92vh,900px)] w-[min(96vw,920px)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="billing-detail-title"
          >
            <div className="border-border flex shrink-0 flex-col gap-1 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
              <div className="min-w-0">
                <h2 id="billing-detail-title" className="text-base font-bold text-zinc-900 dark:text-white">
                  {detailTitle}
                </h2>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Indian FY {financialYearLabel} · 1 Apr {financialYearStartYear} – 31 Mar {financialYearStartYear + 1}
                </p>
              </div>
              <button
                type="button"
                onClick={closeDetail}
                className="text-muted-foreground hover:text-foreground self-end rounded-lg px-2 py-1 text-sm font-medium sm:self-center"
              >
                Close
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {detail === "companies" && <BillingRowsTable rows={companyBillingTable} />}
              {detail === "retailers" && <BillingRowsTable rows={retailerBillingTable} />}
              {detail === "report" && (
                <div className="space-y-8">
                  <p className="text-muted-foreground text-sm">
                    Same scope as the Excel download: billing by invoice date for {financialYearLabel}. Use{" "}
                    <span className="font-medium">Download</span> in the header to save the file.
                  </p>
                  <OverviewFySummaryTables
                    financialYearLabel={financialYearLabel}
                    billingGrand={billingGrand}
                    companyCount={companyCount}
                    retailerCount={retailerCount}
                    transportCount={transportCount}
                    paymentCount={paymentCount}
                    returnCount={returnCount}
                    commissionCount={commissionCount}
                  />
                  <div>
                    <h3 className="text-muted-foreground mb-3 text-xs font-semibold uppercase tracking-wider">
                      By company
                    </h3>
                    <BillingRowsTable rows={companyBillingTable} />
                  </div>
                  <div>
                    <h3 className="text-muted-foreground mb-3 text-xs font-semibold uppercase tracking-wider">
                      By retailer
                    </h3>
                    <BillingRowsTable rows={retailerBillingTable} />
                  </div>
                </div>
              )}
              {detail === "overall" && (
                <OverviewFySummaryTables
                  financialYearLabel={financialYearLabel}
                  billingGrand={billingGrand}
                  companyCount={companyCount}
                  retailerCount={retailerCount}
                  transportCount={transportCount}
                  paymentCount={paymentCount}
                  returnCount={returnCount}
                  commissionCount={commissionCount}
                />
              )}
            </div>
          </div>
        </>
      )}

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
              Billing figures use Indian FY {financialYearLabel} (Apr–Mar).
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-start">
            <button
              type="button"
              onClick={() => setDetail("overall")}
              className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/20"
            >
              Overall
            </button>
            <button
              type="button"
              onClick={() => setDetail("report")}
              className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/20"
            >
              View
            </button>
            <button
              type="button"
              onClick={() => void downloadOverviewExcel()}
              disabled={exporting}
              className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {exporting ? "Exporting..." : "Download"}
            </button>
          </div>
        </div>
      </section>

      <section className="mt-6 grid grid-cols-2 gap-2.5">
        {cards.map((card) => {
          const clickable = card.key === "companies" || card.key === "retailers";
          return (
            <article
              key={card.label}
              className={`border-border bg-card relative min-w-0 overflow-hidden rounded-xl border px-3 py-2.5 shadow-[0_2px_10px_-3px_rgba(15,23,42,0.14)] ${
                clickable
                  ? "cursor-pointer transition hover:bg-muted/50 active:scale-[0.99] dark:hover:bg-muted/30"
                  : ""
              }`}
              onClick={
                clickable
                  ? () => setDetail(card.key === "companies" ? "companies" : "retailers")
                  : undefined
              }
              onKeyDown={
                clickable
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setDetail(card.key === "companies" ? "companies" : "retailers");
                      }
                    }
                  : undefined
              }
              role={clickable ? "button" : undefined}
              tabIndex={clickable ? 0 : undefined}
              aria-label={clickable ? `${card.label}: tap for billing table` : undefined}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">{card.label}</p>
                  <p className="text-card-foreground mt-1 text-2xl font-bold leading-none tracking-tight tabular-nums">
                    {card.value}
                  </p>
                  {clickable ? (
                    <p className="text-muted-foreground mt-1 text-[10px] font-medium">Tap for table</p>
                  ) : null}
                </div>
                <span className={`inline-flex rounded-md px-2 py-1 text-[10px] font-semibold ${card.tone}`}>
                  {card.hint}
                </span>
              </div>
            </article>
          );
        })}
      </section>

      <section className="mt-8" aria-labelledby="billing-summary-heading">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="bg-primary h-5 w-1 shrink-0 rounded-full" />
            <h2 id="billing-summary-heading" className="text-base font-bold tracking-tight text-zinc-900 dark:text-white">
              Billing summary
            </h2>
          </div>
          <Suspense
            fallback={<div className="bg-muted h-[72px] w-full max-w-[200px] animate-pulse rounded-lg sm:w-[200px]" />}
          >
            <FinancialYearSelect options={financialYearOptions} selectedStartYear={financialYearStartYear} />
          </Suspense>
        </div>
        <p className="text-muted-foreground mb-4 text-sm">
          Invoices are included by <span className="font-medium">invoice date</span> within FY {financialYearLabel} (1 Apr{" "}
          {financialYearStartYear} – 31 Mar {financialYearStartYear + 1}).           Drafts excluded. Transport / payments / returns /
          commission counts match invoices in this FY. Tap <span className="font-medium">Companies</span> or{" "}
          <span className="font-medium">Retailers</span> for the full table, <span className="font-medium">View</span> for a
          full report preview, or <span className="font-medium">Overall</span>.
        </p>

        {billingGrand.invoiceCount === 0 ? (
          <div className="border-border bg-card rounded-2xl border border-dashed px-4 py-8 text-center">
            <p className="font-semibold text-zinc-900 dark:text-white">No billing in {financialYearLabel}</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Change the financial year above or add invoices dated in this FY via{" "}
              <Link href="/retailers" className="font-medium text-amber-700 underline-offset-2 hover:underline dark:text-amber-400">
                Invoice entry
              </Link>
              .
            </p>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setDetail("overall")}
              className="border-border bg-card mb-6 grid w-full max-w-full grid-cols-2 gap-3 rounded-2xl border p-4 text-left shadow-sm transition hover:bg-muted/30 dark:hover:bg-muted/20"
            >
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
              <p className="text-muted-foreground col-span-2 text-center text-[10px] font-medium">
                Tap for full overall summary · {financialYearLabel}
              </p>
            </button>

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
