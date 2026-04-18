"use client";

import { DatePicker } from "@/components/ui/date-picker";
import { createClient } from "@/lib/supabase/client";
import { skipRequiredFieldValidation } from "@/lib/dev-validation";
import { toastError, toastSuccess } from "@/lib/toast";
import type { InvoiceGoodsReturnRow, RetailerInvoiceRow } from "@/types/invoice";
import { useEffect, useMemo, useState } from "react";

type Props = {
  invoices: RetailerInvoiceRow[];
  returns: InvoiceGoodsReturnRow[];
  loading: boolean;
  onReturnsChange: (next: InvoiceGoodsReturnRow[]) => void;
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
  "w-full rounded-xl border border-zinc-700/70 bg-zinc-900 px-3.5 py-3 text-[15px] text-white shadow-inner outline-none transition placeholder:text-zinc-500 focus:border-rose-500/45 focus:ring-2 focus:ring-rose-500/15";

function CreditNoteIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M20 7H9a5 5 0 1 0 0 10h8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 5 4 9l4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function RetailerCreditNotesPanel({ invoices, returns, loading, onReturnsChange }: Props) {
  const [saving, setSaving] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [invoiceId, setInvoiceId] = useState("");
  const [returnDate, setReturnDate] = useState(todayISODate());
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const invoiceMap = useMemo(
    () => new Map(invoices.map((i) => [i.id, `${i.invoice_number} · ${(i.bill_date ?? "").slice(0, 10)}`])),
    [invoices]
  );

  const sortedReturns = useMemo(
    () => [...returns].sort((a, b) => (b.return_date || "").localeCompare(a.return_date || "")),
    [returns]
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
    setReturnDate(todayISODate());
    setAmount("");
    setNote("");
  }

  function openAdd() {
    resetForm();
    if (!invoiceId && invoices[0]) setInvoiceId(invoices[0].id);
    setSheetOpen(true);
  }

  function openEdit(row: InvoiceGoodsReturnRow) {
    setEditingId(row.id);
    setInvoiceId(row.invoice_id);
    setReturnDate(row.return_date || todayISODate());
    setAmount(String(Number(row.amount || 0)));
    setNote(row.note ?? "");
    setSheetOpen(true);
  }

  async function saveReturn() {
    let invId = invoiceId;
    if (!invId && skipRequiredFieldValidation() && invoices[0]) {
      invId = invoices[0].id;
    }
    let amt = toNum(amount);
    if (!invId) return toastError("Select invoice.");
    if (amt <= 0 && skipRequiredFieldValidation()) {
      amt = 0.01;
    }
    if (amt <= 0) return toastError("Enter credit note amount.");
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
      return_date: returnDate || todayISODate(),
      amount: amt,
      note: note.trim() || null,
    };
    const query = editingId
      ? supabase.from("invoice_goods_returns").update(payload).eq("id", editingId).eq("user_id", user.id)
      : supabase.from("invoice_goods_returns").insert(payload);
    const { data, error } = await query.select().single();
    if (error) {
      setSaving(false);
      return toastError(error.message);
    }

    const row = data as InvoiceGoodsReturnRow;
    onReturnsChange(
      editingId ? returns.map((r) => (r.id === editingId ? row : r)) : [row, ...returns]
    );
    setSaving(false);
    resetForm();
    setSheetOpen(false);
    toastSuccess(editingId ? "Credit note updated." : "Credit note added.");
  }

  return (
    <section
      id="panel-retailer-credit-notes"
      role="tabpanel"
      aria-labelledby="tab-retailer-credit-notes"
      className="relative z-0"
    >
      <p className="mb-4 text-sm leading-relaxed text-zinc-400">
        Credit notes (goods returns) reduce outstanding on the linked invoice. Add or edit entries for this retailer.
      </p>

      <div className="overflow-hidden rounded-3xl border border-rose-400/15 bg-rose-500/[0.04] backdrop-blur-md">
        <div className="px-4 pb-1 pt-4 sm:px-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-rose-200/70">Credit notes</p>
        </div>
        {loading ? (
          <div className="flex items-center gap-3 px-5 py-10">
            <span
              className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-rose-400"
              aria-hidden
            />
            <p className="text-sm text-zinc-400">Loading credit notes…</p>
          </div>
        ) : invoices.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04] text-zinc-500">
              <CreditNoteIcon className="h-7 w-7" />
            </div>
            <p className="text-sm font-medium text-zinc-200">No invoices yet</p>
            <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-zinc-500">
              Create an invoice for this retailer before adding credit notes.
            </p>
          </div>
        ) : sortedReturns.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-400/25 bg-rose-500/10 text-rose-300/90">
              <CreditNoteIcon className="h-7 w-7" />
            </div>
            <p className="text-sm font-medium text-zinc-200">No credit notes yet</p>
            <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-zinc-500">
              Tap + to record a return or adjustment against an invoice.
            </p>
          </div>
        ) : (
          <ul className="space-y-2 p-2 sm:p-3">
            {sortedReturns.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.04] p-3.5 backdrop-blur-sm transition hover:border-white/[0.11] hover:bg-white/[0.07] sm:flex-nowrap sm:p-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-sm font-semibold tracking-tight text-rose-100/95">
                    {formatInr(Number(r.amount || 0))}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">{r.return_date}</p>
                  <p className="mt-0.5 text-xs text-violet-200/80">{invoiceMap.get(r.invoice_id) ?? "Invoice"}</p>
                  {r.note?.trim() ? <p className="mt-1 text-xs text-zinc-400">{r.note.trim()}</p> : null}
                </div>
                <button
                  type="button"
                  onClick={() => openEdit(r)}
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
        aria-label="Close credit note form"
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
          <h3 className="text-lg font-bold text-white">{editingId ? "Edit credit note" : "Add credit note"}</h3>
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
            <DatePicker value={returnDate} onChange={setReturnDate} disabled={saving} className={fieldCls} />
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
            onClick={() => void saveReturn()}
            disabled={saving || invoices.length === 0}
            className="w-full rounded-xl bg-rose-600 py-3 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:opacity-50"
          >
            {saving ? "Saving…" : editingId ? "Save changes" : "Add credit note"}
          </button>
        </div>
      </div>

      {invoices.length > 0 ? (
        <button
          type="button"
          onClick={openAdd}
          className="fixed bottom-5 right-4 z-[75] flex h-14 w-14 items-center justify-center rounded-full bg-rose-600 text-3xl font-light text-white shadow-[0_0_24px_rgba(225,29,72,0.35)] transition hover:scale-105 hover:bg-rose-500"
          aria-label="Add credit note"
        >
          +
        </button>
      ) : null}
    </section>
  );
}
