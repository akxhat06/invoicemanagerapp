"use client";

import { createClient } from "@/lib/supabase/client";
import { InvoiceEditForm } from "@/components/invoices/invoice-edit-form";
import { RetailerCreditNotesPanel } from "@/components/retailers/retailer-credit-notes-panel";
import { RetailerPaymentsPanel } from "@/components/retailers/retailer-payments-panel";
import {
  BuildingIcon,
  CreditNoteTabIcon,
  InvoiceDocIcon,
  PaymentTabIcon,
  PersonIcon,
  RETAILER_TAB_ACTIVE,
  RETAILER_TAB_BTN,
  RETAILER_TAB_IDLE,
  StatIconWrap,
  ViewRow,
  ViewSectionCard,
  ViewSubsectionLabel,
} from "@/components/retailers/retailer-detail-ui";
import { parseRetailerTaxId, phoneDigitsFromStored } from "@/lib/retailer-helpers";
import { toastError, toastSuccess } from "@/lib/toast";
import type { CompanyRow } from "@/types/company";
import type { InvoiceGoodsReturnRow, InvoicePaymentRow, RetailerInvoiceRow } from "@/types/invoice";
import type { RetailerRow } from "@/types/retailer";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export type RetailerDetailTab = "profile" | "invoices" | "credit_notes" | "payments";

type Props = {
  retailer: RetailerRow;
  companies: CompanyRow[];
  initialInvoiceCount: number;
  initialCompanyNames: string[];
  initialTotalAmount: number;
};

function formatInr(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);
}

