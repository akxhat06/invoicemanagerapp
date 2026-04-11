"use client";

import { createClient } from "@/lib/supabase/client";
import { DatePicker } from "@/components/ui/date-picker";
import { SearchableDropdown, type SearchableDropdownOption } from "@/components/ui/searchable-dropdown";
import { skipRequiredFieldValidation } from "@/lib/dev-validation";
import { toastError, toastSuccess } from "@/lib/toast";
import type { CompanyRow } from "@/types/company";
import type {
  InvoiceGoodsReturnRow,
  InvoicePaymentRow,
  InvoiceTransportRow,
  RetailerInvoiceRow,
} from "@/types/invoice";
import type { RetailerRow } from "@/types/retailer";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from "react";

function roundGoodsReturnAmount(n: number): number {
  return Math.round(n * 100) / 100;
}

/** PostgREST / Postgres numeric may arrive as string; normalize for the form. */
function coerceGoodsReturnAmountFromDb(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const n = parseFloat(String(v).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

function quantityReturnedFromRow(row: InvoiceGoodsReturnRow, maxQty: number): number {
  if (row.quantity_returned == null) return Math.min(maxQty, 1);
  const n = Math.floor(Number(row.quantity_returned));
  const q = Number.isFinite(n) && n >= 1 ? n : 1;
  return Math.min(maxQty, Math.max(1, q));
}

function parseGoodsReturnAmountInput(v: string): number {
  const n = parseFloat(String(v).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

const INPUT_BG = "#1E1E24";
const PAN_PREFIX = "PAN:";

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

const PAYMENT_METHOD_OPTIONS: SearchableDropdownOption[] = [
  { value: "UPI", label: "UPI" },
  { value: "NEFT", label: "NEFT" },
  { value: "Cheque", label: "Cheque" },
  { value: "Cash", label: "Cash" },
  { value: "Other", label: "Other" },
];

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

function computeCdAmount(basicAmount: number, cdAmount: string, cdPercent: string): number {
  const amount = Math.max(0, round2(toNum(cdAmount)));
  const percent = Math.max(0, Math.min(100, round2(toNum(cdPercent))));
  const fromPercent = round2((basicAmount * percent) / 100);
  // If both are entered, amount takes priority.
  const effective = amount > 0 ? amount : fromPercent;
  return round2(Math.max(0, effective));
}

function retailerGstForInvoice(v: string | null | undefined): string | null {
  const tax = v?.trim() ?? "";
  if (!tax) return null;
  const upper = tax.toUpperCase();
  if (upper.startsWith(PAN_PREFIX)) return null;
  return tax;
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
  /** Called after a credit note is saved so parents can refresh aggregates. */
  onGoodsReturnsChanged?: () => void;
  /** Called after a payment is saved so parents can refresh paid / outstanding on the invoice row. */
  onPaymentsChanged?: (
    invoiceId: string,
    patch: Pick<RetailerInvoiceRow, "payment_received" | "outstanding_amount">
  ) => void;
};

export function InvoiceEditForm({
  invoice,
  companies,
  retailers: retailersProp,
  transports: transportsProp,
  onSaved,
  onCancel,
  onGoodsReturnsChanged,
  onPaymentsChanged,
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
  const [cdAmount, setCdAmount] = useState("");
  const [cdPercent, setCdPercent] = useState("");
  const [transportName, setTransportName] = useState("");
  const [lrNo, setLrNo] = useState("");
  const [lrDate, setLrDate] = useState(todayISODate());
  const [transportAmount, setTransportAmount] = useState("");
  const [activeTab, setActiveTab] = useState<"main" | "transport" | "credit" | "payment">("main");

  const [goodsReturns, setGoodsReturns] = useState<InvoiceGoodsReturnRow[]>([]);
  const [loadingReturns, setLoadingReturns] = useState(false);
  const [savingCredit, setSavingCredit] = useState(false);
  const [creditEditingId, setCreditEditingId] = useState<string | null>(null);
  const [creditNoteDate, setCreditNoteDate] = useState(todayISODate());
  const [creditQtyReturn, setCreditQtyReturn] = useState("1");
  const [creditGoodsAmount, setCreditGoodsAmount] = useState("");

  const [invoicePayments, setInvoicePayments] = useState<InvoicePaymentRow[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [paymentEditingId, setPaymentEditingId] = useState<string | null>(null);
  const [paymentDate, setPaymentDate] = useState(todayISODate());
  const [paymentMethod, setPaymentMethod] = useState<InvoicePaymentRow["method"]>("UPI");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [payChequeNo, setPayChequeNo] = useState("");
  const [payUpiNo, setPayUpiNo] = useState("");
  const [payUpiRefNo, setPayUpiRefNo] = useState("");
  const [payNeftUtrNo, setPayNeftUtrNo] = useState("");
  const [payNote, setPayNote] = useState("");

  /** Avoid full-screen credit loading (and unmounting fields) when revisiting the Credit tab for the same invoice. */
  const creditListLoadedForInvoiceRef = useRef<string | null>(null);
  const paymentListLoadedForInvoiceRef = useRef<string | null>(null);

  const inputStyle = { backgroundColor: INPUT_BG } as CSSProperties;

  const invoiceMaxQty = useMemo(() => Math.max(1, parseQuantityInput(quantity) || 1), [quantity]);

  /** Sum of saved payment rows except the one open in the form (so we don’t double-count the draft). */
  const paymentOtherTotal = useMemo(
    () =>
      round2(
        invoicePayments
          .filter((p) => p.id !== paymentEditingId)
          .reduce((a, p) => a + coerceGoodsReturnAmountFromDb(p.amount), 0)
      ),
    [invoicePayments, paymentEditingId]
  );

  const payDraftAmount = useMemo(() => round2(toNum(paymentAmount)), [paymentAmount]);

  const invoiceTotalForPayment = useMemo(() => round2(Number(invoice.total_amount ?? 0)), [invoice.total_amount]);

  /** Paid total if you save the amount currently in the form (other rows + this line). */
  const payTotalAsInForm = useMemo(
    () => round2(paymentOtherTotal + payDraftAmount),
    [paymentOtherTotal, payDraftAmount]
  );

  const payOutstandingRemaining = useMemo(
    () => Math.max(0, round2(invoiceTotalForPayment - payTotalAsInForm)),
    [invoiceTotalForPayment, payTotalAsInForm]
  );

  const payExceedsBill = useMemo(
    () => payTotalAsInForm > invoiceTotalForPayment + 0.005,
    [payTotalAsInForm, invoiceTotalForPayment]
  );

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

  const companySelectOptions = useMemo(
    () =>
      companies.map((c) => ({
        value: c.id,
        label: (c.name ?? "").trim() || "Untitled company",
      })),
    [companies]
  );

  const retailerSelectOptions = useMemo(
    () =>
      retailers.map((r) => ({
        value: r.id,
        label: (r.name ?? "").trim() || "Untitled retailer",
      })),
    [retailers]
  );

  const hydrateFromInvoice = useCallback(
    (inv: RetailerInvoiceRow, tr: InvoiceTransportRow[]) => {
      setCompanyId(inv.company_id);
      setRetailerId(inv.retailer_id ?? "");
      setBillDate(inv.bill_date?.slice(0, 10) ?? todayISODate());
      setInvoiceNumber(inv.invoice_number ?? "");
      setQuantity(String(Math.max(1, Math.floor(Number(inv.quantity ?? 1)))));
      const basic = Number(inv.basic_amount ?? 0);
      const gstAmt = Number(inv.gst_amount ?? 0);
      const cdAmt = Number(inv.cd_amount ?? 0);
      const basicAfterCd = Math.max(0, round2(basic - cdAmt));
      const gstPct = basicAfterCd > 0 ? round2((gstAmt / basicAfterCd) * 100) : 0;
      const cdPct = basic > 0 ? round2((cdAmt / basic) * 100) : 0;
      setBasicAmount(String(basic));
      setGstPercent(gstPct > 0 ? String(gstPct) : "");
      setCdAmount(String(cdAmt));
      setCdPercent(cdPct > 0 ? String(cdPct) : "");
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

  const resetCreditToNew = useCallback(() => {
    setCreditEditingId(null);
    setCreditNoteDate(todayISODate());
    setCreditQtyReturn("1");
    setCreditGoodsAmount("");
  }, []);

  const startEditCredit = useCallback(
    (row: InvoiceGoodsReturnRow) => {
      setCreditEditingId(row.id);
      setCreditNoteDate((row.return_date || todayISODate()).slice(0, 10));
      setCreditQtyReturn(String(quantityReturnedFromRow(row, invoiceMaxQty)));
      const amt = coerceGoodsReturnAmountFromDb(row.amount);
      setCreditGoodsAmount(String(roundGoodsReturnAmount(amt)));
    },
    [invoiceMaxQty]
  );

  useEffect(() => {
    if (activeTab !== "credit") return;
    let cancelled = false;
    const invoiceId = invoice.id;
    const needsBlockingSpinner = creditListLoadedForInvoiceRef.current !== invoiceId;
    if (needsBlockingSpinner) {
      setLoadingReturns(true);
      setGoodsReturns([]);
      resetCreditToNew();
    }
    void (async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("invoice_goods_returns")
        .select("*")
        .eq("invoice_id", invoiceId)
        .order("return_date", { ascending: false });
      if (cancelled) return;
      if (error) {
        if (needsBlockingSpinner) setLoadingReturns(false);
        toastError(error.message);
        return;
      }
      const rows = (data ?? []) as InvoiceGoodsReturnRow[];
      setGoodsReturns(rows);
      if (needsBlockingSpinner) {
        setLoadingReturns(false);
        creditListLoadedForInvoiceRef.current = invoiceId;
        if (rows.length >= 1) {
          startEditCredit(rows[0]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeTab, invoice.id, resetCreditToNew, startEditCredit]);

  const resetPaymentToNew = useCallback(() => {
    setPaymentEditingId(null);
    setPaymentDate(todayISODate());
    setPaymentMethod("UPI");
    setPaymentAmount("");
    setPayChequeNo("");
    setPayUpiNo("");
    setPayUpiRefNo("");
    setPayNeftUtrNo("");
    setPayNote("");
  }, []);

  const startEditPayment = useCallback((row: InvoicePaymentRow) => {
    setPaymentEditingId(row.id);
    setPaymentDate((row.payment_date || todayISODate()).slice(0, 10));
    setPaymentMethod(row.method);
    setPaymentAmount(String(round2(coerceGoodsReturnAmountFromDb(row.amount))));
    setPayChequeNo(row.cheque_no ?? "");
    setPayUpiNo(row.upi_no ?? "");
    setPayUpiRefNo(row.upi_ref_no ?? "");
    setPayNeftUtrNo(row.neft_utr_no ?? "");
    setPayNote(row.note ?? "");
  }, []);

  useEffect(() => {
    if (activeTab !== "payment") return;
    let cancelled = false;
    const invoiceId = invoice.id;
    const needsBlockingSpinner = paymentListLoadedForInvoiceRef.current !== invoiceId;
    if (needsBlockingSpinner) {
      setLoadingPayments(true);
      setInvoicePayments([]);
      resetPaymentToNew();
    }
    void (async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("invoice_payments")
        .select("*")
        .eq("invoice_id", invoiceId)
        .order("payment_date", { ascending: false });
      if (cancelled) return;
      if (error) {
        if (needsBlockingSpinner) setLoadingPayments(false);
        toastError(error.message);
        return;
      }
      const rows = (data ?? []) as InvoicePaymentRow[];
      setInvoicePayments(rows);
      if (needsBlockingSpinner) {
        setLoadingPayments(false);
        paymentListLoadedForInvoiceRef.current = invoiceId;
        if (rows.length >= 1) {
          startEditPayment(rows[0]);
        } else {
          setPaymentEditingId(null);
          const out = round2(Number(invoice.outstanding_amount ?? 0));
          setPaymentAmount(out > 0 ? String(out) : "");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeTab, invoice.id, resetPaymentToNew, startEditPayment]);

  async function saveCreditNoteInline(e?: FormEvent) {
    e?.preventDefault();
    const maxQty = invoiceMaxQty;
    let qr = Math.floor(parseInt(creditQtyReturn, 10));
    if (!Number.isFinite(qr) || qr < 1) {
      if (skipRequiredFieldValidation()) qr = 1;
      else {
        toastError("Enter quantity to return (at least 1).");
        return;
      }
    }
    if (qr > maxQty) {
      toastError(`Quantity to return cannot exceed invoice quantity (${maxQty}).`);
      return;
    }

    let rawAmt = parseGoodsReturnAmountInput(creditGoodsAmount);
    if (rawAmt <= 0 && skipRequiredFieldValidation()) {
      rawAmt = 0.01;
    }
    if (rawAmt <= 0) {
      toastError("Enter goods return amount.");
      return;
    }

    const roundedAmount = roundGoodsReturnAmount(rawAmt);
    if (roundedAmount <= 0) {
      toastError("Goods return amount is too small after rounding.");
      return;
    }

    setSavingCredit(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSavingCredit(false);
      toastError("You must be signed in.");
      return;
    }

    const payload = {
      user_id: user.id,
      invoice_id: invoice.id,
      return_date: creditNoteDate || todayISODate(),
      amount: roundedAmount,
      quantity_returned: qr,
      note: null as string | null,
    };

    const query = creditEditingId
      ? supabase.from("invoice_goods_returns").update(payload).eq("id", creditEditingId).eq("user_id", user.id)
      : supabase.from("invoice_goods_returns").insert(payload);
    const { data, error } = await query.select().single();

    if (error) {
      setSavingCredit(false);
      if (error.message.includes("quantity_returned") || error.code === "PGRST204") {
        toastError(
          "Database is missing column quantity_returned. Apply the migration in supabase/migrations/ then try again."
        );
        return;
      }
      toastError(error.message);
      return;
    }

    const savedRow = data as InvoiceGoodsReturnRow;
    setGoodsReturns((prev) =>
      creditEditingId ? prev.map((r) => (r.id === creditEditingId ? savedRow : r)) : [savedRow, ...prev]
    );
    setSavingCredit(false);
    toastSuccess(creditEditingId ? "Credit note updated." : "Credit note saved.");
    startEditCredit(savedRow);
    onGoodsReturnsChanged?.();
  }

  async function savePaymentInline(e?: FormEvent) {
    e?.preventDefault();
    let amt = toNum(paymentAmount);
    if (amt <= 0 && skipRequiredFieldValidation()) {
      amt = 0.01;
    }
    if (amt <= 0) {
      toastError("Enter payment amount.");
      return;
    }

    setSavingPayment(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSavingPayment(false);
      toastError("You must be signed in.");
      return;
    }

    const payload = {
      user_id: user.id,
      invoice_id: invoice.id,
      payment_date: paymentDate || todayISODate(),
      method: paymentMethod,
      amount: round2(amt),
      cheque_no: payChequeNo.trim() || null,
      upi_no: payUpiNo.trim() || null,
      upi_ref_no: payUpiRefNo.trim() || null,
      neft_utr_no: payNeftUtrNo.trim() || null,
      note: payNote.trim() || null,
    };

    const query = paymentEditingId
      ? supabase.from("invoice_payments").update(payload).eq("id", paymentEditingId).eq("user_id", user.id)
      : supabase.from("invoice_payments").insert(payload);
    const { data, error } = await query.select().single();

    if (error) {
      setSavingPayment(false);
      toastError(error.message);
      return;
    }

    const invId = invoice.id;
    const [sumRes, invRes] = await Promise.all([
      supabase.from("invoice_payments").select("amount").eq("invoice_id", invId),
      supabase.from("retailer_invoices").select("total_amount").eq("id", invId).single(),
    ]);

    const savedRow = data as InvoicePaymentRow;
    setInvoicePayments((prev) =>
      paymentEditingId ? prev.map((r) => (r.id === paymentEditingId ? savedRow : r)) : [savedRow, ...prev]
    );
    setSavingPayment(false);
    toastSuccess(paymentEditingId ? "Payment updated." : "Payment saved.");
    startEditPayment(savedRow);

    if (!sumRes.error && !invRes.error && invRes.data) {
      const paid = round2((sumRes.data ?? []).reduce((a, r) => a + Number(r.amount || 0), 0));
      const total = Number(invRes.data.total_amount || 0);
      const outstanding = Math.max(0, round2(total - paid));
      await supabase
        .from("retailer_invoices")
        .update({
          payment_received: paid,
          outstanding_amount: outstanding,
          updated_at: new Date().toISOString(),
        })
        .eq("id", invId);
      onPaymentsChanged?.(invId, { payment_received: paid, outstanding_amount: outstanding });
    }
  }

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
    const gst = toNum(gstPercent);
    if (gst < 0) {
      toastError("GST % cannot be negative.");
      return false;
    }
    if (gst > 100) {
      toastError("GST % cannot exceed 100.");
      return false;
    }
    const cdAmtRaw = toNum(cdAmount);
    if (cdAmtRaw < 0) {
      toastError("Cash discount amount cannot be negative.");
      return false;
    }
    const cdPctRaw = toNum(cdPercent);
    if (cdPctRaw < 0) {
      toastError("Cash discount % cannot be negative.");
      return false;
    }
    if (cdPctRaw > 100) {
      toastError("Cash discount % cannot exceed 100.");
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

    const amt = Math.max(0, transportAmt);

    const { error } = await supabase.from("invoice_transports").insert({
      user_id: userId,
      invoice_id: invoiceId,
      transport_name: tName || "Transport",
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
    const cdAmt = Math.min(basic, computeCdAmount(basic, cdAmount, cdPercent));
    const discountedBase = Math.max(0, round2(basic - cdAmt));
    const gstPct = Math.max(0, Math.min(100, round2(toNum(gstPercent))));
    const gstAmt = round2((discountedBase * gstPct) / 100);
    const invAmt = Math.round(round2(discountedBase + gstAmt));
    const transportAmt = round2(toNum(transportAmount));
    const total = round2(invAmt);
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
      gst_no: company.gst_no?.trim() || retailerGstForInvoice(retailer.gst_no) || null,
      invoice_number: invoiceNumber.trim() || (dev ? "DEV-INV" : ""),
      bill_date: billDate || (dev ? todayISODate() : ""),
      basic_amount: dev && basic <= 0 ? 0.01 : basic,
      gst_amount: dev && gstAmt < 0 ? 0 : gstAmt,
      invoice_amount: dev && invAmt <= 0 ? 0.01 : invAmt,
      transportation_amount: Math.max(0, transportAmt),
      cd_amount: Math.max(0, cdAmt),
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

  const computedBasicAmountPreview = useMemo(() => round2(toNum(basicAmount)), [basicAmount]);
  const computedCdAmountPreview = useMemo(
    () => Math.min(computedBasicAmountPreview, computeCdAmount(computedBasicAmountPreview, cdAmount, cdPercent)),
    [computedBasicAmountPreview, cdAmount, cdPercent]
  );
  const computedTaxableBasePreview = useMemo(
    () => Math.max(0, round2(computedBasicAmountPreview - computedCdAmountPreview)),
    [computedBasicAmountPreview, computedCdAmountPreview]
  );
  const computedGstAmountPreview = useMemo(() => {
    const pct = Math.max(0, Math.min(100, round2(toNum(gstPercent))));
    return round2((computedTaxableBasePreview * pct) / 100);
  }, [gstPercent, computedTaxableBasePreview]);
  const computedInvoiceAmountPreview = useMemo(
    () => Math.round(round2(computedTaxableBasePreview + computedGstAmountPreview)),
    [computedTaxableBasePreview, computedGstAmountPreview]
  );

  function syncCdFromAmount(nextAmount: string, baseRaw: string = basicAmount) {
    setCdAmount(nextAmount);
    const base = round2(toNum(baseRaw));
    const amt = Math.max(0, round2(toNum(nextAmount)));
    if (base > 0 && amt > 0) {
      setCdPercent(String(round2((amt / base) * 100)));
      return;
    }
    if (!nextAmount.trim()) setCdPercent("");
  }

  function syncCdFromPercent(nextPercent: string, baseRaw: string = basicAmount) {
    setCdPercent(nextPercent);
    const base = round2(toNum(baseRaw));
    const pct = Math.max(0, Math.min(100, round2(toNum(nextPercent))));
    if (base > 0 && pct > 0) {
      setCdAmount(String(round2((base * pct) / 100)));
      return;
    }
    if (!nextPercent.trim()) setCdAmount("");
  }

  function handleBasicAmountChange(nextBasic: string) {
    setBasicAmount(nextBasic);
    if (cdAmount.trim()) {
      syncCdFromAmount(cdAmount, nextBasic);
      return;
    }
    if (cdPercent.trim()) {
      syncCdFromPercent(cdPercent, nextBasic);
    }
  }

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
        <div className="rounded-2xl border border-zinc-800/70 bg-zinc-950/40 p-1 ring-1 ring-white/[0.03]">
          <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
            <button
              type="button"
              onClick={() => setActiveTab("main")}
              aria-pressed={activeTab === "main"}
              className={`rounded-xl px-2 py-2 text-xs font-semibold transition sm:px-3 sm:text-sm ${
                activeTab === "main"
                  ? "bg-amber-500/15 text-amber-100 ring-1 ring-amber-500/30"
                  : "text-zinc-400 hover:bg-zinc-900/70 hover:text-zinc-200"
              }`}
            >
              Main bill
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("transport")}
              aria-pressed={activeTab === "transport"}
              className={`rounded-xl px-2 py-2 text-xs font-semibold transition sm:px-3 sm:text-sm ${
                activeTab === "transport"
                  ? "bg-sky-500/15 text-sky-100 ring-1 ring-sky-500/30"
                  : "text-zinc-400 hover:bg-zinc-900/70 hover:text-zinc-200"
              }`}
            >
              Transport
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("credit")}
              aria-pressed={activeTab === "credit"}
              className={`rounded-xl px-2 py-2 text-xs font-semibold transition sm:px-3 sm:text-sm ${
                activeTab === "credit"
                  ? "bg-rose-500/15 text-rose-100 ring-1 ring-rose-500/30"
                  : "text-zinc-400 hover:bg-zinc-900/70 hover:text-zinc-200"
              }`}
            >
              Credit
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("payment")}
              aria-pressed={activeTab === "payment"}
              className={`rounded-xl px-2 py-2 text-xs font-semibold transition sm:px-3 sm:text-sm ${
                activeTab === "payment"
                  ? "bg-emerald-500/15 text-emerald-100 ring-1 ring-emerald-500/25"
                  : "text-zinc-400 hover:bg-zinc-900/70 hover:text-zinc-200"
              }`}
            >
              Payment
            </button>
          </div>
        </div>
        {activeTab === "main" || activeTab === "transport" ? (
        <form id="invoice-edit-inline-form" className="space-y-5 pb-4" onSubmit={onSubmit}>
        {activeTab === "main" ? (
        <>
        <div className={SECTION_WRAP}>
          <h3 className={SECTION_TITLE}>Party &amp; document</h3>
          <div className="space-y-4">
          <div>
            <label className={labelDark} htmlFor="inv-edit-company">
              Company <span className="text-red-400">*</span>
            </label>
            <SearchableDropdown
              id="inv-edit-company"
              value={companyId}
              onChange={setCompanyId}
              options={companySelectOptions}
              placeholder="Select company"
              searchPlaceholder="Search company…"
              disabled={saving}
              inputBackground={INPUT_BG}
            />
          </div>

          <div>
            <label className={labelDark} htmlFor="inv-edit-retailer">
              Retailer <span className="text-red-400">*</span>
            </label>
            <SearchableDropdown
              id="inv-edit-retailer"
              value={retailerId}
              onChange={setRetailerId}
              options={retailerSelectOptions}
              placeholder="Select retailer"
              searchPlaceholder="Search retailer…"
              disabled={saving}
              inputBackground={INPUT_BG}
            />
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
              onChange={(e) => handleBasicAmountChange(e.target.value)}
              disabled={saving}
              className={fieldClassDark()}
              style={inputStyle}
              placeholder="0.00"
            />
          </div>

          <div>
            <label className={labelDark} htmlFor="inv-edit-gst-pct">
              GST (%)
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
          </div>

          <div>
            <label className={labelDark} htmlFor="inv-edit-cd-amt">
              Cash discount amount
            </label>
            <input
              id="inv-edit-cd-amt"
              inputMode="decimal"
              value={cdAmount}
              onChange={(e) => syncCdFromAmount(e.target.value)}
              disabled={saving}
              className={fieldClassDark()}
              style={inputStyle}
              placeholder="0.00"
            />
          </div>

          <div>
            <label className={labelDark} htmlFor="inv-edit-cd-pct">
              Cash discount (%)
            </label>
            <input
              id="inv-edit-cd-pct"
              inputMode="decimal"
              value={cdPercent}
              onChange={(e) => syncCdFromPercent(e.target.value)}
              disabled={saving}
              className={fieldClassDark()}
              style={inputStyle}
              placeholder="e.g. 2.5"
            />
            <p className="mt-1 text-[11px] text-zinc-500">If both amount and % are entered, amount is used.</p>
          </div>

          <div className="rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-950/35 via-zinc-950/50 to-zinc-950 p-4 ring-1 ring-amber-500/10">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-amber-200/80">Live preview</p>
            <div className="mt-3 space-y-3">
              <div>
                <label className={labelDark}>Taxable amount (Base - CD)</label>
                <div
                  className={`${fieldClassDark()} border-amber-500/15 text-zinc-200`}
                  style={inputStyle}
                  aria-live="polite"
                >
                  {formatInr(computedTaxableBasePreview)}
                </div>
              </div>
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
                <label className={labelDark}>Cash discount amount</label>
                <div className={`${fieldClassDark()} border-amber-500/15 text-zinc-200`} style={inputStyle} aria-live="polite">
                  {formatInr(computedCdAmountPreview)}
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
                <p className="mt-1 text-[11px] text-zinc-500">Calculated as Basic amount - CD + GST. Transport stays separate.</p>
              </div>
            </div>
          </div>
          </div>
        </div>
        </>
        ) : null}

        {activeTab === "transport" ? (
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
        ) : null}
        </form>
        ) : activeTab === "credit" ? (
        <form id="invoice-credit-form" className="space-y-5 pb-4" onSubmit={(e) => void saveCreditNoteInline(e)}>
          <div className={SECTION_WRAP}>
            <h3 className={SECTION_TITLE}>Credit notes (goods return)</h3>
            <p className="mb-4 text-xs leading-relaxed text-zinc-500">
              Save the main bill first if you changed quantity—return qty cannot exceed invoice quantity.
              {goodsReturns.length > 1
                ? " Several credit notes exist; tap one to edit it in the form below."
                : null}
            </p>
            {loadingReturns ? (
              <div className="flex items-center gap-3 py-8">
                <span
                  className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-zinc-600 border-t-rose-400"
                  aria-hidden
                />
                <p className="text-sm text-zinc-400">Loading credit notes…</p>
              </div>
            ) : (
              <>
                {goodsReturns.length > 1 ? (
                  <ul className="mb-4 space-y-2">
                    <li className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                      Choose credit note
                    </li>
                    {goodsReturns.map((r) => (
                      <li key={r.id}>
                        <button
                          type="button"
                          onClick={() => startEditCredit(r)}
                          className={`flex w-full flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left transition ${
                            creditEditingId === r.id
                              ? "border-rose-500/50 bg-rose-950/25 ring-1 ring-rose-500/20"
                              : "border-zinc-700/60 bg-zinc-900/40 hover:border-zinc-600 hover:bg-zinc-900/70"
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="font-mono text-sm font-medium text-zinc-200">
                              {formatInr(roundGoodsReturnAmount(coerceGoodsReturnAmountFromDb(r.amount)))}
                            </p>
                            <p className="text-xs text-zinc-500">
                              {(r.return_date || "").slice(0, 10)}
                              <span className="text-zinc-600"> · </span>
                              Qty returned {quantityReturnedFromRow(r, invoiceMaxQty)}
                            </p>
                          </div>
                          {creditEditingId === r.id ? (
                            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-rose-300/90">
                              In form
                            </span>
                          ) : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : goodsReturns.length === 1 ? (
                  <p className="mb-4 text-xs text-zinc-500">Goods return for this invoice (edit below).</p>
                ) : (
                  <p className="mb-4 text-sm text-zinc-500">No credit notes yet for this invoice—fill the form below to add one.</p>
                )}
                <div className="space-y-4">
                  <div>
                    <label className={labelDark}>Date</label>
                    <DatePicker
                      value={creditNoteDate}
                      onChange={setCreditNoteDate}
                      disabled={savingCredit}
                      className={fieldClassDark()}
                    />
                  </div>
                  <div>
                    <label className={labelDark}>Invoice quantity (max return)</label>
                    <input
                      type="text"
                      readOnly
                      className={`${fieldClassDark()} cursor-not-allowed opacity-80`}
                      style={inputStyle}
                      value={String(invoiceMaxQty)}
                      aria-live="polite"
                    />
                  </div>
                  <div>
                    <label className={labelDark} htmlFor="inv-credit-qty">
                      Quantity to return
                    </label>
                    <input
                      id="inv-credit-qty"
                      type="text"
                      inputMode="numeric"
                      className={fieldClassDark()}
                      style={inputStyle}
                      value={creditQtyReturn}
                      onChange={(e) => setCreditQtyReturn(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      disabled={savingCredit}
                      placeholder="1"
                    />
                    <p className="mt-1 text-[11px] text-zinc-500">Maximum {invoiceMaxQty}.</p>
                  </div>
                  <div>
                    <label className={labelDark} htmlFor="inv-credit-amt">
                      Goods return amount
                    </label>
                    <input
                      id="inv-credit-amt"
                      type="text"
                      inputMode="decimal"
                      className={fieldClassDark()}
                      style={inputStyle}
                      value={creditGoodsAmount}
                      onChange={(e) => setCreditGoodsAmount(e.target.value)}
                      disabled={savingCredit}
                      placeholder="0.00"
                    />
                    <p className="mt-1 text-[11px] text-zinc-500">Rounded to two decimal places when saved.</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </form>
        ) : (
        <form id="invoice-payment-form" className="space-y-5 pb-28 sm:pb-32" onSubmit={(e) => void savePaymentInline(e)}>
          <div className={SECTION_WRAP}>
            <h3 className={SECTION_TITLE}>Payments</h3>
            <p className="mb-4 text-xs leading-relaxed text-zinc-500">
              Payments for this invoice. Edit entries here; use the Payments page only to record new payments quickly
              across invoices.
              {invoicePayments.length > 1 ? " Several entries exist—tap one to edit it below." : null}
            </p>
            {loadingPayments ? (
              <div className="flex items-center gap-3 py-8">
                <span
                  className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-zinc-600 border-t-emerald-400"
                  aria-hidden
                />
                <p className="text-sm text-zinc-400">Loading payments…</p>
              </div>
            ) : (
              <>
                {invoicePayments.length > 1 ? (
                  <ul className="mb-4 space-y-2">
                    <li className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                      Choose payment
                    </li>
                    {invoicePayments.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => startEditPayment(p)}
                          className={`flex w-full flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left transition ${
                            paymentEditingId === p.id
                              ? "border-emerald-500/50 bg-emerald-950/25 ring-1 ring-emerald-500/20"
                              : "border-zinc-700/60 bg-zinc-900/40 hover:border-zinc-600 hover:bg-zinc-900/70"
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="font-mono text-sm font-medium text-zinc-200">
                              {formatInr(round2(coerceGoodsReturnAmountFromDb(p.amount)))}
                            </p>
                            <p className="text-xs text-zinc-500">
                              {(p.payment_date || "").slice(0, 10)}
                              <span className="text-zinc-600"> · </span>
                              {p.method}
                            </p>
                          </div>
                          {paymentEditingId === p.id ? (
                            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-emerald-300/90">
                              In form
                            </span>
                          ) : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : invoicePayments.length === 1 ? (
                  <p className="mb-4 text-xs text-zinc-500">Payment recorded for this invoice (edit below).</p>
                ) : (
                  <p className="mb-4 text-sm text-zinc-500">No payments yet—fill the form below to add one.</p>
                )}

                <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-4 ring-1 ring-emerald-500/10">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-zinc-500">Invoice total (bill)</span>
                      <span className="font-mono font-semibold tabular-nums text-zinc-100">{formatInr(invoiceTotalForPayment)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-zinc-500">Paid</span>
                      <span className="font-mono tabular-nums text-emerald-200/95">{formatInr(payTotalAsInForm)}</span>
                    </div>
                    <p className="text-[10px] leading-snug text-zinc-600">
                      Includes the payment amount below (updates as you type).
                    </p>
                    <div className="flex items-center justify-between gap-3 border-t border-zinc-700/50 pt-2">
                      <span className="text-zinc-500">Outstanding</span>
                      <span className="font-mono font-semibold tabular-nums text-zinc-100">{formatInr(payOutstandingRemaining)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-4">
                  <div>
                    <label className={labelDark}>Payment date</label>
                    <DatePicker
                      value={paymentDate}
                      onChange={setPaymentDate}
                      disabled={savingPayment}
                      className={fieldClassDark()}
                    />
                  </div>
                  <div>
                    <label className={labelDark}>Method</label>
                    <SearchableDropdown
                      value={paymentMethod}
                      onChange={(v) => setPaymentMethod(v as InvoicePaymentRow["method"])}
                      options={PAYMENT_METHOD_OPTIONS}
                      placeholder="Method"
                      disabled={savingPayment}
                      showSearch={false}
                      allowClear={false}
                      inputBackground={INPUT_BG}
                    />
                  </div>
                  <div>
                    <label className={labelDark} htmlFor="inv-pay-amt">
                      Payment amount
                    </label>
                    <input
                      id="inv-pay-amt"
                      inputMode="decimal"
                      className={fieldClassDark()}
                      style={inputStyle}
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      disabled={savingPayment}
                      placeholder="Enter amount"
                    />
                    {payExceedsBill ? (
                      <p className="mt-2 text-xs text-amber-400/90">
                        Total paid would be more than the bill amount. Reduce the payment or check the invoice total.
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <label className={labelDark} htmlFor="inv-pay-cheque">
                      Cheque no.
                    </label>
                    <input
                      id="inv-pay-cheque"
                      className={fieldClassDark()}
                      style={inputStyle}
                      value={payChequeNo}
                      onChange={(e) => setPayChequeNo(e.target.value)}
                      disabled={savingPayment}
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label className={labelDark} htmlFor="inv-pay-upi">
                      UPI no.
                    </label>
                    <input
                      id="inv-pay-upi"
                      className={fieldClassDark()}
                      style={inputStyle}
                      value={payUpiNo}
                      onChange={(e) => setPayUpiNo(e.target.value)}
                      disabled={savingPayment}
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label className={labelDark} htmlFor="inv-pay-upi-ref">
                      UPI ref no.
                    </label>
                    <input
                      id="inv-pay-upi-ref"
                      className={fieldClassDark()}
                      style={inputStyle}
                      value={payUpiRefNo}
                      onChange={(e) => setPayUpiRefNo(e.target.value)}
                      disabled={savingPayment}
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label className={labelDark} htmlFor="inv-pay-neft">
                      NEFT UTR no.
                    </label>
                    <input
                      id="inv-pay-neft"
                      className={fieldClassDark()}
                      style={inputStyle}
                      value={payNeftUtrNo}
                      onChange={(e) => setPayNeftUtrNo(e.target.value)}
                      disabled={savingPayment}
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label className={labelDark} htmlFor="inv-pay-note">
                      Note
                    </label>
                    <input
                      id="inv-pay-note"
                      className={fieldClassDark()}
                      style={inputStyle}
                      value={payNote}
                      onChange={(e) => setPayNote(e.target.value)}
                      disabled={savingPayment}
                      placeholder="Optional"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </form>
        )}
      </div>

      <div className="shrink-0 border-t border-zinc-700/80 bg-[#16181f]/95 px-0 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md supports-[backdrop-filter]:bg-[#16181f]/88">
        <div className="flex gap-3">
          <button
            type="button"
            disabled={saving || savingCredit || savingPayment}
            onClick={onCancel}
            className="min-h-[48px] flex-1 rounded-xl border border-white/20 py-3 text-sm font-semibold text-white transition hover:bg-white/5 disabled:opacity-50"
          >
            Cancel
          </button>
          {activeTab === "credit" ? (
            <button
              type="submit"
              form="invoice-credit-form"
              disabled={savingCredit || loadingReturns}
              className="min-h-[48px] flex-1 rounded-xl bg-gradient-to-br from-rose-200 to-rose-100 py-3 text-sm font-semibold text-rose-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] transition hover:from-rose-100 hover:to-rose-50 disabled:opacity-50"
            >
              {savingCredit ? "Saving…" : "Save credit note"}
            </button>
          ) : activeTab === "payment" ? (
            <button
              type="submit"
              form="invoice-payment-form"
              disabled={savingPayment || loadingPayments}
              className="min-h-[48px] flex-1 rounded-xl bg-gradient-to-br from-emerald-200 to-emerald-100 py-3 text-sm font-semibold text-emerald-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] transition hover:from-emerald-100 hover:to-emerald-50 disabled:opacity-50"
            >
              {savingPayment ? "Saving…" : "Save payment"}
            </button>
          ) : (
            <button
              type="submit"
              form="invoice-edit-inline-form"
              disabled={saving}
              className="min-h-[48px] flex-1 rounded-xl bg-gradient-to-br from-amber-200 to-amber-100 py-3 text-sm font-semibold text-amber-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] transition hover:from-amber-100 hover:to-amber-50 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
