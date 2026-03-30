"use client";

import { createClient } from "@/lib/supabase/client";
import { toastError, toastSuccess } from "@/lib/toast";
import type { InvoiceTransportRow, RetailerInvoiceRow } from "@/types/invoice";
import { DatePicker } from "@/components/ui/date-picker";
import { useEffect, useMemo, useState } from "react";

type Props = {
  initialTransports: InvoiceTransportRow[];
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

export function TransportsScreen({ initialTransports, initialInvoices, preselectedInvoiceId }: Props) {
  const [transports, setTransports] = useState(initialTransports);
  const [invoices] = useState(initialInvoices);
  const [saving, setSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const [invoiceId, setInvoiceId] = useState(preselectedInvoiceId ?? "");
  const [transportName, setTransportName] = useState("");
  const [lrNo, setLrNo] = useState("");
  const [lrDate, setLrDate] = useState(todayISODate());
  const [amount, setAmount] = useState("");
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

  const visibleTransports = useMemo(
    () => (invoiceId ? transports.filter((t) => t.invoice_id === invoiceId) : transports),
    [transports, invoiceId]
  );

  function resetForm() {
    setEditingId(null);
    setTransportName("");
    setLrNo("");
    setLrDate(todayISODate());
    setAmount("");
  }

  function openAdd() {
    resetForm();
    setAddOpen(true);
  }

  function openEdit(row: InvoiceTransportRow) {
    setEditingId(row.id);
    setInvoiceId(row.invoice_id);
    setTransportName(row.transport_name ?? "");
    setLrNo(row.lr_no ?? "");
    setLrDate(row.lr_date ?? todayISODate());
    setAmount(String(Number(row.amount || 0)));
    setAddOpen(true);
  }

  async function saveTransport() {
    const amt = toNum(amount);
    if (!invoiceId) return toastError("Select invoice.");
    if (!transportName.trim()) return toastError("Enter transport name.");
    if (amt <= 0) return toastError("Enter transport amount.");
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
      invoice_id: invoiceId,
      transport_name: transportName.trim(),
      lr_no: lrNo.trim() || null,
      lr_date: lrDate || null,
      amount: amt,
    };
    const query = editingId
      ? supabase.from("invoice_transports").update(payload).eq("id", editingId).eq("user_id", user.id)
      : supabase.from("invoice_transports").insert(payload);
    const { data, error } = await query.select().single();
    if (error) {
      setSaving(false);
      return toastError(error.message);
    }

    // Keep invoice summary in sync.
    const [sumRes, invRes] = await Promise.all([
      supabase.from("invoice_transports").select("amount").eq("invoice_id", invoiceId),
      supabase.from("retailer_invoices").select("invoice_amount, cd_amount, payment_received").eq("id", invoiceId).single(),
    ]);
    if (!sumRes.error && !invRes.error && invRes.data) {
      const transportTotal = (sumRes.data ?? []).reduce((a, r) => a + Number(r.amount || 0), 0);
      const invoiceAmount = Number(invRes.data.invoice_amount || 0);
      const cdAmount = Number(invRes.data.cd_amount || 0);
      const paid = Number(invRes.data.payment_received || 0);
      const totalAmount = Math.max(0, invoiceAmount + transportTotal - cdAmount);
      const outstanding = Math.max(0, totalAmount - paid);
      await supabase
        .from("retailer_invoices")
        .update({
          transportation_amount: transportTotal,
          total_amount: totalAmount,
          outstanding_amount: outstanding,
          updated_at: new Date().toISOString(),
        })
        .eq("id", invoiceId);
    }

    setTransports((p) =>
      editingId
        ? p.map((row) => (row.id === editingId ? (data as InvoiceTransportRow) : row))
        : [data as InvoiceTransportRow, ...p]
    );
    setSaving(false);
    resetForm();
    setAddOpen(false);
    toastSuccess(editingId ? "Transport updated." : "Transport added.");
  }

  return (
    <div className="space-y-4">
      <section>
        <div className="mb-2 flex items-center gap-2.5">
          <div className="bg-accent h-5 w-1 shrink-0 rounded-full" />
          <h2 className="text-base font-bold tracking-tight text-zinc-900 dark:text-white">Transport</h2>
        </div>
        <p className="text-muted-foreground mb-3 text-sm">
          Add transport entries separately for retailer invoices.
        </p>
      </section>

      <section className="border-border bg-card rounded-2xl border p-4 shadow-sm">
        <h3 className="mb-3 font-semibold">Recent Transport Entries</h3>
        <ul className="space-y-2">
          {visibleTransports.map((t) => (
            <li key={t.id} className="rounded-lg border border-border px-3 py-2 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{invoiceMap.get(t.invoice_id) || "Invoice"}</p>
                  <p className="text-muted-foreground mt-0.5">
                    {t.lr_date || "—"} · {t.transport_name} · {formatInr(Number(t.amount))}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openEdit(t)}
                  className="rounded-md border border-border px-2 py-1 text-xs font-semibold hover:bg-muted"
                >
                  Edit
                </button>
              </div>
            </li>
          ))}
          {visibleTransports.length === 0 && <li className="text-sm text-muted-foreground">No transports yet.</li>}
        </ul>
      </section>

      <button
        type="button"
        aria-label="Close add transport"
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
          <h3 className="text-lg font-bold">{editingId ? "Edit Transport" : "Add Transport"}</h3>
          <button type="button" onClick={() => !saving && setAddOpen(false)} className="rounded-lg p-2 hover:bg-black/5 dark:hover:bg-white/10">
            ✕
          </button>
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
          <input className={inputCls} placeholder="Transport name" value={transportName} onChange={(e) => setTransportName(e.target.value)} disabled={saving} />
          <input className={inputCls} placeholder="LR No" value={lrNo} onChange={(e) => setLrNo(e.target.value)} disabled={saving} />
          <DatePicker value={lrDate} onChange={setLrDate} disabled={saving} className={inputCls} />
          <input className={inputCls} placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} disabled={saving} />
        </div>
        <div className="border-border border-t p-4">
          <button
            type="button"
            onClick={saveTransport}
            disabled={saving}
            className="bg-accent-secondary text-accent-secondary-foreground w-full rounded-lg px-4 py-3 text-sm font-semibold disabled:opacity-60"
          >
            {saving ? "Saving..." : editingId ? "Save Changes" : "Add Transport"}
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={openAdd}
        className="bg-accent text-accent-foreground fixed bottom-5 right-4 z-[75] flex h-14 w-14 items-center justify-center rounded-full text-3xl shadow-[0_0_24px_rgba(224,192,104,0.35)] transition hover:scale-105"
        aria-label="New transport"
      >
        +
      </button>
    </div>
  );
}
