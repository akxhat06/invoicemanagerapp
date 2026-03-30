"use client";

import type {
  InvoiceCommissionRow,
  InvoiceGoodsReturnRow,
  InvoicePaymentRow,
  InvoiceTransportRow,
  RetailerInvoiceRow,
} from "@/types/invoice";
import Link from "next/link";
import { useMemo } from "react";

type Props = {
  invoice: RetailerInvoiceRow;
  initialTransports: InvoiceTransportRow[];
  initialReturns: InvoiceGoodsReturnRow[];
  initialPayments: InvoicePaymentRow[];
  initialCommissions: InvoiceCommissionRow[];
};

function inr(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(
    Number.isFinite(n) ? n : 0
  );
}

function ActionIcon({ type }: { type: "transport" | "payments" | "returns" | "commission" }) {
  if (type === "transport") {
    return (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden>
        <rect x="2" y="7" width="13" height="8" rx="2" />
        <path d="M15 10h3l4 3v2h-7" />
        <circle cx="7" cy="17.5" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="18" cy="17.5" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (type === "payments") {
    return (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 10h18" />
        <circle cx="8" cy="15" r="1" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (type === "returns") {
    return (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden>
        <path d="M20 7H9a5 5 0 1 0 0 10h8" />
        <path d="M8 5 4 9l4 4" />
      </svg>
    );
  }
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden>
      <circle cx="12" cy="12" r="8" />
      <path d="M10 9.5c0-1 1-1.8 2.2-1.8 1.1 0 2 .6 2 1.6 0 1.2-1 1.5-2.2 1.8-1.2.3-2.2.7-2.2 1.9 0 1.1 1 1.8 2.3 1.8 1.2 0 2.2-.7 2.2-1.8" />
    </svg>
  );
}

export function RetailerInvoiceDetailScreen({
  invoice,
  initialTransports,
  initialReturns,
  initialPayments,
  initialCommissions,
}: Props) {
  const transports = initialTransports;
  const returns = initialReturns;
  const payments = initialPayments;
  const commissions = initialCommissions;

  const computed = useMemo(() => {
    const totalPayments = payments.reduce((a, p) => a + Number(p.amount || 0), 0);
    const totalReturns = returns.reduce((a, r) => a + Number(r.amount || 0), 0);
    const baseOutstanding = Number(invoice.outstanding_amount || 0);
    const outstanding = Math.max(0, baseOutstanding - totalPayments - totalReturns);
    return { totalPayments, totalReturns, outstanding };
  }, [payments, returns, invoice.outstanding_amount]);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-amber-400/20 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 p-4 shadow-[0_18px_40px_rgba(0,0,0,0.25)]">
        <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-amber-300/15 blur-2xl" />
        <h2 className="text-lg font-bold text-white">{invoice.retailer_name || "Retailer"}</h2>
        <p className="mt-1 text-sm text-zinc-300">
          Invoice: {invoice.invoice_number} · Date: {invoice.bill_date}
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="min-w-0 rounded-xl border border-white/10 bg-white/5 px-3 py-2 backdrop-blur-sm">
            <p className="text-[11px] uppercase tracking-wider text-zinc-400">Total</p>
            <p className="mt-1 whitespace-nowrap text-[clamp(0.95rem,3.4vw,1.45rem)] font-semibold tabular-nums leading-tight text-white">
              {inr(Number(invoice.total_amount))}
            </p>
          </div>
          <div className="min-w-0 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 backdrop-blur-sm">
            <p className="text-[11px] uppercase tracking-wider text-emerald-300/80">Paid</p>
            <p className="mt-1 whitespace-nowrap text-[clamp(0.95rem,3.4vw,1.45rem)] font-semibold tabular-nums leading-tight text-emerald-200">
              {inr(computed.totalPayments)}
            </p>
          </div>
          <div className="min-w-0 rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 backdrop-blur-sm">
            <p className="text-[11px] uppercase tracking-wider text-amber-300/80">Outstanding</p>
            <p className="mt-1 whitespace-nowrap text-[clamp(0.95rem,3.4vw,1.45rem)] font-semibold tabular-nums leading-tight text-amber-100">
              {inr(computed.outstanding)}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card/90 p-4 shadow-sm">
        <h3 className="font-semibold">Manage In Separate Sections</h3>
        <p className="mt-1 text-sm text-muted-foreground">Add or edit there. This page shows mapped details only.</p>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Link href={`/transport?invoiceId=${invoice.id}`} className="group flex items-center justify-between rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-3 py-2.5 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-500/10">
            <span className="inline-flex items-center gap-2"><ActionIcon type="transport" />Transport</span>
            <span className="text-cyan-300/90 transition group-hover:translate-x-0.5">Open</span>
          </Link>
          <Link href={`/payments?invoiceId=${invoice.id}`} className="group flex items-center justify-between rounded-xl border border-indigo-500/20 bg-indigo-500/5 px-3 py-2.5 text-sm font-semibold text-indigo-200 transition hover:bg-indigo-500/10">
            <span className="inline-flex items-center gap-2"><ActionIcon type="payments" />Payments</span>
            <span className="text-indigo-300/90 transition group-hover:translate-x-0.5">Open</span>
          </Link>
          <Link href={`/returns?invoiceId=${invoice.id}`} className="group flex items-center justify-between rounded-xl border border-rose-500/20 bg-rose-500/5 px-3 py-2.5 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/10">
            <span className="inline-flex items-center gap-2"><ActionIcon type="returns" />Goods Return</span>
            <span className="text-rose-300/90 transition group-hover:translate-x-0.5">Open</span>
          </Link>
          <Link href={`/commission?invoiceId=${invoice.id}`} className="group flex items-center justify-between rounded-xl border border-violet-500/20 bg-violet-500/5 px-3 py-2.5 text-sm font-semibold text-violet-200 transition hover:bg-violet-500/10">
            <span className="inline-flex items-center gap-2"><ActionIcon type="commission" />Commission</span>
            <span className="text-violet-300/90 transition group-hover:translate-x-0.5">Open</span>
          </Link>
        </div>
      </section>

      <section className="space-y-3">
        <details open className="group rounded-2xl border border-border bg-card shadow-sm">
          <summary className="cursor-pointer list-none px-4 py-3 font-semibold [&::-webkit-details-marker]:hidden">
            <div className="flex items-center justify-between">
              <span>Transports ({transports.length})</span>
              <span className="text-muted-foreground transition group-open:rotate-180">⌄</span>
            </div>
          </summary>
          <div className="border-border border-t px-4 py-3">
            {transports.length === 0 ? (
              <p className="text-sm text-muted-foreground">No transport entries.</p>
            ) : (
              <ul className="space-y-1.5 text-sm">{transports.map((t) => <li key={t.id} className="rounded-lg bg-muted/40 px-2.5 py-2">{t.transport_name} · {inr(Number(t.amount))}</li>)}</ul>
            )}
          </div>
        </details>

        <details className="group rounded-2xl border border-border bg-card shadow-sm">
          <summary className="cursor-pointer list-none px-4 py-3 font-semibold [&::-webkit-details-marker]:hidden">
            <div className="flex items-center justify-between">
              <span>Goods Returns ({returns.length})</span>
              <span className="text-muted-foreground transition group-open:rotate-180">⌄</span>
            </div>
          </summary>
          <div className="border-border border-t px-4 py-3">
            {returns.length === 0 ? (
              <p className="text-sm text-muted-foreground">No goods return entries.</p>
            ) : (
              <ul className="space-y-1.5 text-sm">{returns.map((r) => <li key={r.id} className="rounded-lg bg-muted/40 px-2.5 py-2">{r.return_date} · {inr(Number(r.amount))}</li>)}</ul>
            )}
          </div>
        </details>

        <details className="group rounded-2xl border border-border bg-card shadow-sm">
          <summary className="cursor-pointer list-none px-4 py-3 font-semibold [&::-webkit-details-marker]:hidden">
            <div className="flex items-center justify-between">
              <span>Payments ({payments.length})</span>
              <span className="text-muted-foreground transition group-open:rotate-180">⌄</span>
            </div>
          </summary>
          <div className="border-border border-t px-4 py-3">
            {payments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payment entries.</p>
            ) : (
              <ul className="space-y-1.5 text-sm">{payments.map((p) => <li key={p.id} className="rounded-lg bg-muted/40 px-2.5 py-2">{p.payment_date} · {p.method} · {inr(Number(p.amount))}</li>)}</ul>
            )}
          </div>
        </details>

        <details className="group rounded-2xl border border-border bg-card shadow-sm">
          <summary className="cursor-pointer list-none px-4 py-3 font-semibold [&::-webkit-details-marker]:hidden">
            <div className="flex items-center justify-between">
              <span>Commissions ({commissions.length})</span>
              <span className="text-muted-foreground transition group-open:rotate-180">⌄</span>
            </div>
          </summary>
          <div className="border-border border-t px-4 py-3">
            {commissions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No commission entries.</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {commissions.map((c) => (
                  <li key={c.id} className="rounded-lg bg-muted/40 px-2.5 py-2">
                    Net {inr(Number(c.net_amount))} · {Number(c.commission_percent)}% · {inr(Number(c.commission_amount))}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </details>
      </section>
    </div>
  );
}
