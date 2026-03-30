"use client";

import { createClient } from "@/lib/supabase/client";
import { toastError, toastSuccess } from "@/lib/toast";
import type { InvoiceCommissionRow, RetailerInvoiceRow } from "@/types/invoice";
import { useEffect, useMemo, useState } from "react";

type Props = {
  initialCommissions: InvoiceCommissionRow[];
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

const inputCls =
  "bg-panel-field text-panel-foreground w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:border-amber-500/60";

export function CommissionsScreen({
  initialCommissions,
  initialInvoices,
  preselectedInvoiceId,
}: Props) {
  const [commissions, setCommissions] = useState(initialCommissions);
  const [invoices] = useState(initialInvoices);
  const [saving, setSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const [invoiceId, setInvoiceId] = useState(preselectedInvoiceId ?? "");
  const [gstAmount, setGstAmount] = useState("");
  const [tspAmount, setTspAmount] = useState("");
  const [commissionPercent, setCommissionPercent] = useState("");
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

  const visibleCommissions = useMemo(
    () => (invoiceId ? commissions.filter((c) => c.invoice_id === invoiceId) : commissions),
    [commissions, invoiceId]
  );

  function resetForm() {
    setEditingId(null);
    setGstAmount("");
    setTspAmount("");
    setCommissionPercent("");
  }

  function openAdd() {
    resetForm();
    setAddOpen(true);
  }

  function openEdit(row: InvoiceCommissionRow) {
    setEditingId(row.id);
    setInvoiceId(row.invoice_id);
    setGstAmount(String(Number(row.gst_amount || 0)));
    setTspAmount(String(Number(row.tsp_amount || 0)));
    setCommissionPercent(String(Number(row.commission_percent || 0)));
    setAddOpen(true);
  }

  async function saveCommission() {
    if (!invoiceId) return toastError("Select invoice.");

    const gst = toNum(gstAmount);
    const tsp = toNum(tspAmount);
    const percent = toNum(commissionPercent);
    const inv = invoices.find((i) => i.id === invoiceId);
    if (!inv) return toastError("Invoice not found.");

    const total = Number(inv.total_amount || 0);
    const paid = Number(inv.payment_received || 0);
    const net = Math.max(0, total - paid - gst - tsp);
    const commissionAmount = (net * percent) / 100;

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
      total_amount: total,
      total_payment: paid,
      gst_amount: gst,
      tsp_amount: tsp,
      net_amount: net,
      commission_percent: percent,
      commission_amount: commissionAmount,
    };
    const query = editingId
      ? supabase.from("invoice_commissions").update(payload).eq("id", editingId).eq("user_id", user.id)
      : supabase.from("invoice_commissions").insert(payload);
    const { data, error } = await query.select().single();
    if (error) {
      setSaving(false);
      return toastError(error.message);
    }

    setCommissions((p) =>
      editingId
        ? p.map((row) => (row.id === editingId ? (data as InvoiceCommissionRow) : row))
        : [data as InvoiceCommissionRow, ...p]
    );
    setSaving(false);
    resetForm();
    setAddOpen(false);
    toastSuccess(editingId ? "Commission updated." : "Commission entry added.");
  }

  return (
    <div className="space-y-4">
      <section>
        <div className="mb-2 flex items-center gap-2.5">
          <div className="bg-accent h-5 w-1 shrink-0 rounded-full" />
          <h2 className="text-base font-bold tracking-tight text-zinc-900 dark:text-white">Commission</h2>
        </div>
        <p className="text-muted-foreground mb-3 text-sm">
          Add and manage commissions separately, mapped to retailer invoices.
        </p>
      </section>

      <section className="border-border bg-card rounded-2xl border p-4 shadow-sm">
        <h3 className="mb-3 font-semibold">Recent Commissions</h3>
        <ul className="space-y-2">
          {visibleCommissions.map((c) => (
            <li key={c.id} className="rounded-lg border border-border px-3 py-2 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{invoiceMap.get(c.invoice_id) || "Invoice"}</p>
                  <p className="text-muted-foreground mt-0.5">
                    Net {formatInr(Number(c.net_amount))} · {Number(c.commission_percent)}% · {formatInr(Number(c.commission_amount))}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openEdit(c)}
                  className="rounded-md border border-border px-2 py-1 text-xs font-semibold hover:bg-muted"
                >
                  Edit
                </button>
              </div>
            </li>
          ))}
          {visibleCommissions.length === 0 && <li className="text-sm text-muted-foreground">No commissions yet.</li>}
        </ul>
      </section>

      <button
        type="button"
        aria-label="Close add commission"
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
          <h3 className="text-lg font-bold">{editingId ? "Edit Commission" : "Add Commission"}</h3>
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
          <input className={inputCls} placeholder="GST Amt" value={gstAmount} onChange={(e) => setGstAmount(e.target.value)} disabled={saving} />
          <input className={inputCls} placeholder="TSP Amt" value={tspAmount} onChange={(e) => setTspAmount(e.target.value)} disabled={saving} />
          <input className={inputCls} placeholder="Percent %" value={commissionPercent} onChange={(e) => setCommissionPercent(e.target.value)} disabled={saving} />
        </div>
        <div className="border-border border-t p-4">
          <button type="button" onClick={saveCommission} disabled={saving} className="bg-accent-secondary text-accent-secondary-foreground w-full rounded-lg px-4 py-3 text-sm font-semibold disabled:opacity-60">
            {saving ? "Saving..." : editingId ? "Save Changes" : "Add Commission"}
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={openAdd}
        className="bg-accent text-accent-foreground fixed bottom-5 right-4 z-[75] flex h-14 w-14 items-center justify-center rounded-full text-3xl shadow-[0_0_24px_rgba(224,192,104,0.35)] transition hover:scale-105"
        aria-label="New commission"
      >
        +
      </button>
    </div>
  );
}
