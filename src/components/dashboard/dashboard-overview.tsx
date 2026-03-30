"use client";

import { firstName, formatDisplayName } from "@/lib/display-name";
import { useMemo, useState } from "react";

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
};

export function DashboardOverview({
  username,
  email,
  companyCount,
  retailerCount,
  transportCount,
  paymentCount,
  returnCount,
  commissionCount,
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
    </>
  );
}