export function RetailerDetailScreen({
  retailer,
  companies,
  initialInvoiceCount,
  initialCompanyNames,
  initialTotalAmount,
}: Props) {
  const router = useRouter();
  const [retailerViewTab, setRetailerViewTab] = useState<RetailerDetailTab>("profile");
  const [retailerInvoices, setRetailerInvoices] = useState<RetailerInvoiceRow[]>([]);
  const [retailerInvoicesLoading, setRetailerInvoicesLoading] = useState(true);
  const [retailerReturns, setRetailerReturns] = useState<InvoiceGoodsReturnRow[]>([]);
  const [retailerPayments, setRetailerPayments] = useState<InvoicePaymentRow[]>([]);
  const [retailerInvoiceExtrasLoading, setRetailerInvoiceExtrasLoading] = useState(false);
  const [inlineInvoiceEdit, setInlineInvoiceEdit] = useState<RetailerInvoiceRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [invoiceDeleteTarget, setInvoiceDeleteTarget] = useState<RetailerInvoiceRow | null>(null);
  const [invoiceDeleting, setInvoiceDeleting] = useState(false);

  const companyNameById = useMemo(() => new Map(companies.map((c) => [c.id, c.name ?? ""])), [companies]);

  useEffect(() => {
    let cancelled = false;
    setRetailerInvoicesLoading(true);
    (async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("retailer_invoices")
        .select("*")
        .eq("retailer_id", retailer.id)
        .order("bill_date", { ascending: false });
      if (cancelled) return;
      setRetailerInvoicesLoading(false);
      if (error) {
        toastError(error.message);
        setRetailerInvoices([]);
        return;
      }
      setRetailerInvoices((data ?? []) as RetailerInvoiceRow[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [retailer.id]);

  useEffect(() => {
    if (retailerInvoicesLoading) {
      setRetailerReturns([]);
      setRetailerPayments([]);
      setRetailerInvoiceExtrasLoading(true);
      return;
    }
    const ids = retailerInvoices.map((i) => i.id);
    if (ids.length === 0) {
      setRetailerReturns([]);
      setRetailerPayments([]);
      setRetailerInvoiceExtrasLoading(false);
      return;
    }
    let cancelled = false;
    setRetailerInvoiceExtrasLoading(true);
    (async () => {
      const supabase = createClient();
      const [retRes, payRes] = await Promise.all([
        supabase.from("invoice_goods_returns").select("*").in("invoice_id", ids).order("return_date", { ascending: false }),
        supabase.from("invoice_payments").select("*").in("invoice_id", ids).order("payment_date", { ascending: false }),
      ]);
      if (cancelled) return;
      setRetailerInvoiceExtrasLoading(false);
      if (retRes.error) {
        toastError(retRes.error.message);
        setRetailerReturns([]);
      } else {
        setRetailerReturns((retRes.data ?? []) as InvoiceGoodsReturnRow[]);
      }
      if (payRes.error) {
        toastError(payRes.error.message);
        setRetailerPayments([]);
      } else {
        setRetailerPayments((payRes.data ?? []) as InvoicePaymentRow[]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [retailer.id, retailerInvoices, retailerInvoicesLoading]);

  const retailerViewStats = useMemo(() => {
    if (retailerInvoicesLoading) {
      return {
        loading: true as const,
        invoiceCount: initialInvoiceCount,
        companyCount: initialCompanyNames.length,
        totalAmount: initialTotalAmount,
      };
    }
    let total = 0;
    const cids = new Set<string>();
    for (const inv of retailerInvoices) {
      total += Number(inv.total_amount ?? 0);
      if (inv.company_id) cids.add(inv.company_id);
    }
    return {
      loading: false as const,
      invoiceCount: retailerInvoices.length,
      companyCount: cids.size,
      totalAmount: total,
    };
  }, [
    retailerInvoices,
    retailerInvoicesLoading,
    initialInvoiceCount,
    initialCompanyNames.length,
    initialTotalAmount,
  ]);

  const linkedCompanyNames = useMemo(() => {
    if (retailerInvoices.length > 0) {
      const s = new Set<string>();
      for (const inv of retailerInvoices) {
        const n = companyNameById.get(inv.company_id);
        if (n) s.add(n);
      }
      return [...s].sort();
    }
    return initialCompanyNames;
  }, [retailerInvoices, companyNameById, initialCompanyNames]);

  async function confirmDeleteRetailer() {
    setDeleting(true);
    const supabase = createClient();
    const { count, error: countErr } = await supabase
      .from("retailer_invoices")
      .select("id", { count: "exact", head: true })
      .eq("retailer_id", retailer.id);
    if (countErr) {
      toastError(countErr.message);
      setDeleting(false);
      return;
    }
    if ((count ?? 0) > 0) {
      toastError("Remove or reassign invoices before deleting this retailer.");
      setDeleting(false);
      setDeleteTarget(false);
      return;
    }
    const { error } = await supabase.from("retailers").delete().eq("id", retailer.id);
    setDeleting(false);
    if (error) {
      toastError(error.message);
      return;
    }
    toastSuccess("Retailer deleted.");
    router.push("/retailers");
    router.refresh();
  }

  async function confirmDeleteInvoice() {
    if (!invoiceDeleteTarget) return;
    setInvoiceDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.from("retailer_invoices").delete().eq("id", invoiceDeleteTarget.id);
    setInvoiceDeleting(false);
    if (error) {
      toastError(error.message);
      return;
    }
    const nextInv = retailerInvoices.filter((i) => i.id !== invoiceDeleteTarget.id);
    setRetailerInvoices(nextInv);
    if (inlineInvoiceEdit?.id === invoiceDeleteTarget.id) setInlineInvoiceEdit(null);
    toastSuccess("Invoice deleted.");
    setInvoiceDeleteTarget(null);
    router.refresh();
  }

  return (
    <div className="relative -mx-4 -mt-5 min-h-[calc(100dvh-7.5rem)] px-4 pb-28 pt-4 text-zinc-100 md:mx-0 md:mt-0 md:min-h-[calc(100dvh-8rem)] md:rounded-2xl md:border md:border-zinc-800/80 md:pb-12 md:pt-6">
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl opacity-90 md:block" aria-hidden>
        <div className="absolute -left-1/4 -top-24 h-48 w-[150%] bg-gradient-to-b from-violet-600/14 via-fuchsia-600/5 to-transparent blur-2xl md:rounded-2xl" />
        <div className="absolute -right-8 top-16 h-40 w-40 rounded-full bg-teal-500/10 blur-3xl" />
      </div>

      <header className="relative z-10 mb-6 flex flex-col gap-4 border-b border-white/[0.06] pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Link
            href="/retailers"
            className="mt-0.5 rounded-xl p-2 text-zinc-400 transition hover:bg-white/5 hover:text-white"
            aria-label="Back to retailers"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <div className="min-w-0">
            <h1 className="font-login-serif text-2xl font-semibold tracking-tight text-white sm:text-3xl">{retailer.name}</h1>
            <p className="mt-1 font-mono text-sm text-zinc-400">
              {phoneDigitsFromStored(retailer.contact_no) ? `+91 ${phoneDigitsFromStored(retailer.contact_no)}` : "No phone on file"}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
          <Link
            href={`/retailers?edit=${encodeURIComponent(retailer.id)}`}
            className="rounded-xl bg-white/[0.1] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/[0.16]"
          >
            Edit
          </Link>
          <button
            type="button"
            onClick={() => setDeleteTarget(true)}
            className="rounded-xl bg-red-500/15 px-4 py-2.5 text-sm font-medium text-red-200 ring-1 ring-inset ring-red-500/25 transition hover:bg-red-500/25"
          >
            Delete
          </button>
        </div>
      </header>

      {!inlineInvoiceEdit && (
        <div className="relative z-10 mb-6 space-y-4">
          <div
            role="region"
            aria-label="Invoice summary for this retailer"
            className="grid grid-cols-2 gap-2 sm:grid-cols-3"
          >
            <div className="flex flex-row items-center gap-2.5 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 backdrop-blur-sm">
              <StatIconWrap tone="neutral">
                <InvoiceDocIcon className="h-4 w-4" />
              </StatIconWrap>
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Invoices</p>
                {retailerViewStats.loading ? (
                  <div className="mt-1.5 h-6 w-10 animate-pulse rounded-md bg-white/10" aria-hidden />
                ) : (
                  <p className="text-lg font-bold tabular-nums text-white">{retailerViewStats.invoiceCount}</p>
                )}
              </div>
            </div>
            <div className="flex flex-row items-center gap-2.5 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 backdrop-blur-sm">
              <StatIconWrap tone="cyan">
                <BuildingIcon className="h-4 w-4" />
              </StatIconWrap>
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Companies</p>
                {retailerViewStats.loading ? (
                  <div className="mt-1.5 h-6 w-10 animate-pulse rounded-md bg-white/10" aria-hidden />
                ) : (
                  <p className="text-lg font-bold tabular-nums text-cyan-200">{retailerViewStats.companyCount}</p>
                )}
              </div>
            </div>
            <div className="col-span-2 flex flex-row items-center gap-2.5 rounded-2xl border border-teal-400/20 bg-gradient-to-br from-teal-500/12 via-teal-500/5 to-transparent px-3 py-2.5 backdrop-blur-sm sm:col-span-1">
              <StatIconWrap tone="teal">
                <span className="text-[15px] font-semibold leading-none">₹</span>
              </StatIconWrap>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Billed total</p>
                {retailerViewStats.loading ? (
                  <div className="mt-1.5 h-6 w-24 max-w-full animate-pulse rounded-md bg-white/10" aria-hidden />
                ) : (
                  <p className="truncate font-mono text-base font-bold tabular-nums tracking-tight text-teal-100 sm:text-lg">
                    {formatInr(retailerViewStats.totalAmount)}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div
            role="tablist"
            aria-label="Retailer details"
            className="grid grid-cols-2 gap-1 rounded-2xl bg-black/30 p-1 ring-1 ring-inset ring-white/[0.06] sm:grid-cols-4"
          >
            <button
              type="button"
              role="tab"
              aria-selected={retailerViewTab === "profile"}
              id="tab-retailer-profile"
              aria-controls="panel-retailer-profile"
              onClick={() => {
                setRetailerViewTab("profile");
                setInlineInvoiceEdit(null);
              }}
              className={`${RETAILER_TAB_BTN} ${retailerViewTab === "profile" ? RETAILER_TAB_ACTIVE : RETAILER_TAB_IDLE}`}
            >
              <PersonIcon className="h-3.5 w-3.5 shrink-0 opacity-90 sm:h-4 sm:w-4" />
              <span className="max-w-[4rem] truncate sm:max-w-none">Retailer</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={retailerViewTab === "invoices"}
              id="tab-retailer-invoices"
              aria-controls="panel-retailer-invoices"
              onClick={() => setRetailerViewTab("invoices")}
              className={`${RETAILER_TAB_BTN} ${retailerViewTab === "invoices" ? RETAILER_TAB_ACTIVE : RETAILER_TAB_IDLE}`}
            >
              <InvoiceDocIcon className="h-3.5 w-3.5 shrink-0 opacity-90 sm:h-4 sm:w-4" />
              <span className="max-w-[3.25rem] truncate sm:max-w-none">Invoices</span>
              {!retailerInvoicesLoading ? (
                <span
                  className={`shrink-0 rounded-md px-1 py-0.5 text-[9px] font-bold tabular-nums sm:px-1.5 sm:text-[10px] ${
                    retailerViewTab === "invoices" ? "bg-violet-500/30 text-violet-100" : "bg-black/40 text-zinc-500"
                  }`}
                >
                  {retailerInvoices.length}
                </span>
              ) : (
                <span className="h-3.5 w-3.5 shrink-0 animate-pulse rounded bg-zinc-700 sm:h-4 sm:w-4" aria-hidden />
              )}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={retailerViewTab === "credit_notes"}
              id="tab-retailer-credit-notes"
              aria-controls="panel-retailer-credit-notes"
              aria-label="Credit notes"
              title="Credit notes (goods returns)"
              onClick={() => {
                setRetailerViewTab("credit_notes");
                setInlineInvoiceEdit(null);
              }}
              className={`${RETAILER_TAB_BTN} ${retailerViewTab === "credit_notes" ? RETAILER_TAB_ACTIVE : RETAILER_TAB_IDLE}`}
            >
              <CreditNoteTabIcon className="h-3.5 w-3.5 shrink-0 opacity-90 sm:h-4 sm:w-4" />
              <span className="max-w-[3rem] truncate sm:max-w-none">Credits</span>
              {!retailerInvoiceExtrasLoading ? (
                <span
                  className={`shrink-0 rounded-md px-1 py-0.5 text-[9px] font-bold tabular-nums sm:px-1.5 sm:text-[10px] ${
                    retailerViewTab === "credit_notes" ? "bg-rose-500/30 text-rose-100" : "bg-black/40 text-zinc-500"
                  }`}
                >
                  {retailerReturns.length}
                </span>
              ) : (
                <span className="h-3.5 w-3.5 shrink-0 animate-pulse rounded bg-zinc-700 sm:h-4 sm:w-4" aria-hidden />
              )}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={retailerViewTab === "payments"}
              id="tab-retailer-payments"
              aria-controls="panel-retailer-payments"
              aria-label="Payments"
              title="Payments against invoices"
              onClick={() => {
                setRetailerViewTab("payments");
                setInlineInvoiceEdit(null);
              }}
              className={`${RETAILER_TAB_BTN} ${retailerViewTab === "payments" ? RETAILER_TAB_ACTIVE : RETAILER_TAB_IDLE}`}
            >
              <PaymentTabIcon className="h-3.5 w-3.5 shrink-0 opacity-90 sm:h-4 sm:w-4" />
              <span className="max-w-[3.75rem] truncate sm:max-w-none">Payment</span>
              {!retailerInvoiceExtrasLoading ? (
                <span
                  className={`shrink-0 rounded-md px-1 py-0.5 text-[9px] font-bold tabular-nums sm:px-1.5 sm:text-[10px] ${
                    retailerViewTab === "payments" ? "bg-indigo-500/30 text-indigo-100" : "bg-black/40 text-zinc-500"
                  }`}
                >
                  {retailerPayments.length}
                </span>
              ) : (
                <span className="h-3.5 w-3.5 shrink-0 animate-pulse rounded bg-zinc-700 sm:h-4 sm:w-4" aria-hidden />
              )}
            </button>
          </div>
        </div>
      )}

      <div className={`relative z-10 ${inlineInvoiceEdit ? "flex min-h-0 flex-1 flex-col overflow-hidden" : "pb-8"}`}>
        {retailerViewTab === "profile" && (
          <section id="panel-retailer-profile" role="tabpanel" aria-labelledby="tab-retailer-profile" className="relative z-0">
            <div className="mb-6">
              <p className="max-w-md text-sm leading-relaxed text-zinc-400">
                Contact, GST, and companies this retailer appears on through invoices.
              </p>
            </div>
            <ViewSectionCard className="mb-4">
              <ViewSubsectionLabel>Linked companies</ViewSubsectionLabel>
              <div className="px-4 pb-4 pt-1 sm:px-5">
                {linkedCompanyNames.length === 0 ? (
                  <p className="text-sm text-zinc-500">No invoices yet—companies will show here once you bill this retailer.</p>
                ) : (
                  <ul className="flex flex-wrap gap-2">
                    {linkedCompanyNames.map((name) => (
                      <li
                        key={name}
                        className="rounded-full border border-white/[0.08] bg-white/[0.05] px-3 py-1.5 text-sm font-medium text-zinc-200 backdrop-blur-sm"
                      >
                        {name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </ViewSectionCard>
            <ViewSectionCard>
              <ViewSubsectionLabel>Contact &amp; registration</ViewSubsectionLabel>
              <div className="px-4 pb-3 pt-0 sm:px-5">
                <ViewRow label="Name" value={retailer.name ?? ""} />
                <ViewRow label="Address" value={retailer.address ?? ""} />
                <ViewRow label="Contact person name" value={retailer.contact_person_name ?? ""} />
                <ViewRow label="Telephone" value={retailer.telephone ?? ""} />
                <ViewRow
                  label="Phone no."
                  value={phoneDigitsFromStored(retailer.contact_no) ? `+91 ${phoneDigitsFromStored(retailer.contact_no)}` : ""}
                  mono
                />
                <ViewRow
                  label="Alternative no."
                  value={
                    phoneDigitsFromStored(retailer.alternative_phone) ? `+91 ${phoneDigitsFromStored(retailer.alternative_phone)}` : ""
                  }
                  mono
                />
                <ViewRow
                  label={parseRetailerTaxId(retailer.gst_no).type === "pan" ? "PAN no." : "GST no."}
                  value={parseRetailerTaxId(retailer.gst_no).value}
                  mono
                />
              </div>
            </ViewSectionCard>
          </section>
        )}
        {retailerViewTab === "invoices" && (
          <section
            id="panel-retailer-invoices"
            role="tabpanel"
            aria-labelledby="tab-retailer-invoices"
            className={`relative z-0 ${inlineInvoiceEdit ? "flex min-h-0 flex-1 flex-col" : ""}`}
          >
            {inlineInvoiceEdit ? (
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="mb-4 shrink-0">
                  <button
                    type="button"
                    onClick={() => setInlineInvoiceEdit(null)}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.06] px-3 py-2.5 text-sm font-medium text-zinc-100 transition hover:bg-white/[0.1]"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                      <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Back to list
                  </button>
                  <p className="mt-3 text-sm text-zinc-400">
                    Editing <span className="font-mono font-semibold text-white">{inlineInvoiceEdit.invoice_number}</span>
                  </p>
                </div>
                <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                  <InvoiceEditForm
                    invoice={inlineInvoiceEdit}
                    companies={companies}
                    onSaved={(row) => {
                      setRetailerInvoices((prev) => prev.map((x) => (x.id === row.id ? row : x)));
                      setInlineInvoiceEdit(null);
                      router.refresh();
                    }}
                    onCancel={() => setInlineInvoiceEdit(null)}
                  />
                </div>
              </div>
            ) : (
              <>
                <p className="mb-4 text-sm leading-relaxed text-zinc-400">
                  Invoices for this retailer. Edit in place; delete removes the row permanently.
                </p>
                <ViewSectionCard className="border-violet-500/15">
                  {retailerInvoicesLoading ? (
                    <div className="flex items-center gap-3 px-5 py-10">
                      <span
                        className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-violet-400"
                        aria-hidden
                      />
                      <p className="text-sm text-zinc-400">Loading invoices…</p>
                    </div>
                  ) : retailerInvoices.length === 0 ? (
                    <div className="px-5 py-12 text-center">
                      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04] text-zinc-500">
                        <InvoiceDocIcon className="h-7 w-7" />
                      </div>
                      <p className="text-sm font-medium text-zinc-200">No invoices yet</p>
                      <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-zinc-500">
                        Create an invoice from the main Invoices page and choose this retailer.
                      </p>
                    </div>
                  ) : (
                    <ul className="space-y-2 p-2 sm:p-3">
                      {retailerInvoices.map((inv) => {
                        const coName = companyNameById.get(inv.company_id) ?? "—";
                        return (
                          <li
                            key={inv.id}
                            className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-3.5 backdrop-blur-sm transition hover:border-white/[0.1] hover:bg-white/[0.06] sm:flex-nowrap sm:p-4"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold tracking-tight text-white">{inv.invoice_number}</p>
                              <p className="mt-0.5 text-xs text-violet-200/85">{coName}</p>
                              <p className="mt-0.5 text-xs text-zinc-500">{(inv.bill_date ?? "").slice(0, 10)}</p>
                              <div className="mt-2 space-y-0.5">
                                <p className="font-mono text-sm font-medium tabular-nums text-teal-200/95">
                                  {formatInr(Number(inv.total_amount ?? 0))}
                                </p>
                                <p className="font-mono text-xs tabular-nums text-sky-200/75">
                                  Transport {formatInr(Number(inv.transportation_amount ?? 0))}
                                </p>
                              </div>
                            </div>
                            <div className="flex w-full shrink-0 gap-2 sm:w-auto">
                              <button
                                type="button"
                                onClick={() => setInlineInvoiceEdit(inv)}
                                className="flex-1 rounded-xl bg-white/[0.1] px-3 py-2.5 text-sm font-medium text-white transition hover:bg-white/[0.16] sm:flex-none"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => setInvoiceDeleteTarget(inv)}
                                className="flex-1 rounded-xl bg-red-500/15 px-3 py-2.5 text-sm font-medium text-red-200 ring-1 ring-inset ring-red-500/20 transition hover:bg-red-500/25 sm:flex-none"
                              >
                                Delete
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </ViewSectionCard>
              </>
            )}
          </section>
        )}
        {retailerViewTab === "credit_notes" && (
          <RetailerCreditNotesPanel
            invoices={retailerInvoices}
            returns={retailerReturns}
            loading={retailerInvoicesLoading || retailerInvoiceExtrasLoading}
            onReturnsChange={setRetailerReturns}
          />
        )}
        {retailerViewTab === "payments" && (
          <RetailerPaymentsPanel
            invoices={retailerInvoices}
            payments={retailerPayments}
            loading={retailerInvoicesLoading || retailerInvoiceExtrasLoading}
            onPaymentsChange={setRetailerPayments}
            onInvoicePatch={(invoiceId, patch) =>
              setRetailerInvoices((prev) => prev.map((i) => (i.id === invoiceId ? { ...i, ...patch } : i)))
            }
          />
        )}
      </div>

      {deleteTarget && (
        <>
          <div className="fixed inset-0 z-[100] bg-black/70" aria-hidden onClick={() => !deleting && setDeleteTarget(false)} />
          <div
            role="alertdialog"
            aria-labelledby="retailer-del-title"
            className="fixed left-1/2 top-1/2 z-[101] w-[min(100%-2rem,22rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-zinc-700 bg-[#1A1C26] p-5 shadow-xl"
          >
            <h3 id="retailer-del-title" className="text-lg font-semibold text-white">
              Delete retailer?
            </h3>
            <p className="mt-2 text-sm text-zinc-400">
              Remove <span className="font-medium text-white">&ldquo;{retailer.name}&rdquo;</span>? This cannot be undone. Retailers with
              invoices cannot be deleted.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(false)}
                className="rounded-xl px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-white/5 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => void confirmDeleteRetailer()}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </>
      )}

      {invoiceDeleteTarget && (
        <>
          <div className="fixed inset-0 z-[100] bg-black/70" aria-hidden onClick={() => !invoiceDeleting && setInvoiceDeleteTarget(null)} />
          <div
            role="alertdialog"
            aria-labelledby="retailer-inv-del-title"
            className="fixed left-1/2 top-1/2 z-[101] w-[min(100%-2rem,22rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-zinc-700 bg-[#1A1C26] p-5 shadow-xl"
          >
            <h3 id="retailer-inv-del-title" className="text-lg font-semibold text-white">
              Delete invoice?
            </h3>
            <p className="mt-2 text-sm text-zinc-400">
              Remove invoice <span className="font-medium text-white">&ldquo;{invoiceDeleteTarget.invoice_number}&rdquo;</span>? This cannot
              be undone.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                disabled={invoiceDeleting}
                onClick={() => setInvoiceDeleteTarget(null)}
                className="rounded-xl px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-white/5 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={invoiceDeleting}
                onClick={() => void confirmDeleteInvoice()}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {invoiceDeleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
