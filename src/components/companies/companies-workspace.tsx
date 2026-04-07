"use client";

import { createClient } from "@/lib/supabase/client";
import { StateSearchSelect } from "@/components/companies/state-search-select";
import { InvoiceEditForm } from "@/components/invoices/invoice-edit-form";
import { skipRequiredFieldValidation } from "@/lib/dev-validation";
import { toastError, toastSuccess } from "@/lib/toast";
import type { CompanyRow } from "@/types/company";
import type { RetailerInvoiceRow } from "@/types/invoice";
import { useRouter } from "next/navigation";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

type Props = {
  initialCompanies: CompanyRow[];
  /** Invoices per company id (from server aggregate). */
  initialInvoiceCountByCompany?: Record<string, number>;
};

type PanelMode = "closed" | "add" | "view" | "edit";

type CompanyViewTab = "profile" | "invoices";

/** Charcoal surface — slightly lifted from pure black */
const CANVAS = "#101014";
const INPUT_BG = "#1E1E24";

function trimNull(s: string): string | null {
  const v = s.trim();
  return v === "" ? null : v;
}

function phoneDigitsFromStored(phone: string | null | undefined): string {
  if (!phone?.trim()) return "";
  const d = phone.replace(/\D/g, "");
  if (d.length >= 12 && d.startsWith("91")) return d.slice(2, 12);
  if (d.length === 10) return d;
  return d.slice(-10);
}

function toE164Contact(digits: string): string | null {
  const d = digits.replace(/\D/g, "").slice(0, 10);
  return d.length === 10 ? `+91${d}` : null;
}

function fieldClassDark(multiline = false) {
  return [
    "w-full rounded-xl border border-white/10 px-3.5 py-3 text-[15px] text-white shadow-inner outline-none transition",
    "placeholder:text-zinc-500 focus:border-zinc-500/60 focus:ring-2 focus:ring-zinc-500/20",
    multiline ? "min-h-[100px] resize-y" : "",
  ].join(" ");
}

const labelDark = "mb-1.5 block text-sm font-medium text-zinc-100";

function formatInr(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(
    Number.isFinite(n) ? n : 0
  );
}

function ViewRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  const v = value?.trim();
  return (
    <div className="border-b border-zinc-800/40 py-3.5 last:border-b-0">
      <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-zinc-500">{label}</p>
      <p className={`mt-1.5 whitespace-pre-wrap text-[15px] leading-snug text-zinc-50 ${mono ? "font-mono text-sm tracking-tight text-zinc-100" : ""}`}>
        {v || "—"}
      </p>
    </div>
  );
}

