"use client";

import { createClient } from "@/lib/supabase/client";
import { DatePicker } from "@/components/ui/date-picker";
import { skipRequiredFieldValidation } from "@/lib/dev-validation";
import { toastError, toastSuccess } from "@/lib/toast";
import type { CompanyRow } from "@/types/company";
import type { InvoiceTransportRow, RetailerInvoiceRow } from "@/types/invoice";
import type { RetailerRow } from "@/types/retailer";
import { useRouter } from "next/navigation";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type TransitionEvent } from "react";

type Props = {
  initialInvoices: RetailerInvoiceRow[];
  initialCompanies: CompanyRow[];
  initialRetailers: RetailerRow[];
  initialTransports: InvoiceTransportRow[];
};

type PanelMode = "closed" | "add" | "view" | "edit";

const CANVAS = "#101014";
const INPUT_BG = "#1E1E24";

function fieldClassDark(multiline = false) {
  return [
    "w-full rounded-xl border border-white/10 px-3.5 py-3 text-[15px] text-white shadow-inner outline-none transition",
    "placeholder:text-zinc-500 focus:border-zinc-500/60 focus:ring-2 focus:ring-zinc-500/20",
    multiline ? "min-h-[80px] resize-y" : "",
  ].join(" ");
}

const labelDark = "mb-1.5 block text-sm font-medium text-zinc-100";

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

function ViewRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  const v = value?.trim();
  return (
    <div className="border-b border-zinc-800/50 py-3.5 last:border-b-0">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className={`mt-1 whitespace-pre-wrap text-[15px] leading-snug text-zinc-100 ${mono ? "font-mono text-sm tracking-tight" : ""}`}>
        {v || "—"}
      </p>
    </div>
  );
}

function parseQuantityInput(s: string): number {
  const n = parseInt(String(s).trim().replace(/\D/g, ""), 10);
  if (!Number.isFinite(n) || n < 1) return 0;
  return Math.min(n, 999_999);
}

function AmountSummaryLine({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: "normal" | "medium" | "strong";
}) {
  const valCls =
    emphasis === "strong"
      ? "text-base font-semibold text-white sm:text-lg"
      : emphasis === "medium"
        ? "font-semibold text-zinc-100"
        : "text-zinc-200";
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <span className="max-w-[60%] text-sm leading-snug text-zinc-500">{label}</span>
      <span className={`shrink-0 text-right font-mono text-[15px] tabular-nums tracking-tight ${valCls}`}>{value}</span>
    </div>
  );
}

function InvoiceAmountBreakdownView({ inv }: { inv: RetailerInvoiceRow }) {
  const basic = Number(inv.basic_amount ?? 0);
  const gst = Number(inv.gst_amount ?? 0);
  const pctStr = gstPercentFromAmounts(basic, gst);
  const pctDisplay = pctStr ? `${pctStr}%` : "—";
  const subExclTransport = Number(inv.invoice_amount ?? 0);
  const transport = Number(inv.transportation_amount ?? 0);
  const grand = Number(inv.total_amount ?? 0);
  const qty = Math.max(1, Math.floor(Number(inv.quantity ?? 1)));

  return (
    <div className="mt-1 overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950/50">
      <div className="border-b border-zinc-800/60 bg-zinc-900/40 px-4 py-2.5">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Amount breakdown</h3>
      </div>
      <div className="px-4 py-1">
        <AmountSummaryLine label="Quantity" value={String(qty)} emphasis="normal" />
        <AmountSummaryLine label="Base amount (before GST)" value={formatInr(basic)} />
        <AmountSummaryLine
          label={`GST added (${pctDisplay} on base)`}
          value={formatInr(gst)}
          emphasis="normal"
        />
        <div className="my-2 border-t border-zinc-800/70" />
        <AmountSummaryLine
          label="Subtotal (without transport)"
          value={formatInr(subExclTransport)}
          emphasis="medium"
        />
        <p className="pb-1 pl-0 text-[11px] leading-relaxed text-zinc-600">Base + GST only — freight not included.</p>
        <AmountSummaryLine label="Transport" value={formatInr(transport)} />
        <div className="my-2 border-t border-zinc-800/70" />
        <AmountSummaryLine label="Total (with transport)" value={formatInr(grand)} emphasis="strong" />
        <p className="pb-2 text-[11px] leading-relaxed text-zinc-600">Full invoice total including freight.</p>
      </div>
    </div>
  );
}

