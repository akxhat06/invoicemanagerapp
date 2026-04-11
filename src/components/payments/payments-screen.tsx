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

const PAYMENT_METHOD_OPTIONS: SearchableDropdownOption[] = [
  { value: "UPI", label: "UPI" },
  { value: "NEFT", label: "NEFT" },
  { value: "Cheque", label: "Cheque" },
  { value: "Cash", label: "Cash" },
  { value: "Other", label: "Other" },
];

export function PaymentsScreen({ initialPayments, initialInvoices, preselectedInvoiceId }: Props) {
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
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    setPayments(initialPayments);
  }, [initialPayments]);

  useEffect(() => {
    document.body.style.overflow = addOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [addOpen]);

  const invoiceMap = useMemo(
    () =>
      new Map(
        invoices.map((i) => [
          i.id,
          `${i.retailer_name?.trim() || "Retailer"} · ${i.invoice_number}`,
        ])
      ),
    [invoices]
  );

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

  function resetForm() {
    setEditingId(null);
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
    const query = editingId
      ? supabase.from("invoice_payments").update(payload).eq("id", editingId).eq("user_id", user.id)
      : supabase.from("invoice_payments").insert(payload);
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

    setPayments((p) =>
      editingId
        ? p.map((row) => (row.id === editingId ? (data as InvoicePaymentRow) : row))
        : [data as InvoicePaymentRow, ...p]
    );
    setSaving(false);
    resetForm();
    setAddOpen(false);
    toastSuccess(editingId ? "Payment updated." : "Payment added.");
  }

  return (
    <div className="space-y-4">
      <section>
        <div className="mb-2 flex items-center gap-2.5">
          <div className="bg-accent h-5 w-1 shrink-0 rounded-full" />
          <h2 className="text-base font-bold tracking-tight text-zinc-900 dark:text-white">Payments</h2>
        </div>
        <p className="text-muted-foreground mb-3 text-sm">
          Add payment entries separately for retailer invoices.
        </p>
      </section>

      <section className="border-border bg-card rounded-2xl border p-4 shadow-sm">
        <h3 className="mb-3 font-semibold">Recent Payments</h3>
        <ul className="space-y-2">
          {visiblePayments.map((p) => (
            <li key={p.id} className="rounded-lg border border-border px-3 py-2 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{invoiceMap.get(p.invoice_id) || "Invoice"}</p>
                  <p className="text-muted-foreground mt-0.5">
                    {p.payment_date} · {p.method} · {formatInr(Number(p.amount))}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openEdit(p)}
                  className="rounded-md border border-border px-2 py-1 text-xs font-semibold hover:bg-muted"
                >
                  Edit
                </button>
              </div>
            </li>
          ))}
          {visiblePayments.length === 0 && <li className="text-sm text-muted-foreground">No payments yet.</li>}
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
        className={`bg-panel text-panel-foreground fixed inset-y-0 right-0 z-[90] flex w-full max-w-md flex-col shadow-2xl transition-transform duration-300 ease-out ${
          addOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="border-border flex items-center justify-between border-b px-4 py-4">
          <h3 className="text-lg font-bold">{editingId ? "Edit Payment" : "Add Payment"}</h3>
          <button type="button" onClick={() => !saving && setAddOpen(false)} className="rounded-lg p-2 hover:bg-black/5 dark:hover:bg-white/10">✕</button>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
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
          <input className={inputCls} placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} disabled={saving} />
          <input className={inputCls} placeholder="Cheque No" value={chequeNo} onChange={(e) => setChequeNo(e.target.value)} disabled={saving} />
          <input className={inputCls} placeholder="UPI No" value={upiNo} onChange={(e) => setUpiNo(e.target.value)} disabled={saving} />
          <input className={inputCls} placeholder="UPI Ref No" value={upiRefNo} onChange={(e) => setUpiRefNo(e.target.value)} disabled={saving} />
          <input className={inputCls} placeholder="NEFT UTR No" value={neftUtrNo} onChange={(e) => setNeftUtrNo(e.target.value)} disabled={saving} />
          <input className={inputCls} placeholder="Note" value={note} onChange={(e) => setNote(e.target.value)} disabled={saving} />
        </div>
        <div className="border-border border-t p-4">
          <button type="button" onClick={savePayment} disabled={saving} className="bg-accent-secondary text-accent-secondary-foreground w-full rounded-lg px-4 py-3 text-sm font-semibold disabled:opacity-60">
            {saving ? "Saving..." : editingId ? "Save Changes" : "Add Payment"}
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={openAdd}
        className="bg-accent text-accent-foreground fixed bottom-5 right-4 z-[75] flex h-14 w-14 items-center justify-center rounded-full text-3xl shadow-[0_0_24px_rgba(224,192,104,0.35)] transition hover:scale-105"
        aria-label="New payment"
      >
        +
      </button>
    </div>
  );
}
