"use client";

import { DatePicker } from "@/components/ui/date-picker";
import { createClient } from "@/lib/supabase/client";
import { skipRequiredFieldValidation } from "@/lib/dev-validation";
import { toastError, toastSuccess } from "@/lib/toast";
import type { InvoicePaymentRow, RetailerInvoiceRow } from "@/types/invoice";
import { useEffect, useMemo, useState } from "react";

type Props = {
  invoices: RetailerInvoiceRow[];
  payments: InvoicePaymentRow[];
  loading: boolean;
  onPaymentsChange: (next: InvoicePaymentRow[]) => void;
  onInvoicePatch: (invoiceId: string, patch: Pick<RetailerInvoiceRow, "payment_received" | "outstanding_amount" | "updated_at">) => void;
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

function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

const fieldCls =
  "w-full rounded-xl border border-zinc-700/70 bg-zinc-900 px-3.5 py-3 text-[15px] text-white shadow-inner outline-none transition placeholder:text-zinc-500 focus:border-indigo-500/45 focus:ring-2 focus:ring-indigo-500/15";

function PaymentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18" strokeLinecap="round" />
      <circle cx="8" cy="15" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function RetailerPaymentsPanel({
  invoices,
  payments,
  loading,
  onPaymentsChange,
  onInvoicePatch,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [invoiceId, setInvoiceId] = useState("");
  const [paymentDate, setPaymentDate] = useState(todayISODate());
  const [method, setMethod] = useState<InvoicePaymentRow["method"]>("UPI");
  const [amount, setAmount] = useState("");
  const [chequeNo, setChequeNo] = useState("");
  const [upiNo, setUpiNo] = useState("");
  const [upiRefNo, setUpiRefNo] = useState("");
  const [neftUtrNo, setNeftUtrNo] = useState("");
  const [note, setNote] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const invoiceMap = useMemo(
    () => new Map(invoices.map((i) => [i.id, `${i.invoice_number} · ${(i.bill_date ?? "").slice(0, 10)}`])),
    [invoices]
  );

  const sortedPayments = useMemo(
    () => [...payments].sort((a, b) => (b.payment_date || "").localeCompare(a.payment_date || "")),
    [payments]
  );

  useEffect(() => {
    document.body.style.overflow = sheetOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [sheetOpen]);

  function resetForm() {
    setEditingId(null);
    setInvoiceId(invoices[0]?.id ?? "");
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
    if (!invoiceId && invoices[0]) setInvoiceId(invoices[0].id);
    setSheetOpen(true);
  }

  function openEdit(row: InvoicePaymentRow) {
    setEditingId(row.id);
    setInvoiceId(row.invoice_id);
    setPaymentDate(row.payment_date || todayISODate());
    setMethod(row.method);
    setAmount(String(Number(row.amount || 0)));
    setChequeNo(row.cheque_no ?? "");
    setUpiNo(row.upi_no ?? "");
    setUpiRefNo(row.upi_ref_no ?? "");
    setNeftUtrNo(row.neft_utr_no ?? "");
    setNote(row.note ?? "");
    setSheetOpen(true);
  }

  async function syncInvoiceTotals(invId: string) {
    const supabase = createClient();
    const [sumRes, invRes] = await Promise.all([
      supabase.from("invoice_payments").select("amount").eq("invoice_id", invId),
      supabase.from("retailer_invoices").select("total_amount").eq("id", invId).single(),
    ]);
    if (sumRes.error || invRes.error || !invRes.data) return;
    const paid = (sumRes.data ?? []).reduce((a, r) => a + Number(r.amount || 0), 0);
    const total = Number(invRes.data.total_amount || 0);
    const outstanding = Math.max(0, total - paid);
    const updated_at = new Date().toISOString();
    await supabase
      .from("retailer_invoices")
      .update({
        payment_received: paid,
        outstanding_amount: outstanding,
        updated_at,
      })
      .eq("id", invId);
    onInvoicePatch(invId, { payment_received: paid, outstanding_amount: outstanding, updated_at });
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
    const query = editingId
      ? supabase.from("invoice_payments").update(payload).eq("id", editingId).eq("user_id", user.id)
      : supabase.from("invoice_payments").insert(payload);
    const { data, error } = await query.select().single();

    if (error) {
      setSaving(false);
      return toastError(error.message);
    }

    const row = data as InvoicePaymentRow;
    onPaymentsChange(
      editingId ? payments.map((p) => (p.id === editingId ? row : p)) : [row, ...payments]
    );
    await syncInvoiceTotals(invId);
    setSaving(false);
    resetForm();
    setSheetOpen(false);
    toastSuccess(editingId ? "Payment updated." : "Payment added.");
  }

  return (
    <section
      id="panel-retailer-payments"
      role="tabpanel"
      aria-labelledby="tab-retailer-payments"
      className="relative z-0"
    >
      <p className="mb-4 text-sm leading-relaxed text-zinc-400">
        Payments linked to this retailer&apos;s invoices. Invoice paid / outstanding totals refresh when you save.
      </p>

      <div className="overflow-hidden rounded-3xl border border-indigo-400/15 bg-indigo-500/[0.04] backdrop-blur-md">
        <div className="px-4 pb-1 pt-4 sm:px-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-200/75">Payments</p>
        </div>
        {loading ? (
          <div className="flex items-center gap-3 px-5 py-10">
            <span
              className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-indigo-400"
              aria-hidden
            />
            <p className="text-sm text-zinc-400">Loading payments…</p>
          </div>
        ) : invoices.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04] text-zinc-500">
              <PaymentIcon className="h-7 w-7" />
            </div>
            <p className="text-sm font-medium text-zinc-200">No invoices yet</p>
            <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-zinc-500">
              Create an invoice for this retailer before recording payments.
            </p>
          </div>
        ) : sortedPayments.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-indigo-400/25 bg-indigo-500/10 text-indigo-200/90">
              <PaymentIcon className="h-7 w-7" />
            </div>
            <p className="text-sm font-medium text-zinc-200">No payments yet</p>
            <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-zinc-500">
              Tap + to record UPI, NEFT, cheque, or cash against an invoice.
            </p>
          </div>
        ) : (
          <ul className="space-y-2 p-2 sm:p-3">
            {sortedPayments.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.04] p-3.5 backdrop-blur-sm transition hover:border-white/[0.11] hover:bg-white/[0.07] sm:flex-nowrap sm:p-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-sm font-semibold tabular-nums text-indigo-100/95">
                    {formatInr(Number(p.amount || 0))}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {p.payment_date} · {p.method}
                  </p>
                  <p className="mt-0.5 text-xs text-violet-200/80">{invoiceMap.get(p.invoice_id) ?? "Invoice"}</p>
                  {p.note?.trim() ? <p className="mt-1 text-xs text-zinc-400">{p.note.trim()}</p> : null}
                </div>
                <button
                  type="button"
                  onClick={() => openEdit(p)}
                  className="w-full shrink-0 rounded-xl bg-white/[0.1] px-3 py-2.5 text-sm font-medium text-white transition hover:bg-white/[0.16] sm:w-auto"
                >
                  Edit
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="button"
        aria-label="Close payment form"
        className={`fixed inset-0 z-[85] bg-black/55 backdrop-blur-[2px] transition-opacity duration-300 ${
          sheetOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => !saving && setSheetOpen(false)}
      />

      <div
        className={`fixed inset-y-0 right-0 z-[90] flex w-full max-w-md flex-col border-l border-white/[0.08] bg-[#0f1117] shadow-2xl transition-transform duration-300 ease-out ${
          sheetOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-4">
          <h3 className="text-lg font-bold text-white">{editingId ? "Edit payment" : "Add payment"}</h3>
          <button
            type="button"
            onClick={() => !saving && setSheetOpen(false)}
            className="rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-zinc-400">Invoice</span>
            <select
              className={fieldCls}
              value={invoiceId}
              onChange={(e) => setInvoiceId(e.target.value)}
              disabled={saving || invoices.length === 0}
            >
              <option value="">Select invoice</option>
              {invoices.map((i) => (
                <option key={i.id} value={i.id}>
                  {invoiceMap.get(i.id)}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-zinc-400">Date</span>
            <DatePicker value={paymentDate} onChange={setPaymentDate} disabled={saving} className={fieldCls} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-zinc-400">Method</span>
            <select
              className={fieldCls}
              value={method}
              onChange={(e) => setMethod(e.target.value as InvoicePaymentRow["method"])}
              disabled={saving}
            >
              <option>UPI</option>
              <option>NEFT</option>
              <option>Cheque</option>
              <option>Cash</option>
              <option>Other</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-zinc-400">Amount</span>
            <input
              className={fieldCls}
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={saving}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-zinc-400">Cheque no.</span>
            <input
              className={fieldCls}
              placeholder="Cheque no."
              value={chequeNo}
              onChange={(e) => setChequeNo(e.target.value)}
              disabled={saving}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-zinc-400">UPI no.</span>
            <input
              className={fieldCls}
              placeholder="UPI no."
              value={upiNo}
              onChange={(e) => setUpiNo(e.target.value)}
              disabled={saving}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-zinc-400">UPI ref no.</span>
            <input
              className={fieldCls}
              placeholder="UPI ref no."
              value={upiRefNo}
              onChange={(e) => setUpiRefNo(e.target.value)}
              disabled={saving}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-zinc-400">NEFT UTR</span>
            <input
              className={fieldCls}
              placeholder="NEFT UTR"
              value={neftUtrNo}
              onChange={(e) => setNeftUtrNo(e.target.value)}
              disabled={saving}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-zinc-400">Note (optional)</span>
            <input
              className={fieldCls}
              placeholder="Note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={saving}
            />
          </label>
        </div>
        <div className="border-t border-white/[0.08] p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => void savePayment()}
            disabled={saving || invoices.length === 0}
            className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
          >
            {saving ? "Saving…" : editingId ? "Save changes" : "Add payment"}
          </button>
        </div>
      </div>

      {invoices.length > 0 ? (
        <button
          type="button"
          onClick={openAdd}
          className="fixed bottom-5 right-4 z-[75] flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-3xl font-light text-white shadow-[0_0_24px_rgba(79,70,229,0.35)] transition hover:scale-105 hover:bg-indigo-500"
          aria-label="Add payment"
        >
          +
        </button>
      ) : null}
    </section>
  );
}