function formatInr(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(
    Number.isFinite(n) ? n : 0
  );
}

function StepConnector({ completed, animating }: { completed: boolean; animating: boolean }) {
  const showRestArrow = completed && !animating;
  return (
    <div className="relative flex h-9 min-w-[8px] flex-1 items-center px-1" aria-hidden>
      <div className="absolute inset-x-1 top-1/2 h-[2px] -translate-y-1/2 rounded-full bg-zinc-700/90" />
      {(completed || animating) && (
        <div
          className={`absolute inset-x-1 top-1/2 h-[2px] -translate-y-1/2 rounded-full bg-emerald-500/40 ${
            animating ? "animate-companies-stepper-line-fill" : "origin-left scale-x-100"
          }`}
        />
      )}
      {animating ? (
        <svg
          className="companies-stepper-arrow companies-stepper-arrow--slide text-zinc-200"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M10 6l6 6-6 6" />
        </svg>
      ) : null}
      {showRestArrow ? (
        <svg
          className="companies-stepper-arrow companies-stepper-arrow--rest text-emerald-400/95"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M10 6l6 6-6 6" />
        </svg>
      ) : null}
    </div>
  );
}

function InvoiceAddStepper({ step }: { step: 1 | 2 }) {
  const [animatingConnector, setAnimatingConnector] = useState<0 | null>(null);
  const prevStepRef = useRef<1 | 2>(step);
  const isInitialSync = useRef(true);

  useEffect(() => {
    if (isInitialSync.current) {
      isInitialSync.current = false;
      prevStepRef.current = step;
      return;
    }
    const prev = prevStepRef.current;
    if (step > prev && step === 2) setAnimatingConnector(0);
    prevStepRef.current = step;
  }, [step]);

  useEffect(() => {
    if (animatingConnector === null) return;
    const t = window.setTimeout(() => setAnimatingConnector(null), 760);
    return () => clearTimeout(t);
  }, [animatingConnector]);

  const steps: { n: 1 | 2; label: string }[] = [
    { n: 1, label: "Invoice" },
    { n: 2, label: "Transport" },
  ];

  return (
    <div className="mb-6 px-1">
      <div className="flex w-full items-center">
        {steps.map((s, i) => {
          const active = step === s.n;
          const done = step > s.n;
          const connectorCompleted = i < steps.length - 1 && step > s.n;
          const connectorAnimating = i < steps.length - 1 && animatingConnector === 0;

          return (
            <Fragment key={s.n}>
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold transition ${
                  active
                    ? "bg-zinc-300 text-zinc-950 shadow-[0_0_0_3px_rgba(212,212,216,0.2)]"
                    : done
                      ? "bg-emerald-800/80 text-emerald-100"
                      : "bg-zinc-800 text-zinc-500"
                }`}
              >
                {s.n}
              </div>
              {i < steps.length - 1 ? (
                <StepConnector completed={connectorCompleted} animating={connectorAnimating} />
              ) : null}
            </Fragment>
          );
        })}
      </div>
      <div className="mt-2 flex w-full items-start">
        {steps.map((s, i) => {
          const active = step === s.n;
          return (
            <Fragment key={`inv-step-label-${s.n}`}>
              <div className="flex w-9 shrink-0 flex-col items-center">
                <span
                  className={`text-center text-[11px] font-medium leading-tight sm:text-xs ${active ? "text-zinc-300" : "text-zinc-500"}`}
                >
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 ? <div className="min-w-0 flex-1" aria-hidden /> : null}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

export function InvoicesWorkspace({
  initialInvoices,
  initialCompanies,
  initialRetailers,
  initialTransports,
}: Props) {
  const router = useRouter();
  const [invoices, setInvoices] = useState<RetailerInvoiceRow[]>(initialInvoices);
  const [companies] = useState<CompanyRow[]>(initialCompanies);
  const [retailers] = useState<RetailerRow[]>(initialRetailers);
  const [transports, setTransports] = useState<InvoiceTransportRow[]>(initialTransports);

  const [panel, setPanel] = useState<PanelMode>("closed");
  const prevPanelRef = useRef<PanelMode>("closed");
  const [sheetOpen, setSheetOpen] = useState(false);
  const sheetOpenRef = useRef(sheetOpen);
  const isAnimatingClose = useRef(false);
  const [selected, setSelected] = useState<RetailerInvoiceRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RetailerInvoiceRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [addStep, setAddStep] = useState<1 | 2>(1);

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
    setInvoices(initialInvoices);
  }, [initialInvoices]);

  useEffect(() => {
    setTransports(initialTransports);
  }, [initialTransports]);

  const companyMap = useMemo(() => new Map(companies.map((c) => [c.id, c.name])), [companies]);
  const retailerMap = useMemo(() => new Map(retailers.map((r) => [r.id, r])), [retailers]);

  const resetForm = useCallback(() => {
    setCompanyId("");
    setRetailerId("");
    setBillDate(todayISODate());
    setInvoiceNumber("");
    setQuantity("1");
    setBasicAmount("");
    setGstPercent("");
    setTransportName("");
    setLrNo("");
    setLrDate(todayISODate());
    setTransportAmount("");
  }, []);

  const hydrateFromInvoice = useCallback(
    (inv: RetailerInvoiceRow) => {
      setCompanyId(inv.company_id);
      setRetailerId(inv.retailer_id ?? "");
      setBillDate(inv.bill_date?.slice(0, 10) ?? todayISODate());
      setInvoiceNumber(inv.invoice_number ?? "");
      setQuantity(String(Math.max(1, Math.floor(Number(inv.quantity ?? 1)))));
      const basic = Number(inv.basic_amount ?? 0);
      const gstAmt = Number(inv.gst_amount ?? 0);
      setBasicAmount(String(basic));
      setGstPercent(gstPercentFromAmounts(basic, gstAmt));
      const t = firstTransportForInvoice(transports, inv.id);
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
    [transports]
  );

  const finalizeClose = useCallback(() => {
    setPanel("closed");
    setSelected(null);
    resetForm();
    setAddStep(1);
    isAnimatingClose.current = false;
  }, [resetForm]);

  const requestClose = useCallback(() => {
    if (saving) return;
    isAnimatingClose.current = true;
    setSheetOpen(false);
  }, [saving]);

  useEffect(() => {
    sheetOpenRef.current = sheetOpen;
  }, [sheetOpen]);

  function handleSheetTransitionEnd(e: TransitionEvent<HTMLDivElement>) {
    if (e.propertyName !== "transform") return;
    if (isAnimatingClose.current && !sheetOpenRef.current) {
      finalizeClose();
    }
  }

  useEffect(() => {
    const prev = prevPanelRef.current;
    prevPanelRef.current = panel;
    if (panel !== "closed" && prev === "closed") {
      isAnimatingClose.current = false;
      setSheetOpen(false);
      const id = requestAnimationFrame(() => requestAnimationFrame(() => setSheetOpen(true)));
      return () => cancelAnimationFrame(id);
    }
    if (panel === "closed") {
      setSheetOpen(false);
    }
  }, [panel]);

  useEffect(() => {
    if (panel === "closed") return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [panel]);

  const openAdd = () => {
    if (companies.length === 0) {
      toastError("Add a company first.");
      return;
    }
    if (retailers.length === 0) {
      toastError("Add a retailer first.");
      return;
    }
    setSelected(null);
    resetForm();
    setAddStep(1);
    setPanel("add");
  };

  const openView = (inv: RetailerInvoiceRow) => {
    setSelected(inv);
    hydrateFromInvoice(inv);
    setPanel("view");
  };

  const openEdit = (inv: RetailerInvoiceRow) => {
    setSelected(inv);
    hydrateFromInvoice(inv);
    setAddStep(1);
    setPanel("edit");
  };

  const startEdit = () => {
    if (!selected) return;
    openEdit(selected);
  };

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

  async function saveNew() {
    if (!validateForm()) return;
    const dev = skipRequiredFieldValidation();
    if (!companyId && !dev) return;
    if (!retailerId && !dev) return;
    const retailer = retailerMap.get(retailerId) ?? (dev ? retailers[0] : undefined);
    const company = companies.find((c) => c.id === companyId) ?? (dev ? companies[0] : undefined);
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

    const payload = buildInvoicePayload(user.id, retailer, company, 0);
    const transportAmt = payload.transportation_amount;

    const { data: row, error } = await supabase.from("retailer_invoices").insert(payload).select().single();
    if (error) {
      setSaving(false);
      toastError(error.message);
      return;
    }

    const inv = row as RetailerInvoiceRow;
    const tErr = await syncTransportForInvoice(inv.id, user.id, transportAmt);
    if (tErr.error) {
      await supabase.from("retailer_invoices").delete().eq("id", inv.id);
      setSaving(false);
      toastError(tErr.error.message);
      return;
    }

    const { data: fresh } = await supabase.from("retailer_invoices").select("*").eq("id", inv.id).single();
    const finalInv = (fresh ?? inv) as RetailerInvoiceRow;

    setInvoices((prev) => [finalInv, ...prev].sort((a, b) => b.bill_date.localeCompare(a.bill_date)));
    const { data: trRows } = await supabase.from("invoice_transports").select("*").eq("invoice_id", inv.id);
    if (trRows?.length) {
      setTransports((prev) => {
        const rest = prev.filter((t) => t.invoice_id !== inv.id);
        return [...rest, ...(trRows as InvoiceTransportRow[])];
      });
    }

    setSaving(false);
    toastSuccess("Invoice saved.");
    requestClose();
    router.refresh();
  }

  async function saveEdit() {
    if (!selected || !validateForm()) return;
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

    const paid = Number(selected.payment_received ?? 0);
    const payload = buildInvoicePayload(user.id, retailer, company, paid);
    const transportAmt = payload.transportation_amount;

    const { data: row, error } = await supabase
      .from("retailer_invoices")
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq("id", selected.id)
      .select()
      .single();

    if (error) {
      setSaving(false);
      toastError(error.message);
      return;
    }

    const tErr = await syncTransportForInvoice(selected.id, user.id, transportAmt);
    if (tErr.error) {
      setSaving(false);
      toastError(tErr.error.message);
      return;
    }

    const inv = row as RetailerInvoiceRow;
    setInvoices((prev) => prev.map((x) => (x.id === inv.id ? inv : x)).sort((a, b) => b.bill_date.localeCompare(a.bill_date)));
    const { data: trRows } = await supabase.from("invoice_transports").select("*").eq("invoice_id", inv.id);
    setTransports((prev) => {
      const rest = prev.filter((t) => t.invoice_id !== inv.id);
      return [...rest, ...((trRows ?? []) as InvoiceTransportRow[])];
    });
    setSelected(inv);
    setSaving(false);
    toastSuccess("Invoice updated.");
    setPanel("view");
    router.refresh();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.from("retailer_invoices").delete().eq("id", deleteTarget.id);
    setDeleting(false);
    if (error) {
      toastError(error.message);
      return;
    }
    setInvoices((prev) => prev.filter((i) => i.id !== deleteTarget.id));
    setTransports((prev) => prev.filter((t) => t.invoice_id !== deleteTarget.id));
    toastSuccess("Invoice deleted.");
    setDeleteTarget(null);
    if (selected?.id === deleteTarget.id) requestClose();
    router.refresh();
  }

  const panelTitle = useMemo(() => {
    if (panel === "add") return "Add invoice";
    if (panel === "edit") return "Edit invoice";
    if (panel === "view") return selected?.invoice_number ?? "Invoice";
    return "";
  }, [panel, selected]);

  const sortedInvoices = useMemo(
    () => [...invoices].sort((a, b) => b.bill_date.localeCompare(a.bill_date)),
    [invoices]
  );

  const computedGstAmountPreview = useMemo(() => {
    const basic = round2(toNum(basicAmount));
    const pct = toNum(gstPercent);
    return round2((basic * pct) / 100);
  }, [basicAmount, gstPercent]);

  const computedInvoiceAmountPreview = useMemo(
    () => round2(toNum(basicAmount) + computedGstAmountPreview),
    [basicAmount, computedGstAmountPreview]
  );

  const invoiceFormStep = (
    <div className="space-y-4">
      <div>
        <label className={labelDark} htmlFor="inv-company">
          Company <span className="text-red-400">*</span>
        </label>
        <div className="relative">
          <select
            id="inv-company"
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
        <label className={labelDark} htmlFor="inv-retailer">
          Retailer <span className="text-red-400">*</span>
        </label>
        <div className="relative">
          <select
            id="inv-retailer"
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
        <label className={labelDark} htmlFor="inv-no">
          Invoice no. <span className="text-red-400">*</span>
        </label>
        <input
          id="inv-no"
          value={invoiceNumber}
          onChange={(e) => setInvoiceNumber(e.target.value)}
          disabled={saving}
          className={fieldClassDark()}
          style={inputStyle}
          placeholder="Invoice number"
        />
      </div>

      <div>
        <label className={labelDark} htmlFor="inv-qty">
          Quantity <span className="text-red-400">*</span>
        </label>
        <input
          id="inv-qty"
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

      <div>
        <label className={labelDark} htmlFor="inv-basic">
          Base amount <span className="text-red-400">*</span>
        </label>
        <input
          id="inv-basic"
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
        <label className={labelDark} htmlFor="inv-gst-pct">
          GST (%) <span className="text-red-400">*</span>
        </label>
        <input
          id="inv-gst-pct"
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

      <div>
        <label className={labelDark}>GST amount</label>
        <div className={`${fieldClassDark()} text-zinc-300`} style={inputStyle} aria-live="polite">
          {formatInr(computedGstAmountPreview)}
        </div>
      </div>

      <div>
        <label className={labelDark}>Invoice amount</label>
        <div className={`${fieldClassDark()} font-medium text-white`} style={inputStyle} aria-live="polite">
          {formatInr(computedInvoiceAmountPreview)}
        </div>
        <p className="mt-1 text-[11px] text-zinc-500">Base amount + GST amount (saved on the invoice).</p>
      </div>
    </div>
  );

  const transportFormStep = (
    <div className="space-y-4">
      <div className="rounded-xl border border-sky-900/50 bg-sky-950/40 p-4">
        <div className="flex gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-sky-300">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M5 21h10M8 21v-4M12 21v-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-sky-200">Transport details</p>
            <p className="mt-1 text-xs text-sky-200/70">
              Optional step — leave blank if there is no freight for this invoice. You can still save.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-zinc-900/30 p-4">
        <p className="mb-3 text-sm font-semibold text-zinc-200">Transport</p>
        <div className="space-y-4">
          <div>
            <label className={labelDark} htmlFor="inv-tr-name">
              Name
            </label>
            <input
              id="inv-tr-name"
              value={transportName}
              onChange={(e) => setTransportName(e.target.value)}
              disabled={saving}
              className={fieldClassDark()}
              style={inputStyle}
              placeholder="Transporter name"
            />
          </div>
          <div>
            <label className={labelDark} htmlFor="inv-lr">
              LR no.
            </label>
            <input
              id="inv-lr"
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
            <label className={labelDark} htmlFor="inv-tr-amt">
              Amount
            </label>
            <input
              id="inv-tr-amt"
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
  );

  return (
    <div
      className="relative -mx-4 -mt-5 flex min-h-[calc(100dvh-7.5rem)] flex-col bg-[#12141D] px-4 pb-28 pt-3 text-zinc-100 md:mx-0 md:mt-0 md:min-h-[70vh] md:rounded-2xl md:border md:border-zinc-800/80 md:pb-10 md:pt-6"
      style={{ backgroundColor: CANVAS }}
    >
      <div className="mb-6">
        <div className="mb-1 flex items-center gap-2">
          <span className="h-5 w-1 rounded-full bg-zinc-500" aria-hidden />
          <h2 className="font-login-serif text-xl font-semibold tracking-tight text-white sm:text-2xl">Invoices</h2>
        </div>
        <p className="text-sm text-zinc-400">Create invoices with line totals, GST, and transport details.</p>
      </div>

      {companies.length === 0 || retailers.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/40 px-6 py-14 text-center">
          <p className="font-semibold text-white">Setup required</p>
          <p className="mt-2 max-w-sm text-sm text-zinc-400">
            Add at least one company and one retailer before creating invoices.
          </p>
        </div>
      ) : sortedInvoices.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/40 px-6 py-14 text-center">
          <p className="font-semibold text-white">No invoices yet</p>
          <p className="mt-2 max-w-sm text-sm text-zinc-400">Tap + to add an invoice.</p>
          <button
            type="button"
            onClick={openAdd}
            className="mt-6 rounded-xl bg-zinc-300 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200"
          >
            Add your first invoice
          </button>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {sortedInvoices.map((inv) => {
            const co = companyMap.get(inv.company_id) ?? "—";
            const q = Math.max(1, Math.floor(Number(inv.quantity ?? 1)));
            return (
              <li key={inv.id}>
                <button
                  type="button"
                  onClick={() => openView(inv)}
                  className="group flex w-full items-stretch overflow-hidden rounded-xl border border-zinc-800/90 bg-zinc-950/35 text-left transition hover:border-zinc-600/80 hover:bg-zinc-900/45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500"
                >
                  <span className="w-1 shrink-0 bg-amber-600/80" aria-hidden />
                  <div className="flex min-w-0 flex-1 items-center gap-3 py-3.5 pl-3 pr-4">
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-base font-semibold text-white">{inv.invoice_number}</h3>
                      <p className="mt-0.5 text-sm text-zinc-400">
                        {inv.retailer_name?.trim() || "Retailer"} · {co}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {inv.bill_date} · Qty {q} · {formatInr(Number(inv.total_amount ?? 0))}
                      </p>
                    </div>
                    <span className="shrink-0 text-zinc-600 transition group-hover:text-zinc-400" aria-hidden>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {companies.length > 0 && retailers.length > 0 ? (
        <button
          type="button"
          onClick={openAdd}
          className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-300 text-zinc-950 shadow-lg transition hover:scale-105 hover:bg-zinc-200 active:scale-95 md:bottom-10 md:right-10"
          aria-label="Add invoice"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
        </button>
      ) : null}

      {panel !== "closed" && (
        <>
          <button
            type="button"
            aria-label="Close"
            className={`fixed inset-0 z-[85] bg-black/60 transition-opacity duration-300 ${sheetOpen ? "opacity-100" : "opacity-0"}`}
            onClick={() => !saving && requestClose()}
          />
          <div
            className="fixed inset-x-0 bottom-0 top-12 z-[90] flex max-h-[100dvh] flex-col rounded-t-3xl border border-zinc-700/90 bg-[#16181f] shadow-[0_-12px_40px_rgba(0,0,0,0.45)] md:left-auto md:right-0 md:top-0 md:max-h-none md:w-full md:max-w-lg md:rounded-none md:rounded-l-3xl md:border-l md:border-t-0"
            role="dialog"
            aria-modal="true"
            aria-labelledby="invoice-sheet-title"
            onTransitionEnd={handleSheetTransitionEnd}
            style={{
              transform: sheetOpen ? "translateY(0)" : "translateY(100%)",
              transition: "transform 380ms cubic-bezier(0.22, 1, 0.36, 1)",
              willChange: "transform",
            }}
          >
            <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-zinc-600 md:hidden" aria-hidden />
            <div className="flex shrink-0 items-center gap-3 border-b border-zinc-700/80 px-4 py-3">
              <button
                type="button"
                onClick={() => {
                  if (panel === "add" && addStep > 1) {
                    setAddStep(1);
                    return;
                  }
                  if (panel === "edit") {
                    setPanel("view");
                    return;
                  }
                  requestClose();
                }}
                className="rounded-xl p-2 text-zinc-400 hover:bg-white/5 hover:text-white"
                aria-label="Back"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <h2 id="invoice-sheet-title" className="flex-1 truncate text-center text-lg font-semibold text-white md:text-left">
                {panelTitle}
              </h2>
              <button
                type="button"
                onClick={() => !saving && requestClose()}
                className="rounded-xl p-2 text-zinc-400 hover:bg-white/5 hover:text-white md:ml-auto"
                aria-label="Close"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 pb-32">
              {panel === "view" && selected && (
                <div>
                  <div className="mb-4 flex justify-end gap-4 border-b border-zinc-800/50 pb-3">
                    <button type="button" onClick={startEdit} className="text-sm font-medium text-zinc-400 transition hover:text-white">
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(selected)}
                      className="text-sm font-medium text-red-400/90 transition hover:text-red-300"
                    >
                      Delete
                    </button>
                  </div>
                  <div>
                    <ViewRow label="Company" value={companyMap.get(selected.company_id) ?? ""} />
                    <ViewRow label="Retailer" value={selected.retailer_name ?? ""} />
                    <ViewRow label="Invoice date" value={selected.bill_date ?? ""} />
                    <ViewRow label="Invoice no." value={selected.invoice_number ?? ""} mono />
                    <InvoiceAmountBreakdownView inv={selected} />
                    <div className="mt-5">
                      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Transporter &amp; LR</h3>
                      {(() => {
                        const t = firstTransportForInvoice(transports, selected.id);
                        if (!t) {
                          return <ViewRow label="Transport" value="No transport line saved for this invoice." />;
                        }
                        return (
                          <>
                            <ViewRow label="Transport name" value={t.transport_name} />
                            <ViewRow label="LR no." value={t.lr_no ?? ""} mono />
                            <ViewRow label="LR date" value={t.lr_date ?? ""} />
                            <ViewRow label="Transport line amount" value={formatInr(Number(t.amount ?? 0))} />
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {(panel === "add" || panel === "edit") && (
                <form
                  id="invoice-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (panel === "add" && addStep === 1) return;
                    void (panel === "add" ? saveNew() : saveEdit());
                  }}
                >
                  {panel === "add" ? <InvoiceAddStepper step={addStep} /> : null}
                  {panel === "edit" ? (
                    <div className="space-y-6">
                      {invoiceFormStep}
                      {transportFormStep}
                    </div>
                  ) : addStep === 1 ? (
                    invoiceFormStep
                  ) : (
                    transportFormStep
                  )}
                </form>
              )}
            </div>

            {panel === "add" && addStep === 1 && (
              <div className="absolute bottom-0 left-0 right-0 border-t border-zinc-700/80 bg-[#16181f]/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md">
                <div className="flex gap-3">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => requestClose()}
                    className="min-h-[48px] flex-1 rounded-xl border border-white/20 bg-transparent py-3 text-sm font-semibold text-white hover:bg-white/5 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      if (!validateInvoiceStep()) return;
                      setAddStep(2);
                    }}
                    className="flex min-h-[48px] flex-[1.15] items-center justify-center gap-2 rounded-xl bg-zinc-300 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200 disabled:opacity-50"
                  >
                    Continue
                    <span aria-hidden>→</span>
                  </button>
                </div>
              </div>
            )}

            {panel === "add" && addStep === 2 && (
              <div className="absolute bottom-0 left-0 right-0 border-t border-zinc-700/80 bg-[#16181f]/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md">
                <div className="flex gap-3">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => setAddStep(1)}
                    className="min-h-[48px] flex-1 rounded-xl border border-white/20 py-3 text-sm font-semibold text-white hover:bg-white/5 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    type="submit"
                    form="invoice-form"
                    disabled={saving}
                    className="min-h-[48px] flex-[1.15] rounded-xl bg-zinc-300 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200 disabled:opacity-50"
                  >
                    {saving ? "Saving…" : "Save invoice"}
                  </button>
                </div>
              </div>
            )}

            {panel === "edit" && (
              <div className="absolute bottom-0 left-0 right-0 border-t border-zinc-700/80 bg-[#16181f]/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md">
                <div className="flex gap-3">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => selected && setPanel("view")}
                    className="min-h-[48px] flex-1 rounded-xl border border-white/20 py-3 text-sm font-semibold text-white hover:bg-white/5 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    form="invoice-form"
                    disabled={saving}
                    className="min-h-[48px] flex-1 rounded-xl bg-zinc-300 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200 disabled:opacity-50"
                  >
                    {saving ? "Saving…" : "Save changes"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {deleteTarget && (
        <>
          <div className="fixed inset-0 z-[100] bg-black/70" aria-hidden onClick={() => !deleting && setDeleteTarget(null)} />
          <div
            role="alertdialog"
            aria-labelledby="inv-del-title"
            className="fixed left-1/2 top-1/2 z-[101] w-[min(100%-2rem,22rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-zinc-700 bg-[#1A1C26] p-5 shadow-xl"
          >
            <h3 id="inv-del-title" className="text-lg font-semibold text-white">
              Delete invoice?
            </h3>
            <p className="mt-2 text-sm text-zinc-400">
              Remove invoice <span className="font-medium text-white">&ldquo;{deleteTarget.invoice_number}&rdquo;</span>? Transport, returns,
              payments, and commission rows linked to it will be removed too.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                className="rounded-xl px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-white/5 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => void confirmDelete()}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
