"use client";

import { firstName, formatDisplayName } from "@/lib/display-name";
import { useMemo } from "react";

type Props = {
  username: string | undefined;
  email: string;
  companyCount: number;
  /** Retailer invoices you have created */
  retailerCount: number;
};

function IconBuilding() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 21h18M4 21V8l8-4v17M12 21V4l8 4v17M9 9h.01M9 12h.01M9 15h.01M15 9h.01M15 12h.01M15 15h.01"
      />
    </svg>
  );
}

function IconInvoice() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

export function DashboardOverview({
  username,
  email,
  companyCount,
  retailerCount,
}: Props) {
  const displayName = useMemo(
    () => formatDisplayName(username, email),
    [username, email]
  );
  const greet = firstName(displayName);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

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
        <div className="relative flex gap-4">
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
        </div>
      </section>

      <section className="mt-6 grid grid-cols-2 gap-3">
        <article className="group border-border bg-card relative flex min-w-0 flex-col overflow-hidden rounded-2xl border p-4 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.08)] ring-1 ring-black/[0.04] transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-4px_rgba(15,23,42,0.12)] dark:shadow-[0_2px_16px_-2px_rgba(0,0,0,0.35)] dark:ring-white/[0.06] dark:hover:shadow-[0_12px_28px_-4px_rgba(0,0,0,0.45)]">
          <div className="bg-surface-brand/90 absolute inset-x-0 top-0 h-1 rounded-b-full opacity-90 dark:bg-surface-brand" />
          <div className="text-surface-brand dark:text-accent mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-100 dark:bg-white/10">
            <IconBuilding />
          </div>
          <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">Companies</p>
          <p className="text-card-foreground mt-1 text-3xl font-bold tracking-tight tabular-nums sm:text-[2rem]">
            {companyCount}
          </p>
          <p className="text-muted-foreground mt-2 text-xs leading-snug">Businesses you manage</p>
        </article>

        <article className="group border-border bg-card relative flex min-w-0 flex-col overflow-hidden rounded-2xl border p-4 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.08)] ring-1 ring-black/[0.04] transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-4px_rgba(15,23,42,0.12)] dark:shadow-[0_2px_16px_-2px_rgba(0,0,0,0.35)] dark:ring-white/[0.06] dark:hover:shadow-[0_12px_28px_-4px_rgba(0,0,0,0.45)]">
          <div className="bg-accent absolute inset-x-0 top-0 h-1 rounded-b-full opacity-95" />
          <div className="text-accent-foreground mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100/90 dark:bg-accent/20">
            <IconInvoice />
          </div>
          <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">Retailers</p>
          <p className="text-card-foreground mt-1 text-3xl font-bold tracking-tight tabular-nums sm:text-[2rem]">
            {retailerCount}
          </p>
          <p className="text-muted-foreground mt-2 text-[11px] leading-snug sm:text-xs">Invoices to retailers</p>
        </article>
      </section>
    </>
  );
}
