"use client";

import { createClient } from "@/lib/supabase/client";
import { skipRequiredFieldValidation } from "@/lib/dev-validation";
import { toastError, toastSuccess } from "@/lib/toast";
import type { InvoiceGoodsReturnRow, RetailerInvoiceRow } from "@/types/invoice";
import { DatePicker } from "@/components/ui/date-picker";
import { useEffect, useMemo, useState } from "react";

type Props = {
  initialReturns: InvoiceGoodsReturnRow[];
  initialInvoices: RetailerInvoiceRow[];
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

function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

const inputCls =
  "bg-panel-field text-panel-foreground w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:border-amber-500/60";

export function ReturnsScreen({ initialReturns, initialInvoices, preselectedInvoiceId }: Props) {
  const [returns, setReturns] = useState(initialReturns);
  const [invoices] = useState(initialInvoices);
  const [saving, setSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const [invoiceId, setInvoiceId] = useState(preselectedInvoiceId ?? "");
  const [returnDate, setReturnDate] = useState(todayISODate());
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    document.body.style.overflow = addOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [addOpen]);

  const invoiceMap = useMemo(
    () =>
      new Map(
        invoices.map((i) => [i.id, `${i.retailer_name?.trim() || "Retailer"} · ${i.invoice_number}`])
      ),
    [invoices]
  );

  const visibleReturns = useMemo(
    () => (invoiceId ? returns.filter((r) => r.invoice_id === invoiceId) : returns),
    [returns, invoiceId]
  );

  function resetForm() {
    setEditingId(null);
    setReturnDate(todayISODate());
    setAmount("");
    setNote("");
  }

  function openAdd() {
    resetForm();
    setAddOpen(true);
  }

  function openEdit(row: InvoiceGoodsReturnRow) {
    setEditingId(row.id);
    setInvoiceId(row.invoice_id);
    setReturnDate(row.return_date || todayISODate());
    setAmount(String(Number(row.amount || 0)));
    setNote(row.note ?? "");
    setAddOpen(true);
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
    if (amt <= 0) return toastError("Enter return amount.");
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

    setReturns((p) =>
      editingId
        ? p.map((row) => (row.id === editingId ? (data as InvoiceGoodsReturnRow) : row))
        : [data as InvoiceGoodsReturnRow, ...p]
    );
    setSaving(false);
    resetForm();
    setAddOpen(false);
    toastSuccess(editingId ? "Goods return updated." : "Goods return added.");
  }

  return (
    <div className="space-y-4">
      <section>
        <div className="mb-2 flex items-center gap-2.5">
          <div className="bg-accent h-5 w-1 shrink-0 rounded-full" />
          <h2 className="text-base font-bold tracking-tight text-zinc-900 dark:text-white">Goods Return</h2>
        </div>
        <p className="text-muted-foreground mb-3 text-sm">
          Add and manage returns separately, mapped to retailer invoices.
        </p>
      </section>

      <section className="border-border bg-card rounded-2xl border p-4 shadow-sm">
        <h3 className="mb-3 font-semibold">Recent Goods Returns</h3>
        <ul className="space-y-2">
          {visibleReturns.map((r) => (
            <li key={r.id} className="rounded-lg border border-border px-3 py-2 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{invoiceMap.get(r.invoice_id) || "Invoice"}</p>
                  <p className="text-muted-foreground mt-0.5">
                    {r.return_date} · {formatInr(Number(r.amount))}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openEdit(r)}
                  className="rounded-md border border-border px-2 py-1 text-xs font-semibold hover:bg-muted"
                >
                  Edit
                </button>
              </div>
            </li>
          ))}
          {visibleReturns.length === 0 && <li className="text-sm text-muted-foreground">No returns yet.</li>}
        </ul>
      </section>

      <button
        type="button"
        aria-label="Close add return"
        className={`fixed inset-0 z-[85] bg-black/55 backdrop-blur-[2px] transition-opacity duration-300 ${
          addOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => !saving && setAddOpen(false)}
      />

      <div
        className={`bg-panel text-panel-foreground fixed inset-y-0 right-0 z-[90] flex w-full max-w-md flex-col shadow-2xl transition-transform duration-300 ease-out ${
          addOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="border-border flex items-center justify-between border-b px-4 py-4">
          <h3 className="text-lg font-bold">{editingId ? "Edit Goods Return" : "Add Goods Return"}</h3>
          <button type="button" onClick={() => !saving && setAddOpen(false)} className="rounded-lg p-2 hover:bg-black/5 dark:hover:bg-white/10">✕</button>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          <select className={inputCls} value={invoiceId} onChange={(e) => setInvoiceId(e.target.value)} disabled={saving}>
            <option value="">Select invoice</option>
            {invoices.map((i) => (
              <option key={i.id} value={i.id}>
                {invoiceMap.get(i.id)}
              </option>
            ))}
          </select>
          <DatePicker value={returnDate} onChange={setReturnDate} disabled={saving} className={inputCls} />
          <input className={inputCls} placeholder="Return amount" value={amount} onChange={(e) => setAmount(e.target.value)} disabled={saving} />
          <input className={inputCls} placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} disabled={saving} />
        </div>
        <div className="border-border border-t p-4">
          <button type="button" onClick={saveReturn} disabled={saving} className="bg-accent-secondary text-accent-secondary-foreground w-full rounded-lg px-4 py-3 text-sm font-semibold disabled:opacity-60">
            {saving ? "Saving..." : editingId ? "Save Changes" : "Add Return"}
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={openAdd}
        className="bg-accent text-accent-foreground fixed bottom-5 right-4 z-[75] flex h-14 w-14 items-center justify-center rounded-full text-3xl shadow-[0_0_24px_rgba(224,192,104,0.35)] transition hover:scale-105"
        aria-label="New return"
      >
        +
      </button>
    </div>
  );
}
