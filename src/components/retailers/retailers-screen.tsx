"use client";

import { createClient } from "@/lib/supabase/client";
import { toastError, toastSuccess } from "@/lib/toast";
import { SwipeCompanyRow } from "@/components/companies/swipe-company-row";
import type { CompanyRow } from "@/types/company";
import type { RetailerInvoiceRow } from "@/types/invoice";
import { DatePicker } from "@/components/ui/date-picker";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type Props = {
  initialInvoices: RetailerInvoiceRow[];
  initialCompanies: CompanyRow[];
};

type Step = 1 | 2 | 3;

function formatInr(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);
}

function parseAmount(s: string): number {
  const v = parseFloat(s.replace(/,/g, ""));
  return Number.isFinite(v) ? v : 0;
}

function todayISODate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const panelInput =
  "bg-panel-field text-panel-foreground placeholder:text-panel-muted w-full rounded-lg border border-border px-3.5 py-3 text-[15px] outline-none transition focus:border-amber-600/60 focus:ring-1 focus:ring-amber-500/30 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700/80";

const panelLabel = "text-panel-foreground mb-1.5 block text-sm font-medium";

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
    </svg>
  );
}

export function RetailersScreen({ initialInvoices, initialCompanies }: Props) {
  const router = useRouter();
  const [invoices, setInvoices] = useState<RetailerInvoiceRow[]>(initialInvoices);
  const [companies] = useState<CompanyRow[]>(initialCompanies);

  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<Step>(1);
  const [deletePending, setDeletePending] = useState<RetailerInvoiceRow | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [retailerName, setRetailerName] = useState("");
  const [billDate, setBillDate] = useState(todayISODate());
  const [basicAmount, setBasicAmount] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [gstNo, setGstNo] = useState("");
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [cdAmount, setCdAmount] = useState("");

  useEffect(() => {
    setInvoices(initialInvoices);
  }, [initialInvoices]);

  const selectedCompany = useMemo(
    () => companies.find((c) => c.id === companyId),
    [companies, companyId]
  );

  useEffect(() => {
    if (selectedCompany?.gst_no) {
      setGstNo(selectedCompany.gst_no.toUpperCase());
    }
  }, [selectedCompany]);

  const { totalAmount } = useMemo(() => {
    const inv = parseAmount(invoiceAmount);
    const cd = parseAmount(cdAmount);
    const total = Math.max(0, inv - cd);
    return { totalAmount: total };
  }, [invoiceAmount, cdAmount]);

  useEffect(() => {
    document.body.style.overflow = addOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [addOpen]);

  function resetForm() {
    setStep(1);
    setInvoiceNumber("");
    setRetailerName("");
    setBillDate(todayISODate());
    setBasicAmount("");
    setCompanyId("");
    setGstNo("");
    setInvoiceAmount("");
    setCdAmount("");
  }

  function openAdd() {
    if (companies.length === 0) {
      toastError("Add a company first, then create an invoice.");
      return;
    }
    resetForm();
    setAddOpen(true);
  }

  function closeAdd() {
    if (saving) return;
    setAddOpen(false);
  }

  function validateStep1(): boolean {
    if (!retailerName.trim()) {
      toastError("Enter retailer name.");
      return false;
    }
    if (!invoiceNumber.trim()) {
      toastError("Enter bill / invoice number.");
      return false;
    }
    if (!billDate) {
      toastError("Select bill date.");
      return false;
    }
    if (!companyId) {
      toastError("Select company.");
      return false;
    }
    const gst = gstNo.trim().toUpperCase();
    if (gst.length > 0 && gst.length !== 15) {
      toastError("GST number must be 15 characters.");
      return false;
    }
    if (gst.length !== 15) {
      toastError("GST number must be 15 characters.");
      return false;
    }
    return true;
  }

  function validateStep2(): boolean {
    if (parseAmount(invoiceAmount) <= 0) {
      toastError("Enter invoice amount.");
      return false;
    }
    return true;
  }

  function buildPayload(isDraft: boolean) {
    const basic = parseAmount(basicAmount) || parseAmount(invoiceAmount);
    return {
      retailer_name: retailerName.trim(),
      invoice_number: invoiceNumber.trim(),
      bill_date: billDate,
      company_id: companyId,
      basic_amount: basic,
      gst_no: gstNo.trim() ? gstNo.trim().toUpperCase() : null,
      invoice_amount: parseAmount(invoiceAmount),
      transportation_amount: 0,
      cd_amount: parseAmount(cdAmount),
      total_amount: totalAmount,
      payment_received: 0,
      outstanding_amount: totalAmount,
      is_draft: isDraft,
    };
  }

  async function saveDraft() {
    if (!validateStep1()) return;
    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      toastError("You must be signed in.");
      return;
    }
    const payload = buildPayload(true);
    const { data, error } = await supabase
      .from("retailer_invoices")
      .insert({ ...payload, user_id: user.id })
      .select()
      .single();
    setSaving(false);
    if (error) {
      toastError(error.message);
      return;
    }
    setInvoices((prev) => [data as RetailerInvoiceRow, ...prev]);
    toastSuccess("Draft saved.");
    setAddOpen(false);
    resetForm();
    router.refresh();
  }

  async function submitInvoice() {
    if (!validateStep1() || !validateStep2()) return;
    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      toastError("You must be signed in.");
      return;
    }
    const payload = buildPayload(false);
    const { data, error } = await supabase
      .from("retailer_invoices")
      .insert({ ...payload, user_id: user.id })
      .select()
      .single();
    setSaving(false);
    if (error) {
      toastError(error.message);
      return;
    }
    setInvoices((prev) => [data as RetailerInvoiceRow, ...prev]);
    toastSuccess("Invoice submitted.");
    setAddOpen(false);
    resetForm();
    router.refresh();
  }

  function companyName(id: string) {
    return companies.find((c) => c.id === id)?.name ?? "—";
  }

  function continueStep1() {
    if (!validateStep1()) return;
    setStep(2);
  }

  function continueStep2() {
    if (!validateStep2()) return;
    setStep(3);
  }

  function requestDelete(inv: RetailerInvoiceRow) {
    if (deletingId) return;
    setDeletePending(inv);
  }

  function cancelDelete() {
    if (deletingId) return;
    setDeletePending(null);
  }

  async function confirmDelete() {
    const target = deletePending;
    if (!target || deletingId) return;
    setDeletingId(target.id);
    setDeletePending(null);
    const supabase = createClient();
    const { error } = await supabase.from("retailer_invoices").delete().eq("id", target.id);
    if (error) {
      setDeletingId(null);
      toastError(error.message);
      return;
    }
    setInvoices((prev) => prev.filter((i) => i.id !== target.id));
    setDeletingId(null);
    toastSuccess("Retailer invoice deleted.");
    router.refresh();
  }

  return (
    <div className="relative pb-28">
      <section>
        <div className="mb-4 flex items-center gap-2.5">
          <div className="bg-accent h-5 w-1 shrink-0 rounded-full" />
          <h2 className="text-base font-bold tracking-tight text-zinc-900 dark:text-white">Retailer invoices</h2>
        </div>
        <p className="text-muted-foreground mb-4 text-sm">
          Tap any invoice card to open Transport, Goods Return, Payment, and Commission sections.
        </p>

        {invoices.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-zinc-300 bg-white/80 px-5 py-10 text-center dark:border-zinc-600/80 dark:bg-card/80">
            <p className="font-semibold text-zinc-900 dark:text-white">No invoices yet</p>
            <p className="mt-1 max-w-xs text-sm text-zinc-500 dark:text-zinc-400">
              Tap <span className="font-medium text-zinc-700 dark:text-zinc-300">+</span> to create a new invoice.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {invoices.map((inv) => (
              <SwipeCompanyRow
                key={inv.id}
                onSwipeDelete={() => requestDelete(inv)}
                disabled={deletingId === inv.id || !!deletingId}
              >
                <Link
                  href={`/retailers/${inv.id}`}
                  className={`block p-4 ${
                    deletingId === inv.id ? "pointer-events-none opacity-60" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-zinc-900 dark:text-white">
                        {inv.retailer_name?.trim() || "Retailer"}
                      </p>
                      <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                        {inv.invoice_number} · {companyName(inv.company_id)} · {inv.bill_date}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                        inv.is_draft
                          ? "bg-amber-500/20 text-amber-700 dark:text-amber-400"
                          : "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                      }`}
                    >
                      {inv.is_draft ? "Draft" : "Submitted"}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 border-t border-zinc-200 pt-3 dark:border-zinc-600/60">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">Total</p>
                      <p className="mt-0.5 text-sm font-semibold text-zinc-900 dark:text-white">{formatInr(Number(inv.total_amount))}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Received</p>
                      <p className="mt-0.5 text-sm font-semibold text-zinc-900 dark:text-white">{formatInr(Number(inv.payment_received))}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">Due</p>
                      <p className="mt-0.5 text-sm font-semibold text-zinc-900 dark:text-white">{formatInr(Number(inv.outstanding_amount))}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <span className="inline-flex rounded-md border border-amber-300/70 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800 dark:border-amber-700/60 dark:bg-amber-900/30 dark:text-amber-200">
                      Manage Flow
                    </span>
                  </div>
                </Link>
              </SwipeCompanyRow>
            ))}
          </ul>
        )}
      </section>

      {deletePending && (
        <>
          <button
            type="button"
            aria-label="Close"
            className="fixed inset-0 z-[95] bg-black/55 backdrop-blur-[2px]"
            onClick={cancelDelete}
          />
          <div className="border-border bg-card fixed left-1/2 top-1/2 z-[100] w-[min(92vw,22rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border p-4 shadow-2xl">
            <h3 className="text-base font-bold">Delete retailer invoice?</h3>
            <p className="text-muted-foreground mt-2 text-sm">
              This will also delete mapped Transport, Goods Return, Payments, and Commission records.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={cancelDelete}
                className="border-border text-foreground flex-1 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted/70"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmDelete()}
                className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-500"
              >
                Delete
              </button>
            </div>
          </div>
        </>
      )}

      <button
        type="button"
        aria-label="Close add invoice"
        className={`fixed inset-0 z-[85] bg-black/55 backdrop-blur-[2px] transition-opacity duration-300 ${
          addOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={closeAdd}
      />

      <div
        className={`bg-panel text-panel-foreground fixed inset-y-0 right-0 z-[90] flex w-full max-w-md flex-col shadow-2xl transition-transform duration-300 ease-out ${
          addOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="border-border relative flex shrink-0 items-center justify-center border-b px-2 py-4">
            <button
              type="button"
              onClick={closeAdd}
              disabled={saving}
              className="text-panel-muted hover:bg-black/5 hover:text-panel-foreground dark:hover:bg-white/10 absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg transition disabled:opacity-50"
              aria-label="Close"
            >
              <ChevronLeftIcon />
            </button>
            <h2 className="text-panel-foreground px-12 text-center text-lg font-bold">
              {step === 1 ? "Retailer Details" : step === 2 ? "Invoice Amounts" : "Review & Submit"}
            </h2>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
            <div className="space-y-4">
              {step === 1 && (
                <>
              <div>
                <label htmlFor="inv-retailer" className={panelLabel}>
                  Retailer Name <span className="text-red-400">*</span>
                </label>
                <input
                  id="inv-retailer"
                  type="text"
                  value={retailerName}
                  onChange={(e) => setRetailerName(e.target.value)}
                  disabled={saving}
                  className={panelInput}
                  placeholder="Enter retailer name"
                  autoComplete="organization"
                />
              </div>

              <div>
                <label htmlFor="inv-no" className={panelLabel}>
                  Bill / Invoice No <span className="text-red-400">*</span>
                </label>
                <input
                  id="inv-no"
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  disabled={saving}
                  className={panelInput}
                  placeholder="Enter invoice number"
                  autoComplete="off"
                />
              </div>

              <div>
                <label htmlFor="inv-date" className={panelLabel}>
                  Bill Date <span className="text-red-400">*</span>
                </label>
                <DatePicker value={billDate} onChange={setBillDate} disabled={saving} className={panelInput} />
              </div>

              <div>
                <label htmlFor="inv-basic" className={panelLabel}>
                  Basic Amount <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <span className="text-panel-muted pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm">₹</span>
                  <input
                    id="inv-basic"
                    type="text"
                    inputMode="decimal"
                    value={basicAmount}
                    onChange={(e) => setBasicAmount(e.target.value)}
                    disabled={saving}
                    className={`${panelInput} pl-9`}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="inv-company" className={panelLabel}>
                  Company Name <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <select
                    id="inv-company"
                    value={companyId}
                    onChange={(e) => setCompanyId(e.target.value)}
                    disabled={saving}
                    className={`${panelInput} appearance-none pr-9`}
                  >
                    <option value="">Select company</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <svg
                    className="text-panel-muted pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
                  </svg>
                </div>
              </div>

              <div>
                <label htmlFor="inv-gst" className={panelLabel}>
                  GST Number <span className="text-red-400">*</span>
                </label>
                <input
                  id="inv-gst"
                  type="text"
                  value={gstNo}
                  onChange={(e) => setGstNo(e.target.value.toUpperCase())}
                  disabled={saving}
                  className={`${panelInput} font-mono uppercase`}
                  placeholder="29ABCDE1234F1Z5"
                  maxLength={15}
                />
                <p className="text-panel-muted mt-1.5 text-xs">15 characters</p>
              </div>
                </>
              )}

              {step === 2 && (
                <>
              <div className="relative py-2">
                <div className="border-border absolute inset-x-0 top-1/2 border-t" />
                <span className="text-panel-muted relative mx-auto block w-fit bg-panel px-3 text-center text-[11px] font-semibold uppercase tracking-[0.12em]">
                  Amount details
                </span>
              </div>

              <div>
                <label htmlFor="inv-amt" className={panelLabel}>
                  Invoice Amount <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <span className="text-panel-muted pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm">₹</span>
                  <input
                    id="inv-amt"
                    type="text"
                    inputMode="decimal"
                    value={invoiceAmount}
                    onChange={(e) => setInvoiceAmount(e.target.value)}
                    disabled={saving}
                    className={`${panelInput} pl-9`}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className={panelLabel}>Total Amount</label>
                <div className="bg-panel-field border-border flex items-center justify-between rounded-lg border px-3.5 py-3">
                  <span className="text-panel-muted text-[11px] font-semibold uppercase tracking-wide">Auto</span>
                  <span className="font-mono text-sm font-semibold">{formatInr(totalAmount)}</span>
                </div>
              </div>

              <div>
                <label htmlFor="inv-cd" className={panelLabel}>
                  CD (Cash Discount)
                </label>
                <input
                  id="inv-cd"
                  type="text"
                  inputMode="decimal"
                  value={cdAmount}
                  onChange={(e) => setCdAmount(e.target.value)}
                  disabled={saving}
                  className={panelInput}
                  placeholder="0"
                />
              </div>
                </>
              )}

              {step === 3 && (
              <div className="grid grid-cols-3 gap-2 pt-2">
                <div className="border-border bg-panel-field rounded-xl border px-2 py-3 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-cyan-600 dark:text-cyan-400">Total</p>
                  <p className="mt-1 text-sm font-bold text-zinc-900 dark:text-white">{formatInr(totalAmount)}</p>
                </div>
                <div className="border-border bg-panel-field rounded-xl border px-2 py-3 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">Received</p>
                  <p className="mt-1 text-sm font-bold text-zinc-900 dark:text-white">{formatInr(0)}</p>
                </div>
                <div className="border-border bg-panel-field rounded-xl border px-2 py-3 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">Due</p>
                  <p className="mt-1 text-sm font-bold text-zinc-900 dark:text-white">{formatInr(totalAmount)}</p>
                </div>
              </div>
              )}
            </div>
          </div>

          <div className="bg-panel border-border shrink-0 border-t px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={step === 1 ? saveDraft : () => setStep((s) => (Math.max(1, s - 1) as Step))}
                disabled={saving}
                className="border-border text-panel-foreground hover:bg-muted flex flex-1 items-center justify-center rounded-lg border bg-transparent px-4 py-3.5 text-sm font-semibold transition disabled:opacity-50"
              >
                {step === 1 ? "Save Draft" : "Back"}
              </button>
              <button
                type="button"
                onClick={step === 1 ? continueStep1 : step === 2 ? continueStep2 : submitInvoice}
                disabled={saving}
                className="bg-accent-secondary text-accent-secondary-foreground flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-3.5 text-sm font-semibold transition hover:brightness-105 disabled:opacity-50"
              >
                {saving ? "Saving…" : (
                  <>
                    {step === 3 ? "Submit" : "Continue"}
                    <ArrowRightIcon />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => (addOpen ? closeAdd() : openAdd())}
        className={`fixed bottom-5 right-4 z-[75] flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
          addOpen
            ? "rotate-90 bg-zinc-700 text-white hover:bg-zinc-600 dark:bg-zinc-600 dark:hover:bg-zinc-500"
            : "bg-accent text-accent-foreground shadow-[0_0_24px_rgba(224,192,104,0.35)] hover:scale-105 hover:shadow-xl active:scale-95"
        }`}
        aria-label={addOpen ? "Close" : "New invoice"}
      >
        {addOpen ? <CloseIcon /> : <PlusIcon className="h-7 w-7" />}
      </button>
    </div>
  );
}
