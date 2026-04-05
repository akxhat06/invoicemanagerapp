"use client";

import { createClient } from "@/lib/supabase/client";
import { StateSearchSelect } from "@/components/companies/state-search-select";
import { skipRequiredFieldValidation } from "@/lib/dev-validation";
import { toastError, toastSuccess } from "@/lib/toast";
import type { CompanyRow } from "@/types/company";
import { useRouter } from "next/navigation";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";

type Props = {
  initialCompanies: CompanyRow[];
};

type PanelMode = "closed" | "add" | "view" | "edit";

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

export function CompaniesWorkspace({ initialCompanies }: Props) {
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

  const inputStyle = { backgroundColor: INPUT_BG } as React.CSSProperties;

  return (
    <div
      className="relative -mx-4 -mt-5 flex min-h-[calc(100dvh-7.5rem)] flex-col bg-[#12141D] px-4 pb-28 pt-3 text-zinc-100 md:mx-0 md:mt-0 md:min-h-[70vh] md:rounded-2xl md:border md:border-zinc-800/80 md:pb-10 md:pt-6"
      style={{ backgroundColor: CANVAS }}
    >
      <div className="mb-6">
        <div className="mb-1 flex items-center gap-2">
          <span className="h-5 w-1 rounded-full bg-zinc-500" aria-hidden />
          <h2 className="font-login-serif text-xl font-semibold tracking-tight text-white sm:text-2xl">Companies</h2>
        </div>
        <p className="text-sm text-zinc-400">Manage company profiles and bank details from one place.</p>
      </div>

      {companies.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/40 px-6 py-14 text-center">
          <p className="font-semibold text-white">No companies yet</p>
          <p className="mt-2 max-w-sm text-sm text-zinc-400">Add a company to use it on invoices and retailers.</p>
          <button
            type="button"
            onClick={openAdd}
            className="mt-6 rounded-xl bg-zinc-300 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200"
          >
            Add your first company
          </button>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {companies.map((c) => {
            const phoneDigits = phoneDigitsFromStored(c.phone_no);
            const phoneLabel = phoneDigits ? `+91 ${phoneDigits}` : "—";

            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => openView(c)}
                  className="group flex w-full items-stretch overflow-hidden rounded-xl border border-zinc-800/90 bg-zinc-950/35 text-left transition hover:border-zinc-600/80 hover:bg-zinc-900/45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500"
                >
                  <span className="w-1 shrink-0 bg-zinc-500" aria-hidden />
                  <div className="flex min-w-0 flex-1 items-center gap-3 py-3.5 pl-3 pr-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-baseline gap-2">
                        <h3 className="truncate text-base font-semibold text-white">{c.name}</h3>
                        {c.is_draft ? (
                          <span className="shrink-0 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                            Draft
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 font-mono text-[15px] tabular-nums tracking-tight text-zinc-400">{phoneLabel}</p>
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

      {/* FAB — opens add flow with sheet animation */}
      <button
        type="button"
        onClick={openAdd}
        className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-300 text-zinc-950 shadow-lg transition hover:scale-105 hover:bg-zinc-200 active:scale-95 md:bottom-10 md:right-10"
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
            className={`fixed inset-x-0 bottom-0 top-12 z-[90] flex max-h-[100dvh] flex-col rounded-t-3xl border border-zinc-700/90 bg-[#16181f] shadow-[0_-12px_40px_rgba(0,0,0,0.45)] md:left-auto md:right-0 md:top-0 md:max-h-none md:w-full md:max-w-lg md:rounded-none md:rounded-l-3xl md:border-l md:border-t-0`}
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
            <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-zinc-600 md:hidden" aria-hidden />
            <div className="flex shrink-0 items-center gap-3 border-b border-zinc-700/80 px-4 py-3">
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
              <h2 id="company-sheet-title" className="flex-1 truncate text-center text-lg font-semibold text-white md:text-left">
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

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 pb-32">
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
                    <ViewRow label="Address" value={selected.registered_address ?? ""} />
                    <ViewRow label="GST no." value={selected.gst_no ?? ""} mono />
                    <ViewRow label="Email address" value={selected.email ?? ""} />
                    <ViewRow label="City" value={selected.city ?? ""} />
                    <ViewRow label="State" value={selected.state ?? ""} />
                    <ViewRow label="PIN code" value={selected.pin_code ?? ""} mono />
                    <ViewRow label="Account holder" value={selected.bank_account_holder ?? ""} />
                    <ViewRow label="Bank name" value={selected.bank_name ?? ""} />
                    <ViewRow label="Account number" value={selected.bank_account_number ?? ""} mono />
                    <ViewRow label="IFSC code" value={selected.bank_ifsc ?? ""} mono />
                    <ViewRow label="Branch" value={selected.bank_branch ?? ""} />
                  </div>
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
    </div>
  );
}
