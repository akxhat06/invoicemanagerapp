"use client";

import { createClient } from "@/lib/supabase/client";
import { DatePicker } from "@/components/ui/date-picker";
import { skipRequiredFieldValidation } from "@/lib/dev-validation";
import { toastError, toastSuccess } from "@/lib/toast";
import type { CompanyRow } from "@/types/company";
import type { InvoiceTransportRow, RetailerInvoiceRow } from "@/types/invoice";
import type { RetailerRow } from "@/types/retailer";
import { useCallback, useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";

const INPUT_BG = "#1E1E24";

function fieldClassDark(multiline = false) {
  return [
    "w-full rounded-xl border border-white/10 bg-[#1E1E24] px-3.5 py-3 text-[15px] text-white shadow-inner outline-none transition",
    "placeholder:text-zinc-500 hover:border-white/15 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/15",
    multiline ? "min-h-[80px] resize-y" : "",
  ].join(" ");
}

const labelDark = "mb-1.5 block text-sm font-medium text-zinc-100";

const SECTION_WRAP =
  "rounded-2xl border border-zinc-800/70 bg-zinc-950/45 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ring-1 ring-white/[0.03] sm:p-5";
const SECTION_TITLE = "mb-4 text-[11px] font-bold uppercase tracking-[0.16em] text-amber-200/85";

function todayISODate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toNum(s: string): number {
  const n = parseFloat(String(s).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function gstPercentFromAmounts(basic: number, gstAmt: number): string {
  if (basic <= 0 || gstAmt < 0) return "";
  return String(round2((gstAmt / basic) * 100));
}

function firstTransportForInvoice(transports: InvoiceTransportRow[], invoiceId: string): InvoiceTransportRow | null {
  const rows = transports.filter((t) => t.invoice_id === invoiceId).sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  return rows[0] ?? null;
}

function parseQuantityInput(s: string): number {
  const n = parseInt(String(s).trim().replace(/\D/g, ""), 10);
  if (!Number.isFinite(n) || n < 1) return 0;
  return Math.min(n, 999_999);
}

function formatInr(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(
    Number.isFinite(n) ? n : 0
  );
}

export type InvoiceEditFormProps = {
  invoice: RetailerInvoiceRow;
  companies: CompanyRow[];
  /** When provided, skips fetching retailers (e.g. Invoices workspace). */
  retailers?: RetailerRow[];
  /** When provided, skips fetching transports for this invoice. */
  transports?: InvoiceTransportRow[];
  onSaved: (row: RetailerInvoiceRow) => void;
  onCancel: () => void;
};

export function InvoiceEditForm({
  invoice,
  companies,
  retailers: retailersProp,
  transports: transportsProp,
  onSaved,
  onCancel,
}: InvoiceEditFormProps) {
  const [retailers, setRetailers] = useState<RetailerRow[]>(retailersProp ?? []);
  const [transports, setTransports] = useState<InvoiceTransportRow[]>(transportsProp ?? []);
  const [loadingRefs, setLoadingRefs] = useState(!retailersProp || !transportsProp);

  const [saving, setSaving] = useState(false);
  const [companyId, setCompanyId] = useState("");
  const [retailerId, setRetailerId] = useState("");
  const [billDate, setBillDate] = useState(todayISODate());
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [basicAmount, setBasicAmount] = useState("");
  const [gstPercent, setGstPercent] = useState("");
  const [transportName, setTransportName] = useState("");
  const [lrNo, setLrNo] = useState("");
  const [lrDate, setLrDate] = useState(todayISODate());
  const [transportAmount, setTransportAmount] = useState("");

  const inputStyle = { backgroundColor: INPUT_BG } as CSSProperties;

  useEffect(() => {
    if (retailersProp) setRetailers(retailersProp);
  }, [retailersProp]);

  useEffect(() => {
    if (transportsProp) setTransports(transportsProp);
  }, [transportsProp]);

  useEffect(() => {
    if (retailersProp && transportsProp) {
      setLoadingRefs(false);
      return;
    }
    let cancelled = false;
    setLoadingRefs(true);
    (async () => {
      const supabase = createClient();
      if (!retailersProp) {
        const { data } = await supabase.from("retailers").select("*").order("name", { ascending: true });
        if (!cancelled) setRetailers((data ?? []) as RetailerRow[]);
      }
      if (!transportsProp) {
        const { data } = await supabase.from("invoice_transports").select("*").eq("invoice_id", invoice.id);
        if (!cancelled) setTransports((data ?? []) as InvoiceTransportRow[]);
      }
      if (!cancelled) setLoadingRefs(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [invoice.id, retailersProp, transportsProp]);

  const retailerMap = useMemo(() => new Map(retailers.map((r) => [r.id, r])), [retailers]);

  const hydrateFromInvoice = useCallback(
    (inv: RetailerInvoiceRow, tr: InvoiceTransportRow[]) => {
      setCompanyId(inv.company_id);
      setRetailerId(inv.retailer_id ?? "");
      setBillDate(inv.bill_date?.slice(0, 10) ?? todayISODate());
      setInvoiceNumber(inv.invoice_number ?? "");
      setQuantity(String(Math.max(1, Math.floor(Number(inv.quantity ?? 1)))));
      const basic = Number(inv.basic_amount ?? 0);
      const gstAmt = Number(inv.gst_amount ?? 0);
      setBasicAmount(String(basic));
      setGstPercent(gstPercentFromAmounts(basic, gstAmt));
      const t = firstTransportForInvoice(tr, inv.id);
      if (t) {
        setTransportName(t.transport_name ?? "");
        setLrNo(t.lr_no ?? "");
        setLrDate(t.lr_date?.slice(0, 10) ?? todayISODate());
        setTransportAmount(String(Number(t.amount ?? 0)));
      } else {
        setTransportName("");
        setLrNo("");
        setLrDate(todayISODate());
        setTransportAmount(String(Number(inv.transportation_amount ?? 0)));
      }
    },
    []
  );

  useEffect(() => {
    if (loadingRefs) return;
    hydrateFromInvoice(invoice, transports);
  }, [invoice, transports, loadingRefs, hydrateFromInvoice]);

  function validateInvoiceStep(): boolean {
    if (skipRequiredFieldValidation()) return true;
    if (!companyId) {
      toastError("Select company.");
      return false;
    }
    if (!retailerId) {
      toastError("Select retailer.");
      return false;
    }
    if (!billDate) {
      toastError("Select invoice date.");
      return false;
    }
    if (!invoiceNumber.trim()) {
      toastError("Enter invoice number.");
      return false;
    }
    const qty = parseQuantityInput(quantity);
    if (!skipRequiredFieldValidation() && qty < 1) {
      toastError("Enter quantity (whole number, at least 1).");
      return false;
    }
    if (toNum(basicAmount) <= 0) {
      toastError("Enter base amount.");
      return false;
    }
    const pct = toNum(gstPercent);
    if (pct < 0 || pct > 100) {
      toastError("GST % must be between 0 and 100.");
      return false;
    }
    if (!gstPercent.trim() && !skipRequiredFieldValidation()) {
      toastError("Enter GST % (use 0 if exempt).");
      return false;
    }
    return true;
  }

  function validateForm(): boolean {
    if (!validateInvoiceStep()) return false;
    if (skipRequiredFieldValidation()) return true;
    if (toNum(transportAmount) < 0) {
      toastError("Transport amount cannot be negative.");
      return false;
    }
    const tn = transportName.trim();
    const ta = toNum(transportAmount);
    if (ta > 0 && !tn) {
      toastError("Enter transport name when amount is set.");
      return false;
    }
    if (tn && ta <= 0 && !skipRequiredFieldValidation()) {
      toastError("Enter transport amount when name is set.");
      return false;
    }
    return true;
  }

  async function syncTransportForInvoice(
    invoiceId: string,
    userId: string,
    transportAmt: number
  ): Promise<{ error: Error | null }> {
    const supabase = createClient();
    const tName = transportName.trim();
    await supabase.from("invoice_transports").delete().eq("invoice_id", invoiceId);

    const wantsRow = tName.length > 0 || transportAmt > 0 || lrNo.trim();
    if (!wantsRow) {
      return { error: null };
    }

    if (!tName.trim()) {
      return { error: new Error("Transport name is required when adding transport details.") };
    }
    if (transportAmt <= 0 && !skipRequiredFieldValidation()) {
      return { error: new Error("Enter transport amount.") };
    }
    const amt = transportAmt > 0 ? transportAmt : skipRequiredFieldValidation() ? 0.01 : 0;

    const { error } = await supabase.from("invoice_transports").insert({
      user_id: userId,
      invoice_id: invoiceId,
      transport_name: tName.trim(),
      lr_no: lrNo.trim() || null,
      lr_date: lrDate || null,
      amount: amt,
    });

    if (error) return { error: new Error(error.message) };
    return { error: null };
  }

  function buildInvoicePayload(
    userId: string,
    retailer: RetailerRow,
    company: CompanyRow,
    paymentReceived: number
  ) {
    const dev = skipRequiredFieldValidation();
    const basic = round2(toNum(basicAmount));
    const pct = toNum(gstPercent);
    const gstAmt = round2((basic * pct) / 100);
    const invAmt = round2(basic + gstAmt);
    const transportAmt = round2(toNum(transportAmount));
    const total = round2(invAmt + transportAmt);
    const paid = round2(paymentReceived);
    const outstanding = Math.max(0, round2(total - paid));

    const qty = Math.max(1, parseQuantityInput(quantity) || 1);

    return {
      user_id: userId,
      company_id: companyId,
      retailer_id: retailerId || null,
      quantity: qty,
      retailer_name: retailer.name ?? "",
      retailer_address: retailer.address ?? "",
      contact_no: retailer.contact_no ?? "",
      gst_no: company.gst_no?.trim() || retailer.gst_no?.trim() || null,
      invoice_number: invoiceNumber.trim() || (dev ? "DEV-INV" : ""),
      bill_date: billDate || (dev ? todayISODate() : ""),
      basic_amount: dev && basic <= 0 ? 0.01 : basic,
      gst_amount: dev && gstAmt < 0 ? 0 : gstAmt,
      invoice_amount: dev && invAmt <= 0 ? 0.01 : invAmt,
      transportation_amount: Math.max(0, transportAmt),
      cd_amount: 0,
      total_amount: total,
      payment_received: paid,
      outstanding_amount: outstanding,
      is_draft: false,
    };
  }

  async function saveEdit() {
    if (!validateForm()) return;
    const retailer = retailerMap.get(retailerId);
    const company = companies.find((c) => c.id === companyId);
    if (!retailer || !company) {
      toastError("Select company and retailer.");
      return;
    }

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

    const paid = Number(invoice.payment_received ?? 0);
    const payload = buildInvoicePayload(user.id, retailer, company, paid);
    const transportAmt = payload.transportation_amount;

    const { data: row, error } = await supabase
      .from("retailer_invoices")
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq("id", invoice.id)
      .select()
      .single();

    if (error) {
      setSaving(false);
      toastError(error.message);
      return;
    }

    const tErr = await syncTransportForInvoice(invoice.id, user.id, transportAmt);
    if (tErr.error) {
      setSaving(false);
      toastError(tErr.error.message);
      return;
    }

    const { data: fresh } = await supabase.from("retailer_invoices").select("*").eq("id", invoice.id).single();
    const inv = (fresh ?? row) as RetailerInvoiceRow;

    setSaving(false);
    toastSuccess("Invoice updated.");
    onSaved(inv);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void saveEdit();
  }

  const computedGstAmountPreview = useMemo(() => {
    const basic = round2(toNum(basicAmount));
    const pct = toNum(gstPercent);
    return round2((basic * pct) / 100);
  }, [basicAmount, gstPercent]);

  const computedInvoiceAmountPreview = useMemo(
    () => round2(toNum(basicAmount) + computedGstAmountPreview),
    [basicAmount, computedGstAmountPreview]
  );

  if (loadingRefs) {
    return (
      <div className="flex items-center gap-3 py-10">
        <span
          className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-zinc-600 border-t-teal-400"
          aria-hidden
        />
        <p className="text-sm text-zinc-400">Loading invoice editor…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      {/* Scroll only the form; footer stays after all fields (never between inputs). */}
      <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
        <form id="invoice-edit-inline-form" className="space-y-5 pb-4" onSubmit={onSubmit}>
        <div className={SECTION_WRAP}>
          <h3 className={SECTION_TITLE}>Party &amp; document</h3>
          <div className="space-y-4">
          <div>
            <label className={labelDark} htmlFor="inv-edit-company">
              Company <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <select
                id="inv-edit-company"
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                disabled={saving}
                className={`${fieldClassDark()} appearance-none pr-9`}
                style={inputStyle}
              >
                <option value="">Select company</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <svg
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
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
            <label className={labelDark} htmlFor="inv-edit-retailer">
              Retailer <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <select
                id="inv-edit-retailer"
                value={retailerId}
                onChange={(e) => setRetailerId(e.target.value)}
                disabled={saving}
                className={`${fieldClassDark()} appearance-none pr-9`}
                style={inputStyle}
              >
                <option value="">Select retailer</option>
                {retailers.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              <svg
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
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
            <label className={labelDark}>Invoice date</label>
            <DatePicker value={billDate} onChange={setBillDate} disabled={saving} className={fieldClassDark()} />
          </div>

          <div>
            <label className={labelDark} htmlFor="inv-edit-no">
              Invoice no. <span className="text-red-400">*</span>
            </label>
            <input
              id="inv-edit-no"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              disabled={saving}
              className={fieldClassDark()}
              style={inputStyle}
              placeholder="Invoice number"
            />
          </div>

          <div>
            <label className={labelDark} htmlFor="inv-edit-qty">
              Quantity <span className="text-red-400">*</span>
            </label>
            <input
              id="inv-edit-qty"
              type="text"
              inputMode="numeric"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value.replace(/\D/g, "").slice(0, 6))}
              disabled={saving}
              className={fieldClassDark()}
              style={inputStyle}
              placeholder="e.g. 10"
            />
            <p className="mt-1 text-[11px] text-zinc-500">Number of units for this invoice (whole number).</p>
          </div>
          </div>
        </div>

        <div className={SECTION_WRAP}>
          <h3 className={SECTION_TITLE}>Amounts</h3>
          <div className="space-y-4">
          <div>
            <label className={labelDark} htmlFor="inv-edit-basic">
              Base amount <span className="text-red-400">*</span>
            </label>
            <input
              id="inv-edit-basic"
              inputMode="decimal"
              value={basicAmount}
              onChange={(e) => setBasicAmount(e.target.value)}
              disabled={saving}
              className={fieldClassDark()}
              style={inputStyle}
              placeholder="0.00"
            />
          </div>

          <div>
            <label className={labelDark} htmlFor="inv-edit-gst-pct">
              GST (%) <span className="text-red-400">*</span>
            </label>
            <input
              id="inv-edit-gst-pct"
              inputMode="decimal"
              value={gstPercent}
              onChange={(e) => setGstPercent(e.target.value)}
              disabled={saving}
              className={fieldClassDark()}
              style={inputStyle}
              placeholder="e.g. 18"
            />
            <p className="mt-1 text-[11px] text-zinc-500">GST amount = base × % ÷ 100.</p>
          </div>

          <div className="rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-950/35 via-zinc-950/50 to-zinc-950 p-4 ring-1 ring-amber-500/10">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-amber-200/80">Live preview</p>
            <div className="mt-3 space-y-3">
              <div>
                <label className={labelDark}>GST amount</label>
                <div
                  className={`${fieldClassDark()} border-amber-500/15 text-zinc-200`}
                  style={inputStyle}
                  aria-live="polite"
                >
                  {formatInr(computedGstAmountPreview)}
                </div>
              </div>
              <div>
                <label className={labelDark}>Invoice amount</label>
                <div
                  className={`${fieldClassDark()} border-amber-500/25 font-semibold text-amber-100`}
                  style={inputStyle}
                  aria-live="polite"
                >
                  {formatInr(computedInvoiceAmountPreview)}
                </div>
                <p className="mt-1 text-[11px] text-zinc-500">Base + GST (saved on the invoice before transport).</p>
              </div>
            </div>
          </div>
          </div>
        </div>

        <div className={SECTION_WRAP}>
          <h3 className={SECTION_TITLE}>Transport</h3>
          <div className="space-y-4">
          <div className="rounded-xl border border-sky-900/45 bg-sky-950/35 p-4 ring-1 ring-sky-500/10">
            <div className="flex gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-sky-300">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M5 21h10M8 21v-4M12 21v-4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-sky-200">Freight &amp; LR</p>
                <p className="mt-1 text-xs leading-relaxed text-sky-200/65">
                  Optional — leave blank if there is no freight for this invoice.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-700/60 bg-zinc-900/25 p-4">
            <p className="mb-3 text-sm font-semibold text-zinc-200">Transporter fields</p>
            <div className="space-y-4">
              <div>
                <label className={labelDark} htmlFor="inv-edit-tr-name">
                  Name
                </label>
                <input
                  id="inv-edit-tr-name"
                  value={transportName}
                  onChange={(e) => setTransportName(e.target.value)}
                  disabled={saving}
                  className={fieldClassDark()}
                  style={inputStyle}
                  placeholder="Transporter name"
                />
              </div>
              <div>
                <label className={labelDark} htmlFor="inv-edit-lr">
                  LR no.
                </label>
                <input
                  id="inv-edit-lr"
                  value={lrNo}
                  onChange={(e) => setLrNo(e.target.value)}
                  disabled={saving}
                  className={fieldClassDark()}
                  style={inputStyle}
                  placeholder="Lorry receipt number"
                />
              </div>
              <div>
                <label className={labelDark}>LR date</label>
                <DatePicker value={lrDate} onChange={setLrDate} disabled={saving} className={fieldClassDark()} />
              </div>
              <div>
                <label className={labelDark} htmlFor="inv-edit-tr-amt">
                  Amount
                </label>
                <input
                  id="inv-edit-tr-amt"
                  inputMode="decimal"
                  value={transportAmount}
                  onChange={(e) => setTransportAmount(e.target.value)}
                  disabled={saving}
                  className={fieldClassDark()}
                  style={inputStyle}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>
          </div>
        </div>
        </form>
      </div>

      <div className="shrink-0 border-t border-zinc-700/80 bg-[#16181f]/95 px-0 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md supports-[backdrop-filter]:bg-[#16181f]/88">
        <div className="flex gap-3">
          <button
            type="button"
            disabled={saving}
            onClick={onCancel}
            className="min-h-[48px] flex-1 rounded-xl border border-white/20 py-3 text-sm font-semibold text-white transition hover:bg-white/5 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="invoice-edit-inline-form"
            disabled={saving}
            className="min-h-[48px] flex-1 rounded-xl bg-gradient-to-br from-amber-200 to-amber-100 py-3 text-sm font-semibold text-amber-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] transition hover:from-amber-100 hover:to-amber-50 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
