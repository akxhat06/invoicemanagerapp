"use client";

import { createClient } from "@/lib/supabase/client";
import { toastError, toastSuccess } from "@/lib/toast";
import { SearchableDropdown, type SearchableDropdownOption } from "@/components/ui/searchable-dropdown";
import type { RetailerRow } from "@/types/retailer";
import type { RetailerInvoiceRow } from "@/types/invoice";
import { commissionStatusFromPaidAmounts, parseCommissionStatus } from "@/lib/commission-status";
import type { CommissionRow } from "@/types/commission";
import type { CompanyRow } from "@/types/company";
import { useEffect, useMemo, useState } from "react";
import { SearchBar } from "@/components/ui/search-bar";

type Props = {
  initialRetailers: RetailerRow[];
  initialInvoices: RetailerInvoiceRow[];
  initialCommissions: CommissionRow[];
  initialCompanies?: CompanyRow[];
};

function formatInr(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);
}

function toNum(v: string | number) {
  const n = parseFloat(String(v || "0"));
  return Number.isFinite(n) ? n : 0;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const inputCls =
  "bg-panel-field text-panel-foreground w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:border-violet-500/60 disabled:opacity-50";

const labelCls =
  "text-muted-foreground mb-1.5 block text-xs font-semibold uppercase tracking-wide";

export function CommissionScreen({ initialRetailers, initialInvoices, initialCommissions, initialCompanies = [] }: Props) {
  const [commissions, setCommissions] = useState<CommissionRow[]>(initialCommissions);
  const [searchQuery, setSearchQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [retailerId, setRetailerId] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [commissionPct, setCommissionPct] = useState("");
  const [commissionPaid, setCommissionPaid] = useState("");

  // Auto-filled from selected invoice
  const [basicAmount, setBasicAmount] = useState("");
  const [gstAmount, setGstAmount] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");

  // Lock body scroll when panel open
  useEffect(() => {
    document.body.style.overflow = addOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [addOpen]);

  // Retailer dropdown options
  const retailerOptions = useMemo<SearchableDropdownOption[]>(
    () =>
      initialRetailers.map((r) => ({
        value: r.id,
        label: (r.name ?? "").trim() || "Untitled retailer",
      })),
    [initialRetailers]
  );

  // Invoices filtered by selected retailer
  const filteredInvoices = useMemo(
    () =>
      retailerId
        ? initialInvoices.filter((inv) => inv.retailer_id === retailerId)
        : [],
    [initialInvoices, retailerId]
  );

  const invoiceOptions = useMemo<SearchableDropdownOption[]>(
    () =>
      filteredInvoices.map((inv) => ({
        value: inv.id,
        label: inv.invoice_number,
      })),
    [filteredInvoices]
  );

  // Company lookup: invoice_id → company_id → company name
  const invoiceCompanyMap = useMemo(() =>
    new Map(initialInvoices.map(inv => [inv.id, inv.company_id])),
    [initialInvoices]
  );
  const companyNameMap = useMemo(() =>
    new Map(initialCompanies.map(co => [co.id, co.name ?? ""])),
    [initialCompanies]
  );
  const getCompanyName = (invoiceId: string) => {
    const companyId = invoiceCompanyMap.get(invoiceId);
    return companyId ? (companyNameMap.get(companyId) ?? "") : "";
  };

  const filteredCommissions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return commissions;
    return commissions.filter(c =>
      c.retailer_name?.toLowerCase().includes(q) ||
      c.invoice_number?.toLowerCase().includes(q) ||
      getCompanyName(c.invoice_id)?.toLowerCase().includes(q)
    );
  }, [commissions, searchQuery, invoiceCompanyMap, companyNameMap]);

  // When invoice is selected, auto-fill basic & gst amounts
  function handleInvoiceChange(id: string) {
    setInvoiceId(id);
    const inv = initialInvoices.find((i) => i.id === id);
    if (inv) {
      setInvoiceNumber(inv.invoice_number);
      setBasicAmount(String(inv.basic_amount ?? ""));
      setGstAmount(String(inv.gst_amount ?? ""));
      setCommissionPaid("");
    } else {
      setInvoiceNumber("");
      setBasicAmount("");
      setGstAmount("");
      setCommissionPaid("");
    }
  }

  // When retailer changes, reset invoice selection
  function handleRetailerChange(id: string) {
    setRetailerId(id);
    setInvoiceId("");
    setInvoiceNumber("");
    setBasicAmount("");
    setGstAmount("");
    setCommissionPaid("");
  }

  // Computed commission amount
  const commissionAmount = useMemo(() => {
    const basic = toNum(basicAmount);
    const pct = toNum(commissionPct);
    if (basic <= 0 || pct <= 0) return 0;
    return round2((basic * pct) / 100);
  }, [basicAmount, commissionPct]);

  const commissionPaidNum = useMemo(() => {
    const n = parseFloat(String(commissionPaid).replace(/,/g, "").trim());
    return round2(Number.isFinite(n) && n >= 0 ? n : 0);
  }, [commissionPaid]);

  const addFormStatusPreview = useMemo(
    () => commissionStatusFromPaidAmounts(commissionAmount, commissionPaidNum),
    [commissionAmount, commissionPaidNum]
  );

  function resetForm() {
    setRetailerId("");
    setInvoiceId("");
    setInvoiceNumber("");
    setBasicAmount("");
    setGstAmount("");
    setCommissionPct("");
    setCommissionPaid("");
  }

  function openAdd() {
    resetForm();
    setAddOpen(true);
  }

  function closeAdd() {
    setAddOpen(false);
  }

  async function handleSave() {
    if (!retailerId) return toastError("Please select a retailer.");
    if (!invoiceId) return toastError("Please select an invoice.");
    if (!commissionPct || toNum(commissionPct) <= 0)
      return toastError("Please enter a valid commission %.");

    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSaving(false);
      return toastError("You must be signed in.");
    }

    const selectedRetailer = initialRetailers.find((r) => r.id === retailerId);
    const payload = {
      user_id: user.id,
      retailer_id: retailerId,
      invoice_id: invoiceId,
      invoice_number: invoiceNumber,
      retailer_name: selectedRetailer?.name?.trim() ?? "",
      basic_amount: toNum(basicAmount),
      gst_amount: toNum(gstAmount),
      commission_percent: toNum(commissionPct),
      commission_amount: commissionAmount,
      commission_paid: commissionPaidNum,
      status: commissionStatusFromPaidAmounts(commissionAmount, commissionPaidNum),
    };

    const { data, error } = await supabase
      .from("commissions")
      .insert(payload)
      .select()
      .single();

    setSaving(false);

    if (error) return toastError(error.message);

    // Optimistically prepend the new record to the list
    setCommissions((prev) => [data as CommissionRow, ...prev]);
    toastSuccess("Commission saved.");
    closeAdd();
  }

  return (
    <div className="space-y-4">
      {/* Page header */}
      <section>
        <div className="mb-2 flex items-center gap-2.5">
          <div className="bg-accent h-5 w-1 shrink-0 rounded-full" />
          <h2 className="text-base font-bold tracking-tight text-zinc-900 dark:text-white">
            Commission
          </h2>
        </div>
        <p className="text-muted-foreground text-sm">
          Track and manage commission records here.
        </p>
      </section>

      {/* List */}
      <section>
        <h3 className="mb-3 font-semibold text-zinc-900 dark:text-white">
          Commission records
        </h3>

        {commissions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-700/60 bg-zinc-950/30 px-6 py-12 text-center">
            <p className="text-sm text-zinc-500">No commission records yet.</p>
            <button
              type="button"
              onClick={openAdd}
              className="mt-4 rounded-lg border border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-300 transition hover:bg-zinc-800"
            >
              Add your first commission
            </button>
          </div>
        ) : (
          <>
            <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search by retailer, invoice…" />
            {filteredCommissions.length === 0 ? (
              <p className="py-10 text-center text-sm text-zinc-500">No commissions match &ldquo;{searchQuery}&rdquo;</p>
            ) : (
          <ul className="flex flex-col gap-3">
            {filteredCommissions.map((c) => (
              <li key={c.id}>
                <div className="flex w-full items-stretch overflow-hidden rounded-2xl border border-zinc-800/80 bg-gradient-to-br from-zinc-950/95 to-zinc-900/50 shadow-[0_4px_24px_rgba(0,0,0,0.35)] ring-1 ring-white/[0.03]">
                  {/* Colour accent bar */}
                  <span
                    className="w-1.5 shrink-0 bg-gradient-to-b from-violet-400/90 to-violet-700/80"
                    aria-hidden
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-2 py-4 pl-3 pr-4 sm:pl-4">
                    {/* Top row: retailer + commission amount badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">
                          {c.retailer_name || "Unknown retailer"}
                        </p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <p className="text-xs text-zinc-400">Invoice: {c.invoice_number}</p>
                          {getCompanyName(c.invoice_id) && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-medium text-violet-300 ring-1 ring-violet-500/20">
                              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                <path d="M6 22V4a2 2 0 012-2h8a2 2 0 012 2v18M2 22h20"/>
                              </svg>
                              {getCompanyName(c.invoice_id)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ${
                            parseCommissionStatus(c.status) === "completed"
                              ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30"
                              : "bg-amber-500/15 text-amber-200 ring-amber-500/30"
                          }`}
                        >
                          {parseCommissionStatus(c.status) === "completed" ? "Completed" : "Pending"}
                        </span>
                        <div className="rounded-lg bg-violet-500/15 px-2.5 py-1 ring-1 ring-violet-500/25">
                          <p className="text-sm font-bold text-violet-200">
                            {formatInr(round2(Number(c.commission_amount)))}
                          </p>
                        </div>
                      </div>
                    </div>
                    {/* Bottom row: amounts + rate + date */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                      <span>Basic: <span className="text-zinc-300">{formatInr(round2(Number(c.basic_amount)))}</span></span>
                      <span>GST: <span className="text-zinc-300">{formatInr(round2(Number(c.gst_amount)))}</span></span>
                      <span>Rate: <span className="text-zinc-300">{c.commission_percent}%</span></span>
                      <span>
                        Received:{" "}
                        <span className="text-zinc-300">{formatInr(round2(Number(c.commission_paid ?? 0)))}</span>
                      </span>
                      <span className="ml-auto text-zinc-600">{formatDate(c.created_at)}</span>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
            )}
          </>
        )}
      </section>

      {/* Backdrop */}
      {addOpen && (
        <button
          type="button"
          aria-label="Close panel"
          onClick={closeAdd}
          className="fixed inset-0 z-[85] bg-black/55 backdrop-blur-sm"
        />
      )}

      {/* Slide-in panel */}
      <div
        className={`fixed inset-y-0 right-0 z-[90] flex w-full max-w-md flex-col border-l border-zinc-800 bg-[#16181f] shadow-2xl transition-transform duration-300 ease-out ${
          addOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Panel header */}
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-5 py-4">
          <h2 className="text-base font-semibold text-white">Add Commission</h2>
          <button
            type="button"
            onClick={closeAdd}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Panel body */}
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 py-5 pb-32">

          {/* Retailer */}
          <div>
            <label className={labelCls}>Retailer</label>
            <SearchableDropdown
              value={retailerId}
              onChange={handleRetailerChange}
              options={retailerOptions}
              placeholder="Select retailer"
              searchPlaceholder="Search retailer…"
              disabled={saving}
              aria-label="Select retailer"
            />
          </div>

          {/* Invoice No */}
          <div>
            <label className={labelCls}>Invoice No</label>
            <SearchableDropdown
              id="com-invoice"
              value={invoiceId}
              onChange={handleInvoiceChange}
              options={invoiceOptions}
              placeholder={retailerId ? "Select invoice" : "Select a retailer first"}
              searchPlaceholder="Search invoice…"
              disabled={saving || !retailerId}
              aria-label="Select invoice"
            />
          </div>

          {/* Basic Amount — read-only */}
          <div>
            <label className={labelCls} htmlFor="com-basic">Basic Amount</label>
            <input
              id="com-basic"
              className={inputCls}
              value={basicAmount ? `₹ ${basicAmount}` : ""}
              readOnly
              placeholder="Auto-filled from invoice"
              tabIndex={-1}
            />
          </div>

          {/* GST Amount — read-only */}
          <div>
            <label className={labelCls} htmlFor="com-gst">GST Amount</label>
            <input
              id="com-gst"
              className={inputCls}
              value={gstAmount ? `₹ ${gstAmount}` : ""}
              readOnly
              placeholder="Auto-filled from invoice"
              tabIndex={-1}
            />
          </div>

          {/* Commission % */}
          <div>
            <label className={labelCls} htmlFor="com-pct">Commission %</label>
            <div className="relative">
              <input
                id="com-pct"
                className={`${inputCls} pr-8`}
                inputMode="decimal"
                placeholder="e.g. 5"
                value={commissionPct}
                onChange={(e) => setCommissionPct(e.target.value)}
                disabled={saving}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
                %
              </span>
            </div>
          </div>

          {/* Commission due — computed */}
          <div className="rounded-xl border border-violet-500/20 bg-violet-500/[0.07] px-4 py-4">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-violet-400">
              Commission due
            </p>
            <p className="text-2xl font-bold tracking-tight text-white">
              {commissionAmount > 0
                ? formatInr(commissionAmount)
                : <span className="text-zinc-600">₹ —</span>}
            </p>
            {commissionAmount > 0 && (
              <p className="mt-1 text-xs text-zinc-500">
                {commissionPct}% of {formatInr(toNum(basicAmount))} (basic amount)
              </p>
            )}
          </div>

          {/* Commission received */}
          <div>
            <label className={labelCls} htmlFor="com-paid">
              Commission received
            </label>
            <input
              id="com-paid"
              className={inputCls}
              inputMode="decimal"
              placeholder="0"
              value={commissionPaid}
              onChange={(e) => setCommissionPaid(e.target.value)}
              disabled={saving}
            />
            <p className="text-muted-foreground mt-1 text-[11px] leading-snug">
              Status becomes completed when received ≥ commission due.
            </p>
          </div>

          {/* Status (derived) */}
          <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-950/50 px-3.5 py-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Status</span>
            <span
              className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                addFormStatusPreview === "completed"
                  ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30"
                  : "bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/30"
              }`}
            >
              {addFormStatusPreview === "completed" ? "Completed" : "Pending"}
            </span>
          </div>
        </div>

        {/* Panel footer */}
        <div className="shrink-0 border-t border-zinc-800 bg-[#16181f] px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || commissionAmount <= 0}
            className="w-full rounded-lg bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Commission"}
          </button>
        </div>
      </div>

      {/* FAB */}
      <button
        type="button"
        onClick={openAdd}
        aria-label="Add commission"
        className={`bg-accent text-accent-foreground fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full text-3xl shadow-[0_0_24px_rgba(167,139,250,0.35)] transition hover:scale-105 active:scale-95 md:bottom-10 md:right-10 ${
          addOpen ? "pointer-events-none opacity-0" : "opacity-100"
        }`}
      >
        +
      </button>
    </div>
  );
}