function StepConnector({
  completed,
  animating,
}: {
  completed: boolean;
  animating: boolean;
}) {
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

function Stepper({ step }: { step: 1 | 2 | 3 }) {
  const [animatingConnector, setAnimatingConnector] = useState<0 | 1 | null>(null);
  const prevStepRef = useRef<1 | 2 | 3>(step);
  const isInitialSync = useRef(true);

  useEffect(() => {
    if (isInitialSync.current) {
      isInitialSync.current = false;
      prevStepRef.current = step;
      return;
    }
    const prev = prevStepRef.current;
    if (step > prev) {
      if (step === 2) setAnimatingConnector(0);
      else if (step === 3) setAnimatingConnector(1);
    }
    prevStepRef.current = step;
  }, [step]);

  useEffect(() => {
    if (animatingConnector === null) return;
    const t = window.setTimeout(() => setAnimatingConnector(null), 760);
    return () => clearTimeout(t);
  }, [animatingConnector]);

  const steps: { n: 1 | 2 | 3; label: string }[] = [
    { n: 1, label: "Details" },
    { n: 2, label: "Banking" },
    { n: 3, label: "Verify" },
  ];

  return (
    <div className="mb-6 px-1">
      {/* Circles + connectors share one row so the line runs the full gap between circles */}
      <div className="flex w-full items-center">
        {steps.map((s, i) => {
          const active = step === s.n;
          const done = step > s.n;
          const connectorCompleted = i < steps.length - 1 && step > s.n;
          const connectorAnimating = i < steps.length - 1 && animatingConnector === (i as 0 | 1);

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
      {/* Labels line up under each circle; flex-1 spacers match connector widths above */}
      <div className="mt-2 flex w-full items-start">
        {steps.map((s, i) => {
          const active = step === s.n;
          return (
            <Fragment key={`step-label-${s.n}`}>
              <div className="flex w-9 shrink-0 flex-col items-center">
                <span className={`text-center text-[11px] font-medium leading-tight sm:text-xs ${active ? "text-zinc-300" : "text-zinc-500"}`}>
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

function InvoiceDocIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BuildingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 9h.01M9 13h.01M9 17h.01M15 14h.01M15 18h.01" strokeLinecap="round" />
    </svg>
  );
}

function StatIconWrap({ tone, children }: { tone: "neutral" | "cyan" | "teal"; children: ReactNode }) {
  const cls =
    tone === "neutral"
      ? "bg-white/[0.06] text-zinc-300 ring-white/[0.08]"
      : tone === "cyan"
        ? "bg-cyan-500/14 text-cyan-200 ring-cyan-400/15"
        : "bg-teal-500/14 text-teal-200 ring-teal-400/18";
  return (
    <div
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ring-1 ${cls}`}
      aria-hidden
    >
      {children}
    </div>
  );
}

function ViewSectionCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-zinc-800/70 bg-zinc-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] ring-1 ring-inset ring-white/[0.04] ${className}`}
    >
      {children}
    </div>
  );
}

function ViewSubsectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="border-b border-zinc-800/60 bg-zinc-900 px-4 py-2.5">
      <p className="border-l-2 border-teal-500/50 pl-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">{children}</p>
    </div>
  );
}

export function CompaniesWorkspace({ initialCompanies, initialInvoiceCountByCompany = {} }: Props) {
  const router = useRouter();
  const [companies, setCompanies] = useState<CompanyRow[]>(initialCompanies);
  const [panel, setPanel] = useState<PanelMode>("closed");
  const prevPanelRef = useRef<PanelMode>("closed");
  const [sheetOpen, setSheetOpen] = useState(false);
  const sheetOpenRef = useRef(sheetOpen);
  const isAnimatingClose = useRef(false);
  const [addStep, setAddStep] = useState<1 | 2 | 3>(1);
  const [selected, setSelected] = useState<CompanyRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CompanyRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [companyInvoices, setCompanyInvoices] = useState<RetailerInvoiceRow[]>([]);
  const [companyInvoicesLoading, setCompanyInvoicesLoading] = useState(false);
  const [invoiceDeleteTarget, setInvoiceDeleteTarget] = useState<RetailerInvoiceRow | null>(null);
  const [invoiceDeleting, setInvoiceDeleting] = useState(false);
  /** When set, company sheet shows inline invoice editor instead of the invoice list. */
  const [inlineInvoiceEdit, setInlineInvoiceEdit] = useState<RetailerInvoiceRow | null>(null);
  const [invoiceCountByCompany, setInvoiceCountByCompany] = useState<Record<string, number>>(initialInvoiceCountByCompany);
  const [companyViewTab, setCompanyViewTab] = useState<CompanyViewTab>("profile");

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [contactDigits, setContactDigits] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [stateVal, setStateVal] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [telephone, setTelephone] = useState("");
  const [alternativeDigits, setAlternativeDigits] = useState("");
  const [gstNo, setGstNo] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankIfsc, setBankIfsc] = useState("");
  const [bankBranch, setBankBranch] = useState("");

  useEffect(() => {
    setCompanies(initialCompanies);
  }, [initialCompanies]);

  useEffect(() => {
    setInvoiceCountByCompany(initialInvoiceCountByCompany);
  }, [initialInvoiceCountByCompany]);

  const totalInvoicesAcrossCompanies = useMemo(
    () => companies.reduce((sum, c) => sum + (invoiceCountByCompany[c.id] ?? 0), 0),
    [companies, invoiceCountByCompany]
  );

  useEffect(() => {
    if (panel !== "view" || !selected) {
      setCompanyInvoices([]);
      setCompanyInvoicesLoading(false);
      return;
    }
    let cancelled = false;
    setCompanyInvoicesLoading(true);
    (async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("retailer_invoices")
        .select("*")
        .eq("company_id", selected.id)
        .order("bill_date", { ascending: false });
      if (cancelled) return;
      setCompanyInvoicesLoading(false);
      if (error) {
        toastError(error.message);
        setCompanyInvoices([]);
        return;
      }
      setCompanyInvoices((data ?? []) as RetailerInvoiceRow[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [panel, selected?.id]);

  const resetForm = useCallback(() => {
    setName("");
    setAddress("");
    setContactDigits("");
    setEmail("");
    setCity("");
    setStateVal("");
    setPinCode("");
    setTelephone("");
    setAlternativeDigits("");
    setGstNo("");
    setBankName("");
    setBankAccountNumber("");
    setBankIfsc("");
    setBankBranch("");
  }, []);

  const hydrateFromCompany = useCallback((c: CompanyRow) => {
    setName(c.name ?? "");
    setAddress(c.registered_address ?? "");
    setContactDigits(phoneDigitsFromStored(c.phone_no));
    setEmail(c.email ?? "");
    setCity(c.city ?? "");
    setStateVal(c.state ?? "");
    setPinCode(c.pin_code ?? "");
    setTelephone(c.telephone ?? "");
    setAlternativeDigits(phoneDigitsFromStored(c.alternative_phone));
    setGstNo(c.gst_no ?? "");
    setBankName(c.bank_name ?? "");
    setBankAccountNumber(c.bank_account_number ?? "");
    setBankIfsc(c.bank_ifsc ?? "");
    setBankBranch(c.bank_branch ?? "");
  }, []);

  const finalizeClose = useCallback(() => {
    setPanel("closed");
    setSelected(null);
    setInlineInvoiceEdit(null);
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

  function handleSheetTransitionEnd(e: React.TransitionEvent<HTMLDivElement>) {
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
    setSelected(null);
    resetForm();
    setAddStep(1);
    setPanel("add");
  };

  const openView = (c: CompanyRow) => {
    setSelected(c);
    hydrateFromCompany(c);
    setCompanyViewTab("profile");
    setInlineInvoiceEdit(null);
    setPanel("view");
  };

  const openEdit = (c: CompanyRow) => {
    setSelected(c);
    hydrateFromCompany(c);
    setPanel("edit");
  };

  const startEdit = () => {
    if (!selected) return;
    openEdit(selected);
  };

  function buildPayload(isDraft: boolean) {
    const dev = skipRequiredFieldValidation();
    const resolvedName = name.trim() || (dev ? "Untitled (dev)" : "");
    return {
      name: resolvedName,
      registered_address: trimNull(address),
      phone_no: toE164Contact(contactDigits),
      telephone: trimNull(telephone),
      alternative_phone: toE164Contact(alternativeDigits),
      mop: null,
      gst_no: trimNull(gstNo.toUpperCase()),
      email: trimNull(email),
      city: trimNull(city),
      state: trimNull(stateVal),
      pin_code: trimNull(pinCode.replace(/\D/g, "").slice(0, 6)),
      bank_details: null,
      bank_account_holder: trimNull(resolvedName),
      bank_name: trimNull(bankName),
      bank_account_number: trimNull(bankAccountNumber.replace(/\s/g, "")),
      bank_ifsc: trimNull(bankIfsc.toUpperCase()),
      bank_branch: trimNull(bankBranch),
      bank_account_type: null,
      is_draft: isDraft,
    };
  }

  function validateCore(): boolean {
    if (skipRequiredFieldValidation()) return true;
    if (!name.trim()) {
      toastError("Company name is required.");
      return false;
    }
    const g = gstNo.trim().toUpperCase();
    if (g.length > 0 && g.length !== 15) {
      toastError("GST number must be 15 characters or leave it blank.");
      return false;
    }
    const d = contactDigits.replace(/\D/g, "");
    if (d.length > 0 && d.length !== 10) {
      toastError("Contact number must be 10 digits or leave it blank.");
      return false;
    }
    const alt = alternativeDigits.replace(/\D/g, "");
    if (alt.length > 0 && alt.length !== 10) {
      toastError("Alternative number must be 10 digits or leave it blank.");
      return false;
    }
    if (d.length === 10 && alt.length === 10 && d === alt) {
      toastError("Alternative number must differ from the primary phone number.");
      return false;
    }
    const ifsc = bankIfsc.trim().toUpperCase();
    if (ifsc.length > 0 && ifsc.length !== 11) {
      toastError("IFSC code must be 11 characters or leave bank fields blank.");
      return false;
    }
    return true;
  }

  function validateStep1Continue(): boolean {
    if (skipRequiredFieldValidation()) return true;
    if (!name.trim()) {
      toastError("Company name is required.");
      return false;
    }
    const g = gstNo.trim().toUpperCase();
    if (g.length !== 15) {
      toastError("Enter a valid 15-character GST number.");
      return false;
    }
    const d = contactDigits.replace(/\D/g, "");
    if (d.length !== 10) {
      toastError("Enter a 10-digit mobile number.");
      return false;
    }
    const alt = alternativeDigits.replace(/\D/g, "");
    if (alt.length > 0 && alt.length !== 10) {
      toastError("Alternative number must be 10 digits or leave it blank.");
      return false;
    }
    if (d.length === 10 && alt.length === 10 && d === alt) {
      toastError("Alternative number must differ from the primary phone number.");
      return false;
    }
    return true;
  }

  function validateStep2Continue(): boolean {
    if (skipRequiredFieldValidation()) return true;
    const hasAny =
      bankName.trim() ||
      bankAccountNumber.trim() ||
      bankIfsc.trim() ||
      bankBranch.trim();
    if (!hasAny) return true;
    const ifsc = bankIfsc.trim().toUpperCase();
    if (ifsc.length > 0 && ifsc.length !== 11) {
      toastError("IFSC must be 11 characters.");
      return false;
    }
    return true;
  }

  async function saveDraft() {
    if (!skipRequiredFieldValidation() && !name.trim()) {
      toastError("Add a company name to save a draft.");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toastError("You must be signed in.");
      setSaving(false);
      return;
    }
    const payload = buildPayload(true);
    const { data, error } = await supabase
      .from("companies")
      .insert({ ...payload, user_id: user.id })
      .select()
      .single();
    setSaving(false);
    if (error) {
      toastError(error.message);
      return;
    }
    if (data) {
      setCompanies((prev) => [data as CompanyRow, ...prev]);
      toastSuccess("Draft saved.");
      requestClose();
      router.refresh();
    }
  }

  async function saveNew() {
    if (!validateCore()) return;
    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toastError("You must be signed in.");
      setSaving(false);
      return;
    }
    const payload = buildPayload(false);
    const { data, error } = await supabase
      .from("companies")
      .insert({ ...payload, user_id: user.id })
      .select()
      .single();
    setSaving(false);
    if (error) {
      toastError(error.message);
      return;
    }
    if (data) {
      setCompanies((prev) => [data as CompanyRow, ...prev]);
      toastSuccess("Company added.");
      requestClose();
      router.refresh();
    }
  }

  async function saveEdit() {
    if (!selected || !validateCore()) return;
    setSaving(true);
    const supabase = createClient();
    const payload = buildPayload(false);
    const { data, error } = await supabase.from("companies").update(payload).eq("id", selected.id).select().single();
    setSaving(false);
    if (error) {
      toastError(error.message);
      return;
    }
    if (data) {
      const row = data as CompanyRow;
      setCompanies((prev) => prev.map((c) => (c.id === row.id ? row : c)));
      setSelected(row);
      toastSuccess("Company updated.");
      setPanel("view");
      router.refresh();
    }
  }

  async function confirmDeleteInvoice() {
    if (!invoiceDeleteTarget) return;
    setInvoiceDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.from("retailer_invoices").delete().eq("id", invoiceDeleteTarget.id);
    setInvoiceDeleting(false);
    if (error) {
      toastError(error.message);
      return;
    }
    const prevLen = companyInvoices.length;
    setCompanyInvoices((prev) => prev.filter((i) => i.id !== invoiceDeleteTarget.id));
    if (inlineInvoiceEdit?.id === invoiceDeleteTarget.id) setInlineInvoiceEdit(null);
    if (selected) {
      setInvoiceCountByCompany((prev) => ({
        ...prev,
        [selected.id]: Math.max(0, (prev[selected.id] ?? prevLen) - 1),
      }));
    }
    toastSuccess("Invoice deleted.");
    setInvoiceDeleteTarget(null);
    router.refresh();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.from("companies").delete().eq("id", deleteTarget.id);
    setDeleting(false);
    if (error) {
      toastError(error.message);
      return;
    }
    setCompanies((prev) => prev.filter((c) => c.id !== deleteTarget.id));
    setInvoiceCountByCompany((prev) => {
      const next = { ...prev };
      delete next[deleteTarget.id];
      return next;
    });
    toastSuccess("Company deleted.");
    setDeleteTarget(null);
    if (selected?.id === deleteTarget.id) requestClose();
    router.refresh();
  }

  const panelTitle = useMemo(() => {
    if (panel === "add") return "Add company";
    if (panel === "edit") return "Edit company";
    if (panel === "view") return selected?.name ?? "Company";
    return "";
  }, [panel, selected]);

  const companyViewStats = useMemo(() => {
    if (companyInvoicesLoading) {
      return { loading: true as const, invoiceCount: 0, retailerCount: 0, totalAmount: 0 };
    }
    let total = 0;
    const retailerKeys = new Set<string>();
    for (const inv of companyInvoices) {
      total += Number(inv.total_amount ?? 0);
      if (inv.retailer_id) {
        retailerKeys.add(`id:${inv.retailer_id}`);
      } else if (inv.retailer_name?.trim()) {
        retailerKeys.add(`name:${inv.retailer_name.trim().toLowerCase()}`);
      }
    }
    return {
      loading: false as const,
      invoiceCount: companyInvoices.length,
      retailerCount: retailerKeys.size,
      totalAmount: total,
    };
  }, [companyInvoices, companyInvoicesLoading]);

  const inputStyle = { backgroundColor: INPUT_BG } as React.CSSProperties;

  return (
    <div
      className="relative -mx-4 -mt-5 flex min-h-[calc(100dvh-7.5rem)] flex-col bg-[#12141D] px-4 pb-28 pt-3 text-zinc-100 md:mx-0 md:mt-0 md:min-h-[70vh] md:rounded-2xl md:border md:border-zinc-800/80 md:pb-10 md:pt-6"
      style={{ backgroundColor: CANVAS }}
    >
      <div className="mb-6">
        <div className="mb-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span
                className="h-5 w-1 rounded-full bg-gradient-to-b from-cyan-400 via-teal-500 to-teal-700 shadow-[0_0_12px_rgba(45,212,191,0.35)]"
                aria-hidden
              />
              <h2 className="font-login-serif text-xl font-semibold tracking-tight text-white sm:text-2xl">Companies</h2>
            </div>
            <p className="max-w-xl text-sm leading-relaxed text-zinc-400">
              Billing entities for your invoices—contact, GST, and bank details in one place.
            </p>
          </div>
          {companies.length > 0 ? (
            <div className="flex shrink-0 gap-2 sm:justify-end">
              <div className="rounded-xl border border-zinc-700/60 bg-zinc-900 px-3.5 py-2.5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Companies</p>
                <p className="mt-0.5 text-lg font-bold tabular-nums text-white">{companies.length}</p>
              </div>
              <div className="rounded-xl border border-cyan-900/40 bg-zinc-900 px-3.5 py-2.5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] ring-1 ring-cyan-500/10">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Invoices</p>
                <p className="mt-0.5 text-lg font-bold tabular-nums text-cyan-200">{totalInvoicesAcrossCompanies}</p>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {companies.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-700/70 bg-gradient-to-b from-zinc-900/50 via-zinc-950/80 to-zinc-950 px-6 py-16 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-zinc-600/50 bg-zinc-900 text-zinc-400 shadow-[0_8px_32px_rgba(0,0,0,0.35)] ring-1 ring-white/[0.06]">
            <BuildingIcon className="h-8 w-8 opacity-90" />
          </div>
          <p className="text-lg font-semibold tracking-tight text-white">No companies yet</p>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-zinc-400">
            Add a billing entity to use on invoices and link to retailers.
          </p>
          <button
            type="button"
            onClick={openAdd}
            className="mt-7 rounded-xl bg-zinc-200 px-6 py-3.5 text-sm font-semibold text-zinc-950 shadow-[0_4px_20px_rgba(255,255,255,0.08)] transition hover:bg-white active:scale-[0.98]"
          >
            Add your first company
          </button>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {companies.map((c) => {
            const phoneDigits = phoneDigitsFromStored(c.phone_no);
            const phoneLabel = phoneDigits ? `+91 ${phoneDigits}` : "—";
            const invCount = invoiceCountByCompany[c.id] ?? 0;
            const gstShort = c.gst_no?.trim() ? `${c.gst_no.slice(0, 2)}···${c.gst_no.slice(-4)}` : null;

            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => openView(c)}
                  className="group flex w-full items-stretch overflow-hidden rounded-2xl border border-zinc-800/80 bg-gradient-to-br from-zinc-950 to-zinc-950/85 text-left shadow-[0_1px_0_rgba(255,255,255,0.05)_inset,0_8px_24px_rgba(0,0,0,0.2)] ring-1 ring-white/[0.03] transition hover:border-zinc-600/80 hover:from-zinc-900/95 hover:to-zinc-950 hover:shadow-[0_12px_40px_rgba(0,0,0,0.35)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500/45 active:scale-[0.995]"
                >
                  <span
                    className="w-1.5 shrink-0 bg-gradient-to-b from-cyan-400/95 via-teal-500/85 to-teal-700/70 shadow-[2px_0_12px_rgba(45,212,191,0.2)]"
                    aria-hidden
                  />
                  <div className="flex min-w-0 flex-1 items-center gap-3 py-4 pl-4 pr-3 sm:gap-4 sm:pl-5 sm:pr-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                        <h3 className="truncate text-[17px] font-semibold tracking-tight text-white">{c.name}</h3>
                        {c.is_draft ? (
                          <span className="shrink-0 rounded-md border border-amber-500/25 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200/90">
                            Draft
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-500">
                        <span className="font-mono tabular-nums tracking-tight text-zinc-400">{phoneLabel}</span>
                        {gstShort ? (
                          <span className="text-xs text-zinc-500">
                            GST <span className="font-mono text-zinc-400">{gstShort}</span>
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center sm:gap-3">
                      <div
                        className="flex items-center gap-1.5 rounded-full border border-zinc-700/60 bg-zinc-900 px-2.5 py-1 text-xs font-medium text-zinc-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                        title={`${invCount} invoice${invCount === 1 ? "" : "s"}`}
                      >
                        <InvoiceDocIcon className="h-3.5 w-3.5 text-cyan-400" />
                        <span className="tabular-nums">{invCount}</span>
                        <span className="hidden text-zinc-500 sm:inline">inv.</span>
                      </div>
                      <span className="text-zinc-600 transition group-hover:text-zinc-400" aria-hidden>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* FAB — opens add flow with sheet animation */}
      <button
        type="button"
        onClick={openAdd}
        className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-teal-300 to-teal-200 text-teal-950 shadow-[0_8px_32px_rgba(45,212,191,0.4),0_2px_8px_rgba(0,0,0,0.4)] ring-2 ring-[#101014] transition hover:scale-105 hover:from-teal-200 hover:to-teal-100 active:scale-95 md:bottom-10 md:right-10"
        aria-label="Add company"
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
          <path d="M12 5v14M5 12h14" strokeLinecap="round" />
        </svg>
      </button>

      {panel !== "closed" && (
        <>
          <button
            type="button"
            aria-label="Close"
            className={`fixed inset-0 z-[85] bg-black/60 transition-opacity duration-300 ${
              sheetOpen ? "opacity-100" : "opacity-0"
            }`}
            onClick={() => !saving && requestClose()}
          />
          <div
            className={`fixed inset-x-0 bottom-0 top-12 z-[90] flex min-h-0 max-h-[100dvh] flex-col overflow-hidden rounded-t-3xl border border-zinc-600/50 bg-[#16181f] shadow-[0_-16px_48px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.06)] md:left-auto md:right-0 md:top-0 md:max-h-none md:w-full md:max-w-lg md:rounded-none md:rounded-l-3xl md:border-l md:border-t-0`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="company-sheet-title"
            onTransitionEnd={handleSheetTransitionEnd}
            style={{
              transform: sheetOpen ? "translateY(0)" : "translateY(100%)",
              transition: "transform 380ms cubic-bezier(0.22, 1, 0.36, 1)",
              willChange: "transform",
            }}
          >
            <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-zinc-600/90 md:hidden" aria-hidden />
            <div className="relative z-20 flex shrink-0 items-center gap-3 border-b border-zinc-700/70 bg-gradient-to-b from-[#181a22] to-[#16181f] px-4 py-3.5">
              <button
                type="button"
                onClick={() => {
                  if (panel === "add" && addStep > 1) {
                    setAddStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3) : s));
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
              <h2
                id="company-sheet-title"
                className="flex-1 truncate text-center text-lg font-semibold tracking-tight text-white md:text-left"
              >
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

            {panel === "view" && selected && !inlineInvoiceEdit && (
              <div className="shrink-0 border-b border-zinc-800/80 bg-[#16181f] px-4 pb-3 pt-0 shadow-[0_8px_28px_rgba(0,0,0,0.55)]">
                    <div
                      role="region"
                      aria-label="Invoice summary for this company"
                      className="mb-3 rounded-xl bg-zinc-900 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ring-1 ring-white/[0.04]"
                    >
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        <div className="flex gap-2.5 rounded-lg border border-zinc-700/50 bg-zinc-950 px-2.5 py-2.5 sm:min-h-[5.5rem]">
                          <StatIconWrap tone="neutral">
                            <InvoiceDocIcon className="h-4 w-4" />
                          </StatIconWrap>
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Invoices</p>
                            {companyViewStats.loading ? (
                              <div className="mt-2 h-7 w-12 animate-pulse rounded-md bg-zinc-800/80" aria-hidden />
                            ) : (
                              <p className="mt-0.5 text-xl font-bold tabular-nums text-white">{companyViewStats.invoiceCount}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2.5 rounded-lg border border-zinc-700/50 bg-zinc-950 px-2.5 py-2.5 sm:min-h-[5.5rem]">
                          <StatIconWrap tone="cyan">
                            <BuildingIcon className="h-4 w-4" />
                          </StatIconWrap>
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Retailers</p>
                            {companyViewStats.loading ? (
                              <div className="mt-2 h-7 w-12 animate-pulse rounded-md bg-zinc-800/80" aria-hidden />
                            ) : (
                              <p className="mt-0.5 text-xl font-bold tabular-nums text-cyan-200">{companyViewStats.retailerCount}</p>
                            )}
                          </div>
                        </div>
                        <div className="col-span-2 flex gap-2.5 rounded-lg border border-teal-800/45 bg-zinc-950 px-2.5 py-2.5 ring-1 ring-teal-500/10 sm:col-span-1">
                          <StatIconWrap tone="teal">
                            <span className="text-[15px] font-semibold leading-none">₹</span>
                          </StatIconWrap>
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Total amount</p>
                            {companyViewStats.loading ? (
                              <div className="mt-2 h-7 w-28 max-w-full animate-pulse rounded-md bg-zinc-800/80" aria-hidden />
                            ) : (
                              <p className="mt-0.5 truncate font-mono text-base font-bold tabular-nums tracking-tight text-teal-200 sm:text-lg">
                                {formatInr(companyViewStats.totalAmount)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div
                      role="tablist"
                      aria-label="Company details"
                      className="flex gap-1 rounded-xl border border-zinc-700/70 bg-zinc-950 p-1 shadow-[inset_0_2px_8px_rgba(0,0,0,0.35)] ring-1 ring-white/[0.04]"
                    >
                      <button
                        type="button"
                        role="tab"
                        aria-selected={companyViewTab === "profile"}
                        id="tab-company-profile"
                        aria-controls="panel-company-profile"
                        onClick={() => {
                          setCompanyViewTab("profile");
                          setInlineInvoiceEdit(null);
                        }}
                        className={`relative flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition ${
                          companyViewTab === "profile"
                            ? "bg-zinc-600 text-white shadow-[0_2px_8px_rgba(0,0,0,0.35)] ring-1 ring-white/10"
                            : "text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300"
                        }`}
                      >
                        <BuildingIcon className="h-4 w-4 shrink-0 opacity-90" />
                        Company
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={companyViewTab === "invoices"}
                        id="tab-company-invoices"
                        aria-controls="panel-company-invoices"
                        onClick={() => setCompanyViewTab("invoices")}
                        className={`relative flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition ${
                          companyViewTab === "invoices"
                            ? "bg-zinc-600 text-white shadow-[0_2px_8px_rgba(0,0,0,0.35)] ring-1 ring-white/10"
                            : "text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300"
                        }`}
                      >
                        <InvoiceDocIcon className="h-4 w-4 shrink-0 opacity-90" />
                        <span>Invoices</span>
                        {!companyInvoicesLoading ? (
                          <span
                            className={`min-w-[1.25rem] rounded-md px-1.5 py-0.5 text-xs font-bold tabular-nums ${
                              companyViewTab === "invoices" ? "bg-teal-500/25 text-teal-100" : "bg-zinc-800 text-zinc-400"
                            }`}
                          >
                            {companyInvoices.length}
                          </span>
                        ) : (
                          <span className="h-4 w-4 animate-pulse rounded bg-zinc-700" aria-hidden />
                        )}
                      </button>
                    </div>
              </div>
            )}

            <div
              className={`relative min-h-0 min-w-0 flex-1 bg-[#16181f] px-4 py-4 ${
                inlineInvoiceEdit
                  ? "flex flex-col overflow-hidden pb-6"
                  : "overflow-y-auto overscroll-contain pb-32"
              }`}
            >
              {panel === "view" && selected && (
                <div
                  className={
                    inlineInvoiceEdit ? "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden" : undefined
                  }
                >
                  {companyViewTab === "profile" ? (
                    <section
                      id="panel-company-profile"
                      role="tabpanel"
                      aria-labelledby="tab-company-profile"
                      className="relative z-0"
                    >
                      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <p className="max-w-md text-xs leading-relaxed text-zinc-500">
                          Contact, GST, location, and bank details for this billing entity.
                        </p>
                        <div className="relative z-0 flex w-full shrink-0 items-center gap-2 rounded-xl border border-zinc-800/90 bg-zinc-900 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:w-auto">
                          <button
                            type="button"
                            onClick={startEdit}
                            className="min-h-[40px] flex-1 rounded-lg border border-zinc-600/70 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-700 hover:text-white sm:flex-none"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(selected)}
                            className="min-h-[40px] flex-1 rounded-lg border border-red-500/45 bg-red-950 px-4 py-2 text-sm font-medium text-red-200 transition hover:border-red-400/60 hover:bg-red-900 sm:flex-none"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      <ViewSectionCard>
                        <ViewSubsectionLabel>Contact &amp; registration</ViewSubsectionLabel>
                        <div className="px-3 pb-2 pt-0.5 sm:px-4">
                          <ViewRow label="Company name" value={selected.name ?? ""} />
                          {selected.is_draft ? <ViewRow label="Status" value="Draft" /> : null}
                          <ViewRow label="Telephone" value={selected.telephone ?? ""} />
                          <ViewRow
                            label="Phone"
                            value={phoneDigitsFromStored(selected.phone_no) ? `+91 ${phoneDigitsFromStored(selected.phone_no)}` : ""}
                            mono
                          />
                          <ViewRow
                            label="Alternative"
                            value={
                              phoneDigitsFromStored(selected.alternative_phone)
                                ? `+91 ${phoneDigitsFromStored(selected.alternative_phone)}`
                                : ""
                            }
                            mono
                          />
                          <ViewRow label="Email address" value={selected.email ?? ""} />
                          <ViewRow label="Address" value={selected.registered_address ?? ""} />
                          <ViewRow label="City" value={selected.city ?? ""} />
                          <ViewRow label="State" value={selected.state ?? ""} />
                          <ViewRow label="PIN code" value={selected.pin_code ?? ""} mono />
                          <ViewRow label="GST no." value={selected.gst_no ?? ""} mono />
                        </div>

                        <ViewSubsectionLabel>Bank details</ViewSubsectionLabel>
                        <div className="px-3 pb-2 pt-0.5 sm:px-4">
                          <ViewRow label="Account holder" value={selected.bank_account_holder ?? ""} />
                          <ViewRow label="Bank name" value={selected.bank_name ?? ""} />
                          <ViewRow label="Account number" value={selected.bank_account_number ?? ""} mono />
                          <ViewRow label="IFSC code" value={selected.bank_ifsc ?? ""} mono />
                          <ViewRow label="Branch" value={selected.bank_branch ?? ""} />
                        </div>
                      </ViewSectionCard>
                    </section>
                  ) : (
                    <section
                      id="panel-company-invoices"
                      role="tabpanel"
                      aria-labelledby="tab-company-invoices"
                      className={`relative z-0 ${inlineInvoiceEdit ? "flex min-h-0 flex-1 flex-col" : ""}`}
                    >
                      {inlineInvoiceEdit ? (
                        <div className="flex min-h-0 flex-1 flex-col">
                          <div className="mb-4 shrink-0">
                            <button
                              type="button"
                              onClick={() => setInlineInvoiceEdit(null)}
                              className="inline-flex items-center gap-2 rounded-lg border border-zinc-700/80 bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-200 transition hover:bg-zinc-800"
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                                <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                              Back to list
                            </button>
                            <p className="mt-3 text-sm text-zinc-400">
                              Editing{" "}
                              <span className="font-mono font-semibold text-white">{inlineInvoiceEdit.invoice_number}</span>
                            </p>
                          </div>
                          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                            <InvoiceEditForm
                              invoice={inlineInvoiceEdit}
                              companies={companies}
                              onSaved={(row) => {
                                setCompanyInvoices((prev) => prev.map((x) => (x.id === row.id ? row : x)));
                                setInlineInvoiceEdit(null);
                                router.refresh();
                              }}
                              onCancel={() => setInlineInvoiceEdit(null)}
                            />
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="mb-4 text-xs leading-relaxed text-zinc-500">
                            Invoices for this company. Edit here without leaving this screen; delete removes the invoice permanently.
                          </p>

                          <ViewSectionCard className="border-teal-900/40 ring-teal-500/[0.07]">
                            {companyInvoicesLoading ? (
                              <div className="flex items-center gap-3 px-4 py-8">
                                <span
                                  className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-zinc-600 border-t-teal-400"
                                  aria-hidden
                                />
                                <p className="text-sm text-zinc-400">Loading invoices…</p>
                              </div>
                            ) : companyInvoices.length === 0 ? (
                              <div className="px-4 py-10 text-center">
                                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-800/80 bg-zinc-900/50 text-zinc-600">
                                  <InvoiceDocIcon className="h-6 w-6" />
                                </div>
                                <p className="text-sm font-medium text-zinc-300">No invoices yet</p>
                                <p className="mt-1 text-xs text-zinc-500">Create an invoice from the Invoices tab and select this company.</p>
                              </div>
                            ) : (
                              <ul>
                                {companyInvoices.map((inv) => (
                                  <li
                                    key={inv.id}
                                    className="flex flex-wrap items-center gap-3 border-b border-zinc-800/45 px-3 py-4 transition-colors last:border-b-0 hover:bg-zinc-900/45 sm:flex-nowrap sm:px-4"
                                  >
                                    <div className="min-w-0 flex-1">
                                      <p className="font-semibold tracking-tight text-white">{inv.invoice_number}</p>
                                      <p className="mt-0.5 text-xs text-zinc-500">
                                        {(inv.bill_date ?? "").slice(0, 10)}
                                        <span className="text-zinc-600"> · </span>
                                        {inv.retailer_name?.trim() || "—"}
                                      </p>
                                      <p className="mt-1.5 font-mono text-sm font-medium tabular-nums text-teal-200">
                                        {formatInr(Number(inv.total_amount ?? 0))}
                                      </p>
                                    </div>
                                    <div className="flex w-full shrink-0 gap-2 sm:w-auto">
                                      <button
                                        type="button"
                                        onClick={() => setInlineInvoiceEdit(inv)}
                                        className="flex-1 rounded-lg border border-zinc-600/60 bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-800 hover:text-white sm:flex-none"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setInvoiceDeleteTarget(inv)}
                                        className="flex-1 rounded-lg border border-red-500/35 bg-red-950 px-3 py-2 text-sm font-medium text-red-200 transition hover:border-red-400/50 hover:bg-red-900 sm:flex-none"
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </ViewSectionCard>
                        </>
                      )}
                    </section>
                  )}
                </div>
              )}

              {panel === "add" && (
                <div>
                  <Stepper step={addStep} />

                  {addStep === 1 && (
                    <div className="space-y-4">
                      <div className="rounded-xl border border-sky-900/50 bg-sky-950/40 p-4">
                        <div className="flex gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-sky-300">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="10" />
                              <path d="M12 16v-4M12 8h.01" strokeLinecap="round" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-sky-200">Private &amp; secure</p>
                            <p className="mt-1 text-xs text-sky-200/70">
                              All information is encrypted and private to your account only.
                            </p>
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className={labelDark} htmlFor="co-name">
                          Company name <span className="text-red-400">*</span>
                        </label>
                        <div className="relative">
                          <input
                            id="co-name"
                            className={`${fieldClassDark()} pr-11`}
                            style={inputStyle}
                            placeholder="Enter company name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                          />
                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                              <rect x="3" y="7" width="18" height="14" rx="2" />
                              <path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" />
                            </svg>
                          </span>
                        </div>
                      </div>

                      <div className="rounded-xl border border-white/10 bg-zinc-900/30 p-4">
                        <p className="mb-3 text-sm font-semibold text-zinc-200">Contact number</p>
                        <div className="space-y-3">
                          <div>
                            <label className={labelDark} htmlFor="co-telephone">
                              Telephone
                            </label>
                            <input
                              id="co-telephone"
                              className={fieldClassDark()}
                              style={inputStyle}
                              placeholder="Landline or office number"
                              value={telephone}
                              onChange={(e) => setTelephone(e.target.value)}
                            />
                          </div>
                          <div>
                            <label className={labelDark}>
                              Phone <span className="text-red-400">*</span>
                            </label>
                            <div className="flex gap-2">
                              <span
                                className="flex w-[4.25rem] shrink-0 items-center justify-center rounded-xl border border-white/10 text-sm font-medium text-zinc-300"
                                style={{ backgroundColor: INPUT_BG }}
                              >
                                +91
                              </span>
                              <input
                                id="co-contact"
                                className={fieldClassDark()}
                                style={inputStyle}
                                inputMode="numeric"
                                maxLength={10}
                                placeholder="10-digit mobile"
                                value={contactDigits}
                                onChange={(e) => setContactDigits(e.target.value.replace(/\D/g, "").slice(0, 10))}
                              />
                            </div>
                          </div>
                          <div>
                            <label className={labelDark} htmlFor="co-alt">
                              Alternative
                            </label>
                            <div className="flex gap-2">
                              <span
                                className="flex w-[4.25rem] shrink-0 items-center justify-center rounded-xl border border-white/10 text-sm font-medium text-zinc-300"
                                style={{ backgroundColor: INPUT_BG }}
                              >
                                +91
                              </span>
                              <input
                                id="co-alt"
                                className={fieldClassDark()}
                                style={inputStyle}
                                inputMode="numeric"
                                maxLength={10}
                                placeholder="Optional second mobile"
                                value={alternativeDigits}
                                onChange={(e) => setAlternativeDigits(e.target.value.replace(/\D/g, "").slice(0, 10))}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className={labelDark} htmlFor="co-address">
                          Address
                        </label>
                        <textarea
                          id="co-address"
                          className={fieldClassDark(true)}
                          style={inputStyle}
                          placeholder="Enter complete address"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          rows={3}
                        />
                      </div>
                      <div>
                        <label className={labelDark} htmlFor="co-gst">
                          GST number <span className="text-red-400">*</span>
                        </label>
                        <input
                          id="co-gst"
                          className={fieldClassDark()}
                          style={inputStyle}
                          maxLength={15}
                          placeholder="29ABCDE1234F1Z5"
                          value={gstNo}
                          onChange={(e) => setGstNo(e.target.value.toUpperCase())}
                        />
                        <p className="mt-1 text-xs text-zinc-500">15 characters (e.g., 29ABCDE1234F1Z5)</p>
                      </div>
                    </div>
                  )}

                  {addStep === 2 && (
                    <div className="space-y-4">
                      <p className="text-sm text-zinc-400">Add email, location, and bank details for payouts and invoices.</p>
                      <div>
                        <label className={labelDark} htmlFor="co-email">
                          Email address
                        </label>
                        <div className="relative">
                          <input
                            id="co-email"
                            type="email"
                            className={`${fieldClassDark()} pr-11`}
                            style={inputStyle}
                            placeholder="company@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                          />
                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                              <rect x="3" y="5" width="18" height="14" rx="2" />
                              <path d="M3 7l9 6 9-6" />
                            </svg>
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={labelDark} htmlFor="co-city">
                            City
                          </label>
                          <input
                            id="co-city"
                            className={fieldClassDark()}
                            style={inputStyle}
                            placeholder="Bengaluru"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className={labelDark} htmlFor="co-state">
                            State
                          </label>
                          <StateSearchSelect
                            id="co-state"
                            value={stateVal}
                            onChange={setStateVal}
                            placeholder="Select"
                            inputBackground={INPUT_BG}
                          />
                        </div>
                      </div>
                      <div>
                        <label className={labelDark} htmlFor="co-pin">
                          PIN code
                        </label>
                        <input
                          id="co-pin"
                          className={fieldClassDark()}
                          style={inputStyle}
                          inputMode="numeric"
                          maxLength={6}
                          placeholder="560001"
                          value={pinCode}
                          onChange={(e) => setPinCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        />
                      </div>
                      <p className="pt-1 text-sm font-medium text-zinc-300">Bank details</p>
                      <div>
                        <label className={labelDark} htmlFor="co-bank">
                          Bank name
                        </label>
                        <input
                          id="co-bank"
                          className={fieldClassDark()}
                          style={inputStyle}
                          value={bankName}
                          onChange={(e) => setBankName(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className={labelDark} htmlFor="co-acct">
                          A/c no.
                        </label>
                        <input
                          id="co-acct"
                          className={fieldClassDark()}
                          style={inputStyle}
                          value={bankAccountNumber}
                          onChange={(e) => setBankAccountNumber(e.target.value)}
                          autoComplete="off"
                        />
                      </div>
                      <div>
                        <label className={labelDark} htmlFor="co-ifsc">
                          IFSC code
                        </label>
                        <input
                          id="co-ifsc"
                          className={fieldClassDark()}
                          style={inputStyle}
                          maxLength={11}
                          placeholder="11 characters"
                          value={bankIfsc}
                          onChange={(e) => setBankIfsc(e.target.value.toUpperCase())}
                        />
                      </div>
                      <div>
                        <label className={labelDark} htmlFor="co-branch">
                          Branch
                        </label>
                        <input id="co-branch" className={fieldClassDark()} style={inputStyle} value={bankBranch} onChange={(e) => setBankBranch(e.target.value)} />
                      </div>
                    </div>
                  )}

                  {addStep === 3 && (
                    <div className="space-y-4">
                      <p className="text-sm font-medium text-zinc-300">Review before saving</p>
                      <div className="space-y-3 rounded-xl border border-zinc-700 bg-[#1A1C26] p-4 text-sm">
                        <div className="flex justify-between gap-2 border-b border-zinc-700/80 pb-2">
                          <span className="text-zinc-500">Company</span>
                          <span className="font-medium text-white">{name.trim() || "—"}</span>
                        </div>
                        <div className="flex justify-between gap-2 border-b border-zinc-700/80 pb-2">
                          <span className="text-zinc-500">Telephone</span>
                          <span className="text-white">{telephone.trim() || "—"}</span>
                        </div>
                        <div className="flex justify-between gap-2 border-b border-zinc-700/80 pb-2">
                          <span className="text-zinc-500">Phone</span>
                          <span className="text-white">{contactDigits ? `+91 ${contactDigits}` : "—"}</span>
                        </div>
                        <div className="flex justify-between gap-2 border-b border-zinc-700/80 pb-2">
                          <span className="text-zinc-500">Alternative</span>
                          <span className="text-white">{alternativeDigits ? `+91 ${alternativeDigits}` : "—"}</span>
                        </div>
                        <div className="border-b border-zinc-700/80 pb-2">
                          <span className="text-zinc-500">Address</span>
                          <p className="mt-1 whitespace-pre-wrap text-white">{address.trim() || "—"}</p>
                        </div>
                        <div className="flex justify-between gap-2 border-b border-zinc-700/80 pb-2">
                          <span className="text-zinc-500">GST</span>
                          <span className="font-mono text-xs text-white">{gstNo.trim() || "—"}</span>
                        </div>
                        <div className="flex justify-between gap-2 border-b border-zinc-700/80 pb-2">
                          <span className="text-zinc-500">Email</span>
                          <span className="truncate text-white">{email.trim() || "—"}</span>
                        </div>
                        <div className="flex justify-between gap-2 border-b border-zinc-700/80 pb-2">
                          <span className="text-zinc-500">Location</span>
                          <span className="text-right text-white">
                            {[city, stateVal].filter(Boolean).join(", ") || "—"} {pinCode ? `· ${pinCode}` : ""}
                          </span>
                        </div>
                        <div>
                          <span className="text-zinc-500">Bank</span>
                          <p className="mt-1 text-white">{bankName.trim() || "—"}</p>
                          <p className="mt-1 font-mono text-xs text-zinc-400">
                            {bankAccountNumber ? `••••${bankAccountNumber.replace(/\s/g, "").slice(-4)}` : "—"} · {bankIfsc.trim() || "—"}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {panel === "edit" && (
                <form
                  id="company-edit-form"
                  className="space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void saveEdit();
                  }}
                >
                  <div>
                    <label className={labelDark} htmlFor="ed-name">
                      Company name <span className="text-red-400">*</span>
                    </label>
                    <input
                      id="ed-name"
                      className={fieldClassDark()}
                      style={inputStyle}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required={!skipRequiredFieldValidation()}
                    />
                  </div>
                  <div className="rounded-xl border border-white/10 bg-zinc-900/30 p-4">
                    <p className="mb-3 text-sm font-semibold text-zinc-200">Contact number</p>
                    <div className="space-y-3">
                      <div>
                        <label className={labelDark} htmlFor="ed-telephone">
                          Telephone
                        </label>
                        <input
                          id="ed-telephone"
                          className={fieldClassDark()}
                          style={inputStyle}
                          placeholder="Landline or office number"
                          value={telephone}
                          onChange={(e) => setTelephone(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className={labelDark}>Phone</label>
                        <div className="flex gap-2">
                          <span
                            className="flex w-[4.25rem] shrink-0 items-center justify-center rounded-xl border border-white/10 text-sm font-medium text-zinc-300"
                            style={{ backgroundColor: INPUT_BG }}
                          >
                            +91
                          </span>
                          <input
                            className={fieldClassDark()}
                            style={inputStyle}
                            inputMode="numeric"
                            maxLength={10}
                            value={contactDigits}
                            onChange={(e) => setContactDigits(e.target.value.replace(/\D/g, "").slice(0, 10))}
                          />
                        </div>
                      </div>
                      <div>
                        <label className={labelDark} htmlFor="ed-alt">Alternative</label>
                        <div className="flex gap-2">
                          <span
                            className="flex w-[4.25rem] shrink-0 items-center justify-center rounded-xl border border-white/10 text-sm font-medium text-zinc-300"
                            style={{ backgroundColor: INPUT_BG }}
                          >
                            +91
                          </span>
                          <input
                            id="ed-alt"
                            className={fieldClassDark()}
                            style={inputStyle}
                            inputMode="numeric"
                            maxLength={10}
                            value={alternativeDigits}
                            onChange={(e) => setAlternativeDigits(e.target.value.replace(/\D/g, "").slice(0, 10))}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className={labelDark} htmlFor="ed-address">Address</label>
                    <textarea id="ed-address" className={fieldClassDark(true)} style={inputStyle} value={address} onChange={(e) => setAddress(e.target.value)} rows={3} />
                  </div>
                  <div>
                    <label className={labelDark} htmlFor="ed-gst">GST number</label>
                    <input
                      id="ed-gst"
                      className={fieldClassDark()}
                      style={inputStyle}
                      maxLength={15}
                      value={gstNo}
                      onChange={(e) => setGstNo(e.target.value.toUpperCase())}
                    />
                  </div>
                  <div>
                    <label className={labelDark} htmlFor="ed-email">Email</label>
                    <input id="ed-email" type="email" className={fieldClassDark()} style={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelDark} htmlFor="ed-city">City</label>
                      <input id="ed-city" className={fieldClassDark()} style={inputStyle} value={city} onChange={(e) => setCity(e.target.value)} />
                    </div>
                    <div>
                      <label className={labelDark} htmlFor="ed-state">
                        State
                      </label>
                      <StateSearchSelect
                        id="ed-state"
                        value={stateVal}
                        onChange={setStateVal}
                        placeholder="Select"
                        inputBackground={INPUT_BG}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelDark} htmlFor="ed-pin">PIN</label>
                    <input id="ed-pin" className={fieldClassDark()} style={inputStyle} maxLength={6} value={pinCode} onChange={(e) => setPinCode(e.target.value.replace(/\D/g, "").slice(0, 6))} />
                  </div>
                  <div className="rounded-xl border border-zinc-700 bg-[#1A1C26] p-4 space-y-4">
                    <p className="text-sm font-semibold text-white">Bank details</p>
                    <input className={fieldClassDark()} style={inputStyle} placeholder="Bank name" value={bankName} onChange={(e) => setBankName(e.target.value)} />
                    <input className={fieldClassDark()} style={inputStyle} placeholder="A/c no." value={bankAccountNumber} onChange={(e) => setBankAccountNumber(e.target.value)} />
                    <input className={fieldClassDark()} style={inputStyle} placeholder="IFSC" maxLength={11} value={bankIfsc} onChange={(e) => setBankIfsc(e.target.value.toUpperCase())} />
                    <input className={fieldClassDark()} style={inputStyle} placeholder="Branch Address" value={bankBranch} onChange={(e) => setBankBranch(e.target.value)} />
                  </div>
                </form>
              )}
            </div>

            {/* Fixed footer — add step actions */}
            {panel === "add" && (
              <div className="absolute bottom-0 left-0 right-0 border-t border-zinc-700/80 bg-[#16181f]/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md">
                <div className="flex gap-3">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void saveDraft()}
                    className="min-h-[48px] flex-1 rounded-xl border border-white/20 bg-transparent py-3 text-sm font-semibold text-white hover:bg-white/5 disabled:opacity-50"
                  >
                    Save as draft
                  </button>
                  {addStep < 3 ? (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => {
                        if (addStep === 1 && !validateStep1Continue()) return;
                        if (addStep === 2 && !validateStep2Continue()) return;
                        setAddStep((s) => (s < 3 ? ((s + 1) as 1 | 2 | 3) : s));
                      }}
                      className="flex min-h-[48px] flex-[1.15] items-center justify-center gap-2 rounded-xl bg-zinc-300 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200 disabled:opacity-50"
                    >
                      Continue
                      <span aria-hidden>→</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void saveNew()}
                      className="flex min-h-[48px] flex-[1.15] items-center justify-center gap-2 rounded-xl bg-zinc-300 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200 disabled:opacity-50"
                    >
                      {saving ? "Saving…" : "Save company"}
                    </button>
                  )}
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
                    className="min-h-[48px] flex-1 rounded-xl border border-white/20 py-3 text-sm font-semibold text-white hover:bg-white/5"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    form="company-edit-form"
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
            aria-labelledby="del-title"
            className="fixed left-1/2 top-1/2 z-[101] w-[min(100%-2rem,22rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-zinc-700 bg-[#1A1C26] p-5 shadow-xl"
          >
            <h3 id="del-title" className="text-lg font-semibold text-white">
              Delete company?
            </h3>
            <p className="mt-2 text-sm text-zinc-400">
              Remove <span className="font-medium text-white">&ldquo;{deleteTarget.name}&rdquo;</span>? This cannot be undone.
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

      {invoiceDeleteTarget && (
        <>
          <div
            className="fixed inset-0 z-[100] bg-black/70"
            aria-hidden
            onClick={() => !invoiceDeleting && setInvoiceDeleteTarget(null)}
          />
          <div
            role="alertdialog"
            aria-labelledby="del-inv-title"
            className="fixed left-1/2 top-1/2 z-[101] w-[min(100%-2rem,22rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-zinc-700 bg-[#1A1C26] p-5 shadow-xl"
          >
            <h3 id="del-inv-title" className="text-lg font-semibold text-white">
              Delete invoice?
            </h3>
            <p className="mt-2 text-sm text-zinc-400">
              Remove invoice <span className="font-medium text-white">{invoiceDeleteTarget.invoice_number}</span>? This cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                disabled={invoiceDeleting}
                onClick={() => setInvoiceDeleteTarget(null)}
                className="rounded-xl px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-white/5 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={invoiceDeleting}
                onClick={() => void confirmDeleteInvoice()}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {invoiceDeleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
