"use client";

import { createClient } from "@/lib/supabase/client";
import { DatePicker } from "@/components/ui/date-picker";
import { skipRequiredFieldValidation } from "@/lib/dev-validation";
import { toastError, toastSuccess } from "@/lib/toast";
import type { CompanyRow } from "@/types/company";
import type { RetailerInvoiceRow } from "@/types/invoice";
import type { RetailerRow } from "@/types/retailer";
import { SearchableDropdown } from "@/components/ui/searchable-dropdown";
import { useWorkspaceUiSession } from "@/hooks/use-workspace-ui-session";
import { netInvoiceTotalAfterReturns } from "@/lib/invoice-net-after-returns";
import { useRouter } from "next/navigation";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type TransitionEvent } from "react";
import { SearchBar } from "@/components/ui/search-bar";

type Props = {
  initialInvoices: RetailerInvoiceRow[];
  initialCompanies: CompanyRow[];
  initialRetailers: RetailerRow[];
  /** Sum of `invoice_goods_returns.amount` per invoice id. */
  initialReturnAmountByInvoiceId?: Record<string, number>;
};

type PanelMode = "closed" | "add";

type InvoicesUiSessionV2 = {
  v: 2;
  panel: PanelMode;
  addStep: 1 | 2;
  companyId: string;
  retailerId: string;
  billDate: string;
  invoiceNumber: string;
  quantity: string;
  basicAmount: string;
  gstPercent: string;
  cdAmount: string;
  cdPercent: string;
  transportName: string;
  lrNo: string;
  lrDate: string;
  transportAmount: string;
};

const CANVAS = "#101014";
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

function InvoiceDocGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function formatInr(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
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
                    ? "bg-amber-200 text-amber-950 shadow-[0_0_0_3px_rgba(251,191,36,0.22)]"
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
                  className={`text-center text-[11px] font-medium leading-tight sm:text-xs ${active ? "text-amber-200/90" : "text-zinc-500"}`}
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
  initialReturnAmountByInvoiceId = {},
}: Props) {
  const router = useRouter();
  const [invoices, setInvoices] = useState<RetailerInvoiceRow[]>(initialInvoices);
  const [searchQuery, setSearchQuery] = useState("");
  const [companies] = useState<CompanyRow[]>(initialCompanies);
  const [retailers] = useState<RetailerRow[]>(initialRetailers);
  const [returnAmountByInvoiceId, setReturnAmountByInvoiceId] =
    useState<Record<string, number>>(initialReturnAmountByInvoiceId);

  const [panel, setPanel] = useState<PanelMode>("closed");
  const prevPanelRef = useRef<PanelMode>("closed");
  const [sheetOpen, setSheetOpen] = useState(false);
  const sheetOpenRef = useRef(sheetOpen);
  const isAnimatingClose = useRef(false);
  const [saving, setSaving] = useState(false);
  const [addStep, setAddStep] = useState<1 | 2>(1);

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

  /** When true, next `openAdd` keeps restored draft instead of calling `resetForm`. */
  const skipResetOnOpenAddRef = useRef(false);

  const inputStyle = { backgroundColor: INPUT_BG } as CSSProperties;

  useEffect(() => {
    setInvoices(initialInvoices);
  }, [initialInvoices]);

  useEffect(() => {
    setReturnAmountByInvoiceId(initialReturnAmountByInvoiceId);
  }, [initialReturnAmountByInvoiceId]);

  const companyMap = useMemo(() => new Map(companies.map((c) => [c.id, c.name])), [companies]);
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

  const resetForm = useCallback(() => {
    setCompanyId("");
    setRetailerId("");
    setBillDate(todayISODate());
    setInvoiceNumber("");
    setQuantity("1");
    setBasicAmount("");
    setGstPercent("");
    setCdAmount("");
    setCdPercent("");
    setTransportName("");
    setLrNo("");
    setLrDate(todayISODate());
    setTransportAmount("");
  }, []);

  const applyInvoicesUiSession = useCallback(
    (s: InvoicesUiSessionV2) => {
      skipResetOnOpenAddRef.current = false;
      setPanel("closed");
      if (s.panel === "closed") {
        resetForm();
        setAddStep(1);
        return;
      }
      skipResetOnOpenAddRef.current = true;
      setAddStep(s.addStep ?? 1);
      setCompanyId(s.companyId ?? "");
      setRetailerId(s.retailerId ?? "");
      setBillDate(s.billDate || todayISODate());
      setInvoiceNumber(s.invoiceNumber ?? "");
      setQuantity(s.quantity ?? "1");
      setBasicAmount(s.basicAmount ?? "");
      setGstPercent(s.gstPercent ?? "");
      setCdAmount(s.cdAmount ?? "");
      setCdPercent(s.cdPercent ?? "");
      setTransportName(s.transportName ?? "");
      setLrNo(s.lrNo ?? "");
      setLrDate(s.lrDate || todayISODate());
      setTransportAmount(s.transportAmount ?? "");
    },
    [resetForm]
  );

  useWorkspaceUiSession<InvoicesUiSessionV2>({
    route: "invoices",
    version: 2,
    restoreReady: true,
    buildSnapshot: () => ({
      v: 2,
      panel,
      addStep,
      companyId,
      retailerId,
      billDate,
      invoiceNumber,
      quantity,
      basicAmount,
      gstPercent,
      cdAmount,
      cdPercent,
      transportName,
      lrNo,
      lrDate,
      transportAmount,
    }),
    applyRestore: applyInvoicesUiSession,
    saveDeps: [
      panel,
      addStep,
      companyId,
      retailerId,
      billDate,
      invoiceNumber,
      quantity,
      basicAmount,
      gstPercent,
      cdAmount,
      cdPercent,
      transportName,
      lrNo,
      lrDate,
      transportAmount,
    ],
  });

  const finalizeClose = useCallback(() => {
    setPanel("closed");
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

  /** If `transitionend` never fires (browser quirks), avoid leaving an invisible z-100 scrim that blocks all clicks. */
  useEffect(() => {
    if (sheetOpen || !isAnimatingClose.current) return;
    const t = window.setTimeout(() => {
      if (isAnimatingClose.current && !sheetOpenRef.current) finalizeClose();
    }, 550);
    return () => window.clearTimeout(t);
  }, [sheetOpen, finalizeClose]);

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
    if (!skipResetOnOpenAddRef.current) {
      resetForm();
      setAddStep(1);
    }
    skipResetOnOpenAddRef.current = false;
    setPanel("add");
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

    setSaving(false);
    toastSuccess("Invoice saved.");
    requestClose();
    router.refresh();
  }

  const panelTitle = "Add invoice";

  const sortedInvoices = useMemo(
    () => [...invoices].sort((a, b) => b.bill_date.localeCompare(a.bill_date)),
    [invoices]
  );

  const filteredInvoices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sortedInvoices;
    return sortedInvoices.filter(inv =>
      inv.invoice_number?.toLowerCase().includes(q) ||
      inv.retailer_name?.toLowerCase().includes(q) ||
      companyMap.get(inv.company_id)?.toLowerCase().includes(q) ||
      inv.bill_date?.includes(q)
    );
  }, [sortedInvoices, searchQuery, companyMap]);
  const invoiceTotals = useMemo(() => {
    let totalBillAmount = 0;
    let totalTransportAmount = 0;
    let totalGoodsReturnAmount = 0;
    for (const inv of sortedInvoices) {
      const gross = Number(inv.total_amount ?? 0);
      totalBillAmount += gross;
      totalTransportAmount += Number(inv.transportation_amount ?? 0);
      totalGoodsReturnAmount += returnAmountByInvoiceId[inv.id] ?? 0;
    }
    return {
      totalBillAmount: round2(totalBillAmount),
      totalTransportAmount: round2(totalTransportAmount),
      totalGoodsReturnAmount: round2(totalGoodsReturnAmount),
      netAfterReturns: round2(netInvoiceTotalAfterReturns(totalBillAmount, totalGoodsReturnAmount)),
    };
  }, [sortedInvoices, returnAmountByInvoiceId]);

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

  const invoiceFormStep = (
    <div className="space-y-4">
      <div>
        <label className={labelDark} htmlFor="inv-company">
          Company <span className="text-red-400">*</span>
        </label>
        <SearchableDropdown
          id="inv-company"
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
        <label className={labelDark} htmlFor="inv-retailer">
          Retailer <span className="text-red-400">*</span>
        </label>
        <SearchableDropdown
          id="inv-retailer"
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
          onChange={(e) => handleBasicAmountChange(e.target.value)}
          disabled={saving}
          className={fieldClassDark()}
          style={inputStyle}
          placeholder="0.00"
        />
      </div>

      <div>
        <label className={labelDark} htmlFor="inv-gst-pct">
          GST (%) 
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
      </div>

      <div>
        <label className={labelDark} htmlFor="inv-cd-amt">
          Cash discount amount
        </label>
        <input
          id="inv-cd-amt"
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
        <label className={labelDark} htmlFor="inv-cd-pct">
          Cash discount (%)
        </label>
        <input
          id="inv-cd-pct"
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

      <div>
        <label className={labelDark}>Cash discount amount</label>
        <div className={`${fieldClassDark()} text-zinc-300`} style={inputStyle} aria-live="polite">
          {formatInr(computedCdAmountPreview)}
        </div>
      </div>

      <div>
        <label className={labelDark}>Taxable amount (Base - CD)</label>
        <div className={`${fieldClassDark()} text-zinc-300`} style={inputStyle} aria-live="polite">
          {formatInr(computedTaxableBasePreview)}
        </div>
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
        <p className="mt-1 text-[11px] text-zinc-500">Calculated as Basic amount - CD + GST. Transport stays separate.</p>
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className="h-5 w-1 rounded-full bg-gradient-to-b from-amber-400 to-amber-700" aria-hidden />
              <h2 className="font-login-serif text-xl font-semibold tracking-tight text-white sm:text-2xl">Invoices</h2>
            </div>
            <p className="max-w-md text-sm leading-relaxed text-zinc-400">
              Add new invoices here. Open a company or retailer to view or change existing invoices.
            </p>
          </div>
          {sortedInvoices.length > 0 && companies.length > 0 && retailers.length > 0 ? (
            <div className="w-full">
              <span className="mb-2 inline-flex w-fit items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-950/30 px-3 py-1.5 text-xs font-semibold text-amber-100/90">
                <InvoiceDocGlyph className="h-3.5 w-3.5 opacity-90" />
                {sortedInvoices.length} invoice{sortedInvoices.length === 1 ? "" : "s"}
              </span>
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                <div className="min-w-0 rounded-lg border border-amber-500/20 bg-amber-950/20 p-2 ring-1 ring-amber-500/10 sm:rounded-xl sm:p-3">
                  <p className="truncate text-[8px] font-semibold uppercase tracking-wide text-zinc-500 sm:text-[10px] sm:tracking-[0.1em]">
                    <span className="sm:hidden">Total</span>
                    <span className="hidden sm:inline">Total amount</span>
                  </p>
                  <p className="mt-0.5 hidden text-[10px] leading-snug text-zinc-600 sm:block">Invoice bill totals</p>
                  <p className="mt-1 font-mono text-[11px] font-semibold tabular-nums leading-none text-amber-100 sm:text-sm">
                    {formatInr(invoiceTotals.totalBillAmount)}
                  </p>
                  {invoiceTotals.totalGoodsReturnAmount > 0 ? (
                    <p className="mt-1 border-t border-amber-500/15 pt-1 text-[7px] leading-tight text-zinc-500 sm:mt-1.5 sm:pt-1.5 sm:text-[10px] sm:leading-snug">
                      <span className="hidden sm:inline">Net after credit notes </span>
                      <span className="sm:hidden">Net </span>
                      <span className="font-mono font-semibold text-amber-200/90">{formatInr(invoiceTotals.netAfterReturns)}</span>
                    </p>
                  ) : null}
                </div>
                <div className="min-w-0 rounded-lg border border-sky-500/20 bg-sky-950/20 p-2 ring-1 ring-sky-500/10 sm:rounded-xl sm:p-3">
                  <p className="truncate text-[8px] font-semibold uppercase tracking-wide text-zinc-500 sm:text-[10px] sm:tracking-[0.1em]">
                    <span className="sm:hidden">Transport</span>
                    <span className="hidden sm:inline">Transport amount</span>
                  </p>
                  <p className="mt-1 font-mono text-[11px] font-semibold tabular-nums leading-none text-sky-200 sm:text-sm">
                    {formatInr(invoiceTotals.totalTransportAmount)}
                  </p>
                </div>
                <div className="min-w-0 rounded-lg border border-rose-500/20 bg-rose-950/20 p-2 ring-1 ring-rose-500/10 sm:rounded-xl sm:p-3">
                  <p className="truncate text-[8px] font-semibold uppercase tracking-wide text-zinc-500 sm:text-[10px] sm:tracking-[0.1em]">
                    <span className="sm:hidden">Returns</span>
                    <span className="hidden sm:inline">Goods return amount</span>
                  </p>
                  <p className="mt-0.5 hidden text-[10px] leading-snug text-zinc-600 sm:block">Total credit notes</p>
                  <p className="mt-1 font-mono text-[11px] font-semibold tabular-nums leading-none text-rose-100 sm:text-sm">
                    {formatInr(invoiceTotals.totalGoodsReturnAmount)}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
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
            className="mt-6 rounded-xl bg-gradient-to-br from-amber-200 to-amber-100 px-5 py-3 text-sm font-semibold text-amber-950 shadow-[0_4px_20px_rgba(251,191,36,0.28)] transition hover:from-amber-100 hover:to-amber-50"
          >
            Add your first invoice
          </button>
        </div>
      ) : (
        <>
          <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search by invoice no, retailer, company…" />
          {filteredInvoices.length === 0 ? (
            <p className="py-10 text-center text-sm text-zinc-500">No invoices match &ldquo;{searchQuery}&rdquo;</p>
          ) : (
        <ul className="flex flex-col gap-3">
          {filteredInvoices.map((inv) => {
            const co = companyMap.get(inv.company_id) ?? "—";
            const q = Math.max(1, Math.floor(Number(inv.quantity ?? 1)));
            const invoiceTotal = Number(inv.invoice_amount ?? 0);
            const cnAmount = returnAmountByInvoiceId[inv.id] ?? 0;
            const amountPaid = Number(inv.payment_received ?? 0);
            const balance = Number(inv.outstanding_amount ?? 0);
            const isFullyPaid = balance <= 0;
            return (
              <li key={inv.id}>
                <div className="overflow-hidden rounded-2xl border border-zinc-800/70 bg-gradient-to-br from-zinc-950 to-zinc-900/80 shadow-[0_4px_24px_rgba(0,0,0,0.4)] ring-1 ring-white/[0.04]">
                  {/* Header row */}
                  <div className="flex items-stretch">
                    <span
                      className="w-1 shrink-0 bg-gradient-to-b from-amber-400 to-amber-600"
                      aria-hidden
                    />
                    <div className="flex min-w-0 flex-1 items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate font-mono text-[15px] font-semibold tracking-tight text-white">
                          {inv.invoice_number}
                        </p>
                        <p className="mt-0.5 truncate text-sm text-zinc-400">
                          {inv.retailer_name?.trim() || "Retailer"}{" "}
                          <span className="text-zinc-600">·</span>{" "}
                          <span className="text-zinc-500">{co}</span>
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className="text-[11px] text-zinc-500">
                          {inv.bill_date?.slice(0, 10) ?? "—"}
                        </span>
                        <span className="rounded-md bg-zinc-800/70 px-2 py-0.5 font-mono text-[11px] font-medium text-zinc-400">
                          Qty {q}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="mx-4 h-px bg-zinc-800/60" />

                  {/* Financial grid */}
                  <div className="grid grid-cols-2 gap-px bg-zinc-800/50">
                    {/* Invoice Total */}
                    <div className="flex items-center justify-between bg-zinc-950/60 px-3 py-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Invoice</span>
                      <span className="font-mono text-[12px] font-semibold tabular-nums text-amber-200">
                        {formatInr(invoiceTotal)}
                      </span>
                    </div>

                    {/* CN Amount */}
                    <div className="flex items-center justify-between bg-zinc-950/60 px-3 py-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">CN</span>
                      <span className={`font-mono text-[12px] font-semibold tabular-nums ${cnAmount > 0 ? "text-rose-300" : "text-zinc-600"}`}>
                        {cnAmount > 0 ? formatInr(cnAmount) : "—"}
                      </span>
                    </div>

                    {/* Amount Paid */}
                    <div className="flex items-center justify-between bg-zinc-950/60 px-3 py-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Paid</span>
                      <span className={`font-mono text-[12px] font-semibold tabular-nums ${amountPaid > 0 ? "text-emerald-300" : "text-zinc-600"}`}>
                        {amountPaid > 0 ? formatInr(amountPaid) : "—"}
                      </span>
                    </div>

                    {/* Balance */}
                    <div className="flex items-center justify-between bg-zinc-950/60 px-3 py-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Balance</span>
                      <span className={`font-mono text-[12px] font-semibold tabular-nums ${isFullyPaid ? "text-emerald-400" : "text-sky-300"}`}>
                        {isFullyPaid ? "Paid ✓" : formatInr(balance)}
                      </span>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
          )}
        </>
      )}

      {companies.length > 0 && retailers.length > 0 ? (
        <button
          type="button"
          onClick={openAdd}
          className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-200 to-amber-100 text-amber-950 shadow-[0_8px_32px_rgba(251,191,36,0.35),0_2px_8px_rgba(0,0,0,0.4)] ring-2 ring-[#101014] transition hover:scale-105 hover:from-amber-100 hover:to-amber-50 active:scale-95 md:bottom-10 md:right-10"
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
            className={`fixed inset-0 z-[100] bg-black/60 transition-opacity duration-300 ${
              sheetOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
            }`}
            onClick={() => !saving && requestClose()}
          />
          <div
            className={`fixed inset-0 z-[101] flex min-h-0 flex-col border-zinc-700/90 bg-[#16181f] pt-[env(safe-area-inset-top)] shadow-[0_-12px_40px_rgba(0,0,0,0.45)] transition-transform duration-[380ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform max-md:rounded-t-3xl max-md:border max-md:border-b-0 md:inset-y-0 md:left-auto md:right-0 md:w-full md:max-w-lg md:rounded-none md:rounded-l-3xl md:border md:border-l md:border-t-0 md:pt-0 md:shadow-[-12px_0_40px_rgba(0,0,0,0.45)] ${
              sheetOpen
                ? "pointer-events-auto translate-y-0 md:translate-x-0"
                : "pointer-events-none translate-y-full md:translate-y-0 md:translate-x-full"
            }`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="invoice-sheet-title"
            onTransitionEnd={handleSheetTransitionEnd}
          >
            <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-zinc-600 md:hidden" aria-hidden />
            <div className="flex shrink-0 items-center gap-3 border-b border-zinc-700/80 bg-gradient-to-b from-[#181a22] to-[#16181f] px-4 py-3.5">
              <button
                type="button"
                onClick={() => {
                  if (panel === "add" && addStep > 1) {
                    setAddStep(1);
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

            <div className="relative min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 pb-32">
              {panel === "add" && (
                <form
                  id="invoice-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (addStep === 1) return;
                    void saveNew();
                  }}
                >
                  <InvoiceAddStepper step={addStep} />
                  {addStep === 1 ? invoiceFormStep : transportFormStep}
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
                    className="flex min-h-[48px] flex-[1.15] items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-amber-200 to-amber-100 py-3 text-sm font-semibold text-amber-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] transition hover:from-amber-100 hover:to-amber-50 disabled:opacity-50"
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
                    className="min-h-[48px] flex-[1.15] rounded-xl bg-gradient-to-br from-amber-200 to-amber-100 py-3 text-sm font-semibold text-amber-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] transition hover:from-amber-100 hover:to-amber-50 disabled:opacity-50"
                  >
                    {saving ? "Saving…" : "Save invoice"}
                  </button>
                </div>
              </div>
            )}

          </div>
        </>
      )}
    </div>
  );
}
