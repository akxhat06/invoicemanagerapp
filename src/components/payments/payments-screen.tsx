"use client";

import { createClient } from "@/lib/supabase/client";
import { skipRequiredFieldValidation } from "@/lib/dev-validation";
import { toastError, toastSuccess } from "@/lib/toast";
import type { InvoicePaymentRow, RetailerInvoiceRow } from "@/types/invoice";
import { DatePicker } from "@/components/ui/date-picker";
import { SearchableDropdown, type SearchableDropdownOption } from "@/components/ui/searchable-dropdown";
import { useEffect, useMemo, useState } from "react";

type Props = {
  initialPayments: InvoicePaymentRow[];
  initialInvoices: RetailerInvoiceRow[];
  companyNameById: Record<string, string>;
  preselectedInvoiceId?: string;
};

function formatInr(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);
}

function toNum(v: string) {
  const n = parseFloat(v || "0");
  return Number.isFinite(n) ? n : 0;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

const inputCls =
  "bg-panel-field text-panel-foreground w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:border-amber-500/60";

const PAYMENT_METHOD_OPTIONS: SearchableDropdownOption[] = [
  { value: "UPI", label: "UPI" },
  { value: "NEFT", label: "NEFT" },
  { value: "Cheque", label: "Cheque" },
  { value: "Cash", label: "Cash" },
  { value: "Other", label: "Other" },
];

export function PaymentsScreen({
  initialPayments,
  initialInvoices,
  companyNameById,
  preselectedInvoiceId,
}: Props) {
  const [payments, setPayments] = useState(initialPayments);
  const [invoices] = useState(initialInvoices);
  const [saving, setSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const [invoiceId, setInvoiceId] = useState(preselectedInvoiceId ?? "");
  const [paymentDate, setPaymentDate] = useState(todayISODate());
  const [method, setMethod] = useState<InvoicePaymentRow["method"]>("UPI");
  const [amount, setAmount] = useState("");
  const [chequeNo, setChequeNo] = useState("");
  const [upiNo, setUpiNo] = useState("");
  const [upiRefNo, setUpiRefNo] = useState("");
  const [neftUtrNo, setNeftUtrNo] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    setPayments(initialPayments);
  }, [initialPayments]);

  useEffect(() => {
    document.body.style.overflow = addOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [addOpen]);

  const invoiceRowById = useMemo(() => new Map(invoices.map((i) => [i.id, i])), [invoices]);

  const invoiceSelectOptions = useMemo(
    () =>
      invoices.map((i) => ({
        value: i.id,
        label: `${i.retailer_name?.trim() || "Retailer"} · ${i.invoice_number}`,
      })),
    [invoices]
  );

  const visiblePayments = useMemo(
    () => (invoiceId ? payments.filter((p) => p.invoice_id === invoiceId) : payments),
    [payments, invoiceId]
  );

  /** Sum of payment rows per invoice (matches DB after quick-add without refetching invoices). */
  const paidTotalByInvoiceId = useMemo(() => {
    const m = new Map<string, number>();
    for (const pay of payments) {
      const id = pay.invoice_id;
      if (!id) continue;
      m.set(id, round2((m.get(id) ?? 0) + Number(pay.amount ?? 0)));
    }
    return m;
  }, [payments]);

  const selectedInvoice = useMemo(
    () => (invoiceId ? invoices.find((i) => i.id === invoiceId) : undefined),
    [invoices, invoiceId]
  );

  /** Sum of existing payment rows for the selected invoice (add-only flow on this screen). */
  const otherPaymentsTotal = useMemo(() => {
    if (!invoiceId) return 0;
    return round2(payments.filter((p) => p.invoice_id === invoiceId).reduce((a, p) => a + Number(p.amount ?? 0), 0));
  }, [payments, invoiceId]);

  const draftPaymentAmount = useMemo(() => round2(toNum(amount)), [amount]);

  const invoiceTotalAmount = selectedInvoice ? round2(Number(selectedInvoice.total_amount ?? 0)) : 0;

  const outstandingBeforeThisEntry = useMemo(() => {
    if (!selectedInvoice) return 0;
    return Math.max(0, round2(invoiceTotalAmount - otherPaymentsTotal));
  }, [selectedInvoice, invoiceTotalAmount, otherPaymentsTotal]);

  const outstandingAfterSave = useMemo(() => {
    if (!selectedInvoice) return 0;
    return Math.max(0, round2(invoiceTotalAmount - otherPaymentsTotal - draftPaymentAmount));
  }, [selectedInvoice, invoiceTotalAmount, otherPaymentsTotal, draftPaymentAmount]);

  const paymentExceedsOutstanding = useMemo(() => {
    if (!selectedInvoice || draftPaymentAmount <= 0) return false;
    return draftPaymentAmount > outstandingBeforeThisEntry + 0.005;
  }, [selectedInvoice, draftPaymentAmount, outstandingBeforeThisEntry]);

  useEffect(() => {
    if (preselectedInvoiceId) setInvoiceId(preselectedInvoiceId);
  }, [preselectedInvoiceId]);

  function resetForm() {
    setPaymentDate(todayISODate());
    setMethod("UPI");
    setAmount("");
    setChequeNo("");
    setUpiNo("");
    setUpiRefNo("");
    setNeftUtrNo("");
    setNote("");
  }

  function openAdd() {
    resetForm();
    setAddOpen(true);
  }

  async function savePayment() {
    let invId = invoiceId;
    if (!invId && skipRequiredFieldValidation() && invoices[0]) {
      invId = invoices[0].id;
    }
    let amt = toNum(amount);
    if (!invId) return toastError("Select invoice.");
    if (amt <= 0 && skipRequiredFieldValidation()) {
      amt = 0.01;
    }
    if (amt <= 0) return toastError("Enter payment amount.");

    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return toastError("You must be signed in.");
    }

    const payload = {
      user_id: user.id,
      invoice_id: invId,
      payment_date: paymentDate || todayISODate(),
      method,
      amount: amt,
      cheque_no: chequeNo.trim() || null,
      upi_no: upiNo.trim() || null,
      upi_ref_no: upiRefNo.trim() || null,
      neft_utr_no: neftUtrNo.trim() || null,
      note: note.trim() || null,
    };
    const query = supabase.from("invoice_payments").insert(payload);
    const { data, error } = await query.select().single();

    if (error) {
      setSaving(false);
      return toastError(error.message);
    }

    // Keep invoice summary fields in sync for list cards.
    const [sumRes, invRes] = await Promise.all([
      supabase.from("invoice_payments").select("amount").eq("invoice_id", invId),
      supabase.from("retailer_invoices").select("total_amount").eq("id", invId).single(),
    ]);
    if (!sumRes.error && !invRes.error && invRes.data) {
      const paid = (sumRes.data ?? []).reduce((a, r) => a + Number(r.amount || 0), 0);
      const total = Number(invRes.data.total_amount || 0);
      const outstanding = Math.max(0, total - paid);
      await supabase
        .from("retailer_invoices")
        .update({
          payment_received: paid,
          outstanding_amount: outstanding,
          updated_at: new Date().toISOString(),
        })
        .eq("id", invId);
    }

    setPayments((p) => [data as InvoicePaymentRow, ...p]);
    setSaving(false);
    resetForm();
    setAddOpen(false);
    toastSuccess("Payment added.");
  }

  return (
    <div className="space-y-4">
      <section>
        <div className="mb-2 flex items-center gap-2.5">
          <div className="bg-accent h-5 w-1 shrink-0 rounded-full" />
          <h2 className="text-base font-bold tracking-tight text-zinc-900 dark:text-white">Payments</h2>
        </div>
        <p className="text-muted-foreground text-sm">
          Quick-add payments here. To change an existing payment, open the company or retailer, edit the invoice, and use
          the Payment tab.
        </p>
      </section>

      <section>
        <h3 className="mb-3 font-semibold text-zinc-900 dark:text-white">Recent payments</h3>
        <ul className="flex flex-col gap-3">
          {visiblePayments.map((p) => {
            const inv = invoiceRowById.get(p.invoice_id);
            if (!inv) {
              const orphanAmt = round2(Number(p.amount ?? 0));
              return (
                <li key={p.id}>
                  <div className="flex w-full items-stretch overflow-hidden rounded-2xl border border-zinc-800/80 bg-gradient-to-br from-zinc-950/95 to-zinc-900/50 text-left shadow-[0_4px_24px_rgba(0,0,0,0.35)] ring-1 ring-white/[0.03]">
                    <span
                      className="w-1.5 shrink-0 bg-gradient-to-b from-amber-400/90 to-amber-700/80"
                      aria-hidden
                    />
                    <div className="flex min-w-0 flex-1 flex-col gap-1 py-4 pl-3 pr-4 sm:pl-4">
                      <p className="text-sm text-zinc-400">Invoice removed or unavailable</p>
                      <p className="font-mono text-sm text-amber-200/90">
                        {p.payment_date} · {p.method} · {formatInr(orphanAmt)}
                      </p>
                    </div>
                  </div>
                </li>
              );
            }
            const co = companyNameById[inv.company_id] ?? "—";
            const totalAmt = round2(Number(inv.total_amount ?? 0));
            const paidTotal = paidTotalByInvoiceId.get(inv.id) ?? round2(Number(inv.payment_received ?? 0));
            return (
              <li key={p.id}>
                <div className="flex w-full items-stretch overflow-hidden rounded-2xl border border-zinc-800/80 bg-gradient-to-br from-zinc-950/95 to-zinc-900/50 text-left shadow-[0_4px_24px_rgba(0,0,0,0.35)] ring-1 ring-white/[0.03]">
                  <span
                    className="w-1.5 shrink-0 bg-gradient-to-b from-amber-400/90 to-amber-700/80"
                    aria-hidden
                  />
                  <div className="flex min-w-0 flex-1 items-center gap-3 py-4 pl-3 pr-4 sm:gap-4 sm:pl-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-[15px] font-semibold tracking-tight text-white sm:text-base">
                        {inv.invoice_number}
                      </p>
                      <p className="mt-1 text-sm text-zinc-400">
                        {inv.retailer_name?.trim() || "Retailer"} <span className="text-zinc-600">·</span> {co}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {(p.payment_date || "").slice(0, 10)} · {p.method}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2 text-right">
                      <div>
                        <span className="font-mono text-sm font-semibold tabular-nums tracking-tight text-amber-200 sm:text-[15px]">
                          {formatInr(totalAmt)}
                        </span>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">Total amount</p>
                      </div>
                      <div>
                        <span className="font-mono text-sm font-semibold tabular-nums tracking-tight text-emerald-200/95 sm:text-[15px]">
                          {formatInr(paidTotal)}
                        </span>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">Paid</p>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
          {visiblePayments.length === 0 ? (
            <li className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/40 px-4 py-10 text-center text-sm text-zinc-500">
              No payments yet.
            </li>
          ) : null}
        </ul>
      </section>

      <button
        type="button"
        aria-label="Close add payment"
        className={`fixed inset-0 z-[85] bg-black/55 backdrop-blur-[2px] transition-opacity duration-300 ${
          addOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => !saving && setAddOpen(false)}
      />

      <div
        className={`bg-panel text-panel-foreground fixed inset-y-0 right-0 z-[90] flex h-dvh max-h-dvh min-h-0 w-full max-w-md flex-col shadow-2xl transition-transform duration-300 ease-out ${
          addOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="border-border flex shrink-0 items-center justify-between border-b px-4 py-4">
          <h3 className="text-lg font-bold">Add Payment</h3>
          <button type="button" onClick={() => !saving && setAddOpen(false)} className="rounded-lg p-2 hover:bg-black/5 dark:hover:bg-white/10">✕</button>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4">
          <div>
            <label className="text-muted-foreground mb-1.5 block text-xs font-semibold uppercase tracking-wide">
              Invoice
            </label>
            <SearchableDropdown
              value={invoiceId}
              onChange={setInvoiceId}
              options={invoiceSelectOptions}
              placeholder="Select invoice"
              searchPlaceholder="Search invoice…"
              disabled={saving}
              triggerClassName={inputCls}
              placeholderClassName="text-muted-foreground"
              valueClassName="text-foreground"
              inputBackground="transparent"
              menuZIndex={350}
            />
          </div>

          {selectedInvoice ? (
            <div className="bg-muted/50 space-y-2 rounded-xl border border-border px-3 py-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Invoice amount</span>
                <span className="font-mono font-semibold tabular-nums text-foreground">{formatInr(invoiceTotalAmount)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Paid (other entries)</span>
                <span className="font-mono tabular-nums text-foreground">{formatInr(otherPaymentsTotal)}</span>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-border pt-2">
                <span className="text-muted-foreground">Outstanding (before this payment)</span>
                <span className="font-mono font-semibold tabular-nums text-foreground">{formatInr(outstandingBeforeThisEntry)}</span>
              </div>
            </div>
          ) : null}

          <DatePicker value={paymentDate} onChange={setPaymentDate} disabled={saving} className={inputCls} />
          <SearchableDropdown
            value={method}
            onChange={(v) => setMethod(v as InvoicePaymentRow["method"])}
            options={PAYMENT_METHOD_OPTIONS}
            placeholder="Method"
            disabled={saving}
            showSearch={false}
            allowClear={false}
            triggerClassName={inputCls}
            placeholderClassName="text-muted-foreground"
            valueClassName="text-foreground"
            inputBackground="transparent"
            menuZIndex={350}
          />
          <div>
            <label className="text-muted-foreground mb-1.5 block text-xs font-semibold uppercase tracking-wide" htmlFor="payment-amount-input">
              Payment amount
            </label>
            <input
              id="payment-amount-input"
              className={inputCls}
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={saving}
            />
            {selectedInvoice ? (
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">Outstanding after save</span>
                  <span
                    className={`font-mono font-semibold tabular-nums ${
                      paymentExceedsOutstanding ? "text-amber-600 dark:text-amber-400" : "text-foreground"
                    }`}
                  >
                    {formatInr(outstandingAfterSave)}
                  </span>
                </div>
                {paymentExceedsOutstanding ? (
                  <p className="text-xs text-amber-700 dark:text-amber-400/90">
                    This payment is more than the current outstanding balance.
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
          <input className={inputCls} placeholder="Cheque No" value={chequeNo} onChange={(e) => setChequeNo(e.target.value)} disabled={saving} />
          <input className={inputCls} placeholder="UPI No" value={upiNo} onChange={(e) => setUpiNo(e.target.value)} disabled={saving} />
          <input className={inputCls} placeholder="UPI Ref No" value={upiRefNo} onChange={(e) => setUpiRefNo(e.target.value)} disabled={saving} />
          <input className={inputCls} placeholder="NEFT UTR No" value={neftUtrNo} onChange={(e) => setNeftUtrNo(e.target.value)} disabled={saving} />
          <input className={inputCls} placeholder="Note" value={note} onChange={(e) => setNote(e.target.value)} disabled={saving} />
        </div>
        <div className="bg-panel border-border shrink-0 border-t px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button type="button" onClick={savePayment} disabled={saving} className="bg-accent-secondary text-accent-secondary-foreground w-full rounded-lg px-4 py-3 text-sm font-semibold disabled:opacity-60">
            {saving ? "Saving..." : "Add Payment"}
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={openAdd}
        aria-label="Add payment"
        className={`bg-accent text-accent-foreground fixed bottom-24 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full text-3xl shadow-[0_0_24px_rgba(224,192,104,0.35)] transition hover:scale-105 active:scale-95 md:bottom-10 md:right-10 ${
          addOpen ? "pointer-events-none opacity-0" : "opacity-100"
        }`}
      >
        +
      </button>
    </div>
  );
}
