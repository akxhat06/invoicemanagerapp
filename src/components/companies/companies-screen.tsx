"use client";

import { createClient } from "@/lib/supabase/client";
import {
  bankSummaryLine,
  companyUiStatus,
  gstDisplayLine,
  type CompanyUiStatus,
} from "@/lib/company-display";
import { INDIAN_BANKS } from "@/lib/indian-banks";
import { INDIAN_STATES_AND_UT } from "@/lib/indian-states";
import { toastError, toastSuccess } from "@/lib/toast";
import { SwipeCompanyRow } from "@/components/companies/swipe-company-row";
import type { CompanyRow } from "@/types/company";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Step = 1 | 2 | 3;

type Props = {
  initialCompanies: CompanyRow[];
};

function trimNull(s: string): string | null {
  const v = s.trim();
  return v === "" ? null : v;
}

function StatusBadge({ status }: { status: CompanyUiStatus }) {
  if (status === "active") {
    return (
      <span className="inline-flex shrink-0 items-center rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
        Active
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
      Pending
    </span>
  );
}

function DraftBadge() {
  return (
    <span className="inline-flex shrink-0 items-center rounded-full bg-zinc-500/25 px-2.5 py-0.5 text-[11px] font-semibold text-zinc-300">
      Draft
    </span>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function BriefcaseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M10 6V4a2 2 0 012-2h0a2 2 0 012 2v2" />
      <rect x="2" y="6" width="20" height="14" rx="2" />
      <path d="M6 12h.01M10 12h.01" />
    </svg>
  );
}

function MailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M22 7l-10 6L2 7" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
    </svg>
  );
}

function StepCheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.88 5.09A10.43 10.43 0 0112 5c7 0 10 7 10 7a18.77 18.77 0 01-3.29 4.67M6.12 6.12A18.48 18.48 0 002 12s3.5 7 10 7a9.74 9.74 0 004.22-.94" />
    </svg>
  );
}

function PhoneHandsetIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
    </svg>
  );
}

function MapPinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function StepConnector({ variant }: { variant: "idle" | "done" | "gradient" }) {
  if (variant === "gradient") {
    return (
      <div
        className="mx-1 mt-[18px] h-px min-w-[10px] flex-1 bg-gradient-to-r from-emerald-600/90 via-emerald-500/50 to-amber-600/70"
        aria-hidden
      />
    );
  }
  if (variant === "done") {
    return <div className="mx-1 mt-[18px] h-px min-w-[10px] flex-1 bg-emerald-500/75" aria-hidden />;
  }
  return <div className="bg-border mx-1 mt-[18px] h-px min-w-[10px] flex-1" aria-hidden />;
}

function Stepper({ step }: { step: Step }) {
  const labels = ["Details", "Banking", "Verify"] as const;
  const cell = (n: 1 | 2 | 3, i: number) => {
    const done = step > n;
    const current = step === n;
    return (
      <div key={n} className="flex min-w-0 flex-1 flex-col items-center">
        {done ? (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm ring-1 ring-emerald-400/30">
            <StepCheckIcon className="stroke-[2.5]" />
          </div>
        ) : current ? (
          <div className="bg-accent-secondary text-accent-secondary-foreground flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold shadow-[0_0_18px_rgba(217,163,93,0.5)]">
            {n}
          </div>
        ) : (
          <div className="bg-panel-field text-panel-muted flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
            {n}
          </div>
        )}
        <span
          className={`mt-1.5 max-w-[4.5rem] text-center text-[11px] font-medium leading-tight ${
            done ? "text-emerald-400" : current ? "text-amber-400/95" : "text-panel-muted"
          }`}
        >
          {labels[i]}
        </span>
      </div>
    );
  };
  const conn12: "idle" | "done" | "gradient" = step >= 2 ? "done" : "idle";
  const conn23: "idle" | "done" | "gradient" =
    step >= 3 ? "done" : step === 2 ? "gradient" : "idle";
  return (
    <div className="flex items-start">
      {cell(1, 0)}
      <StepConnector variant={conn12} />
      {cell(2, 1)}
      <StepConnector variant={conn23} />
      {cell(3, 2)}
    </div>
  );
}

export function CompaniesScreen({ initialCompanies }: Props) {
  const router = useRouter();
  const [companies, setCompanies] = useState<CompanyRow[]>(initialCompanies);
  const [addOpen, setAddOpen] = useState(false);
  const [addPanelKey, setAddPanelKey] = useState(0);
  const [step, setStep] = useState<Step>(1);
  const [draftId, setDraftId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [gstNo, setGstNo] = useState("");
  const [phoneDigits, setPhoneDigits] = useState("");
  const [email, setEmail] = useState("");
  const [registeredAddress, setRegisteredAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pinCode, setPinCode] = useState("");

  const [bankAccountHolder, setBankAccountHolder] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [confirmAccountNumber, setConfirmAccountNumber] = useState("");
  const [showAccountNumber, setShowAccountNumber] = useState(false);
  const [bankIfsc, setBankIfsc] = useState("");
  const [bankBranch, setBankBranch] = useState("");

  const [consentAccepted, setConsentAccepted] = useState(false);

  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [companyPendingDelete, setCompanyPendingDelete] = useState<CompanyRow | null>(null);

  useEffect(() => {
    setCompanies(initialCompanies);
  }, [initialCompanies]);

  useEffect(() => {
    const locked = addOpen || companyPendingDelete !== null;
    document.body.style.overflow = locked ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [addOpen, companyPendingDelete]);

  useEffect(() => {
    if (!companyPendingDelete) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !deletingId) {
        setCompanyPendingDelete(null);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [companyPendingDelete, deletingId]);

  function resetForm() {
    setStep(1);
    setDraftId(null);
    setName("");
    setGstNo("");
    setPhoneDigits("");
    setEmail("");
    setRegisteredAddress("");
    setCity("");
    setState("");
    setPinCode("");
    setBankAccountHolder("");
    setBankName("");
    setBankAccountNumber("");
    setConfirmAccountNumber("");
    setShowAccountNumber(false);
    setBankIfsc("");
    setBankBranch("");
    setConsentAccepted(false);
  }

  function openAdd() {
    setAddPanelKey((k) => k + 1);
    resetForm();
    setAddOpen(true);
  }

  function closeAdd() {
    if (saving) return;
    setAddOpen(false);
  }

  function toggleFab() {
    if (addOpen) {
      closeAdd();
    } else {
      openAdd();
    }
  }

  function requestDeleteCompany(c: CompanyRow) {
    if (deletingId) return;
    setCompanyPendingDelete(c);
  }

  function cancelDeleteConfirm() {
    if (deletingId) return;
    setCompanyPendingDelete(null);
  }

  async function confirmDeleteCompany() {
    const c = companyPendingDelete;
    if (!c || deletingId) return;
    setDeletingId(c.id);
    const supabase = createClient();
    const { error } = await supabase.from("companies").delete().eq("id", c.id);
    setDeletingId(null);
    setCompanyPendingDelete(null);
    if (error) {
      toastError(error.message);
      return;
    }
    setCompanies((prev) => prev.filter((row) => row.id !== c.id));
    toastSuccess("Company removed.");
    router.refresh();
  }

  function headerBack() {
    if (saving) return;
    if (step > 1) {
      setStep((s) => (s > 1 ? ((s - 1) as Step) : s));
    } else {
      closeAdd();
    }
  }

  function buildPayload(isDraft: boolean) {
    const digits = phoneDigits.replace(/\D/g, "").slice(0, 10);
    const phone = digits.length === 10 ? `+91${digits}` : null;
    return {
      name: name.trim(),
      gst_no: trimNull(gstNo),
      phone_no: phone,
      email: trimNull(email),
      registered_address: trimNull(registeredAddress),
      city: trimNull(city),
      state: state.trim() ? state.trim() : null,
      pin_code: trimNull(pinCode),
      bank_account_holder: trimNull(bankAccountHolder),
      bank_name: trimNull(bankName),
      bank_account_number: trimNull(bankAccountNumber),
      bank_ifsc: trimNull(bankIfsc),
      bank_branch: trimNull(bankBranch),
      bank_account_type: null,
      is_draft: isDraft,
    };
  }

  async function saveDraft() {
    if (!name.trim()) {
      toastError("Enter a company name to save a draft.");
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

    if (draftId) {
      const { data, error: upErr } = await supabase
        .from("companies")
        .update(payload)
        .eq("id", draftId)
        .select()
        .single();
      setSaving(false);
      if (upErr) {
        toastError(upErr.message);
        return;
      }
      if (data) {
        setCompanies((prev) => prev.map((c) => (c.id === draftId ? (data as CompanyRow) : c)));
        toastSuccess("Draft saved.");
      }
    } else {
      const { data, error: insErr } = await supabase
        .from("companies")
        .insert({ ...payload, user_id: user.id })
        .select()
        .single();
      setSaving(false);
      if (insErr) {
        toastError(insErr.message);
        return;
      }
      if (data) {
        setDraftId((data as CompanyRow).id);
        setCompanies((prev) => [data as CompanyRow, ...prev]);
        toastSuccess("Draft saved.");
      }
    }
    router.refresh();
  }

  function validateStep1ForContinue(): boolean {
    if (!name.trim()) {
      toastError("Company name is required.");
      return false;
    }
    const g = gstNo.trim().toUpperCase();
    if (g.length !== 15) {
      toastError("GST number must be 15 characters (e.g. 29ABCDE1234F1Z5).");
      return false;
    }
    const digits = phoneDigits.replace(/\D/g, "");
    if (digits.length !== 10) {
      toastError("Enter a valid 10-digit phone number.");
      return false;
    }
    return true;
  }

  function continueFromStep1() {
    if (!validateStep1ForContinue()) return;
    setStep(2);
  }

  function validateStep2ForContinue(): boolean {
    if (!bankName.trim()) {
      toastError("Select your bank.");
      return false;
    }
    const acct = bankAccountNumber.replace(/\s/g, "");
    const confirm = confirmAccountNumber.replace(/\s/g, "");
    if (!acct) {
      toastError("Enter account number.");
      return false;
    }
    if (acct !== confirm) {
      toastError("Account numbers do not match.");
      return false;
    }
    if (!bankAccountHolder.trim()) {
      toastError("Account holder name is required.");
      return false;
    }
    return true;
  }

  function continueFromStep2() {
    if (!validateStep2ForContinue()) return;
    setStep(3);
  }

  function validateFinal(): boolean {
    if (!validateStep1ForContinue()) return false;
    if (!validateStep2ForContinue()) return false;
    return true;
  }

  async function completeRegistration() {
    if (!consentAccepted) {
      toastError(
        "Please confirm that the information is accurate and agree to the Terms & Conditions and Privacy Policy."
      );
      return;
    }
    if (!validateFinal()) {
      const digits = phoneDigits.replace(/\D/g, "");
      const step1Ok =
        !!name.trim() && gstNo.trim().toUpperCase().length === 15 && digits.length === 10;
      setStep(step1Ok ? 2 : 1);
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

    const payload = buildPayload(false);

    if (draftId) {
      const { data, error: upErr } = await supabase
        .from("companies")
        .update(payload)
        .eq("id", draftId)
        .select()
        .single();
      setSaving(false);
      if (upErr) {
        toastError(upErr.message);
        return;
      }
      if (data) {
        setCompanies((prev) => prev.map((c) => (c.id === draftId ? (data as CompanyRow) : c)));
      }
    } else {
      const { data, error: insErr } = await supabase
        .from("companies")
        .insert({ ...payload, user_id: user.id })
        .select()
        .single();
      setSaving(false);
      if (insErr) {
        toastError(insErr.message);
        return;
      }
      if (data) {
        setCompanies((prev) => [data as CompanyRow, ...prev]);
      }
    }

    toastSuccess("Company added successfully.");
    setAddOpen(false);
    resetForm();
    router.refresh();
  }

  const panelInput =
    "bg-panel-field text-panel-foreground placeholder:text-panel-muted w-full rounded-lg border border-border px-3.5 py-3 text-[15px] outline-none transition focus:border-amber-600/60 focus:ring-1 focus:ring-amber-500/30 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700/80";

  const panelLabel = "text-panel-foreground mb-1.5 block text-sm font-medium";

  const phoneFormatted = phoneDigits.replace(/\D/g, "").slice(0, 10);

  return (
    <div className="relative pb-28">
      <section>
        <div className="mb-4 flex items-center gap-2.5">
          <div className="bg-accent h-5 w-1 shrink-0 rounded-full" />
          <h2 className="text-base font-bold tracking-tight text-zinc-900 dark:text-white">Companies</h2>
        </div>
        <p className="text-muted-foreground mb-4 text-sm">
          Manage company profiles and bank details from one place.
        </p>

        {companies.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-zinc-300 bg-white/80 px-5 py-10 text-center dark:border-zinc-600/80 dark:bg-card/80">
            <div className="bg-accent text-accent-foreground mb-3 flex h-12 w-12 items-center justify-center rounded-full" aria-hidden>
              <PlusIcon className="h-6 w-6" />
            </div>
            <p className="font-semibold text-zinc-900 dark:text-white">No companies yet</p>
            <p className="mt-1 max-w-xs text-sm text-zinc-500 dark:text-zinc-400">
              Tap the <span className="font-medium text-zinc-700 dark:text-zinc-300">+</span> button below
              to add your first company.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-4">
            {companies.map((c) => {
              const status = companyUiStatus(c);
              const phoneDisplay = c.phone_no?.trim() || "—";
              const bankLine = bankSummaryLine(c);
              const isDeleting = deletingId === c.id;
              return (
                <SwipeCompanyRow
                  key={c.id}
                  onSwipeDelete={() => requestDeleteCompany(c)}
                  disabled={isDeleting || !!deletingId}
                >
                  <Link
                    href={`/companies/${c.id}`}
                    className={`block min-w-0 flex-1 p-4 transition hover:bg-zinc-50/80 dark:hover:bg-zinc-800/60 ${
                      isDeleting ? "pointer-events-none opacity-60" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="min-w-0 flex-1 text-[15px] font-semibold leading-snug text-zinc-900 dark:text-white">
                        {c.name}
                      </h3>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {c.is_draft === true ? <DraftBadge /> : <StatusBadge status={status} />}
                        <ChevronRightIcon className="text-zinc-400 dark:text-zinc-500" />
                      </div>
                    </div>
                    <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">{gstDisplayLine(c)}</p>
                    <div className="my-3 border-t border-zinc-200 dark:border-zinc-600/60" />
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-500">
                          Phone
                        </p>
                        <p className="mt-1 text-sm text-zinc-900 dark:text-white">{phoneDisplay}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-500">
                          Bank
                        </p>
                        <p className="mt-1 truncate text-sm text-zinc-900 dark:text-white" title={bankLine}>
                          {bankLine}
                        </p>
                      </div>
                    </div>
                  </Link>
                </SwipeCompanyRow>
              );
            })}
          </ul>
        )}
      </section>

      {companyPendingDelete && (
        <>
          <button
            type="button"
            aria-label="Close"
            className="fixed inset-0 z-[95] bg-black/55 backdrop-blur-[2px]"
            onClick={cancelDeleteConfirm}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-company-title"
            className="border-border bg-card fixed left-1/2 top-1/2 z-[96] w-[min(100%-2rem,22rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border p-5 shadow-2xl"
          >
            <h2 id="delete-company-title" className="text-foreground text-lg font-semibold">
              Remove company?
            </h2>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              Delete <span className="text-foreground font-medium">&ldquo;{companyPendingDelete.name}&rdquo;</span>
              ? This cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={cancelDeleteConfirm}
                disabled={deletingId !== null}
                className="rounded-xl px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-zinc-800/80"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteCompany}
                disabled={deletingId !== null}
                className="inline-flex min-w-[5.5rem] items-center justify-center rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-70 dark:bg-red-700 dark:hover:bg-red-600"
              >
                {deletingId === companyPendingDelete.id ? (
                  <svg
                    className="h-4 w-4 animate-spin"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close add company"
        className={`fixed inset-0 z-[85] bg-black/55 backdrop-blur-[2px] transition-opacity duration-300 ${
          addOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={closeAdd}
      />

      {/* Slide-over panel */}
      <div
        className={`bg-panel text-panel-foreground fixed inset-y-0 right-0 z-[90] flex w-full max-w-md flex-col shadow-2xl transition-transform duration-300 ease-out ${
          addOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div key={addPanelKey} className="flex min-h-0 flex-1 flex-col">
          {/* Header */}
          <div className="border-border relative flex shrink-0 items-center justify-center border-b px-2 py-4">
            <button
              type="button"
              onClick={headerBack}
              disabled={saving}
              className="text-panel-muted hover:bg-black/5 hover:text-panel-foreground dark:hover:bg-white/10 absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg transition disabled:opacity-50"
              aria-label={step > 1 ? "Back" : "Close"}
            >
              <ChevronLeftIcon />
            </button>
            <h2 className="text-panel-foreground px-12 text-center text-lg font-bold">
              {step === 1 ? "Add company" : step === 2 ? "Banking details" : "Review & verify"}
            </h2>
          </div>

          <div className="border-border border-b px-4 py-5">
            <Stepper step={step} />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="ac-name" className={panelLabel}>
                    Company name <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="ac-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={saving}
                      className={`${panelInput} pr-11`}
                      placeholder="Enter company name"
                      autoComplete="organization"
                    />
                    <span className="text-panel-muted pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                      <BriefcaseIcon />
                    </span>
                  </div>
                </div>

                <div>
                  <label htmlFor="ac-gst" className={panelLabel}>
                    GST number <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="ac-gst"
                    type="text"
                    value={gstNo}
                    onChange={(e) => setGstNo(e.target.value.toUpperCase())}
                    disabled={saving}
                    className={`${panelInput} font-mono uppercase`}
                    placeholder="29ABCDE1234F1Z5"
                    maxLength={15}
                  />
                  <p className="text-panel-muted mt-1.5 text-xs">15 characters (e.g., 29ABCDE1234F1Z5)</p>
                </div>

                <div>
                  <label className={panelLabel}>
                    Phone number <span className="text-red-400">*</span>
                  </label>
                  <div className="flex gap-2">
                    <span className="bg-panel-field text-panel-muted border-border flex w-14 shrink-0 items-center justify-center rounded-lg border text-sm font-medium">
                      +91
                    </span>
                    <input
                      id="ac-phone"
                      type="tel"
                      inputMode="numeric"
                      value={phoneFormatted}
                      onChange={(e) => setPhoneDigits(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      disabled={saving}
                      className={panelInput}
                      placeholder="10-digit number"
                      autoComplete="tel-national"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="ac-email" className={panelLabel}>
                    Email address
                  </label>
                  <div className="relative">
                    <input
                      id="ac-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={saving}
                      className={`${panelInput} pr-11`}
                      placeholder="company@example.com"
                      autoComplete="email"
                    />
                    <span className="text-panel-muted pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                      <MailIcon />
                    </span>
                  </div>
                </div>

                <div>
                  <label htmlFor="ac-address" className={panelLabel}>
                    Registered address
                  </label>
                  <textarea
                    id="ac-address"
                    rows={4}
                    value={registeredAddress}
                    onChange={(e) => setRegisteredAddress(e.target.value)}
                    disabled={saving}
                    className={`${panelInput} resize-y`}
                    placeholder="Enter complete address"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="ac-city" className={panelLabel}>
                      City
                    </label>
                    <input
                      id="ac-city"
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      disabled={saving}
                      className={panelInput}
                      placeholder="Bengaluru"
                    />
                  </div>
                  <div>
                    <label htmlFor="ac-state" className={panelLabel}>
                      State
                    </label>
                    <div className="relative">
                      <select
                        id="ac-state"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        disabled={saving}
                        className={`${panelInput} appearance-none pr-9`}
                      >
                        <option value="">Select</option>
                        {INDIAN_STATES_AND_UT.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      <ChevronRightIcon className="text-panel-muted pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rotate-90" />
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="ac-pin" className={panelLabel}>
                    PIN code
                  </label>
                  <input
                    id="ac-pin"
                    type="text"
                    inputMode="numeric"
                    value={pinCode}
                    onChange={(e) => setPinCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    disabled={saving}
                    className={panelInput}
                    placeholder="560001"
                  />
                </div>

                <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-900/40 dark:bg-blue-950/40">
                  <div className="flex gap-3">
                    <div className="shrink-0 text-blue-600 dark:text-blue-400" aria-hidden>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-blue-900 dark:text-blue-300">Private &amp; secure</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-blue-800/90 dark:text-blue-200/80">
                        All information is encrypted and private to your account only.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="b-name" className={panelLabel}>
                    Bank name <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <select
                      id="b-name"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      disabled={saving}
                      className={`${panelInput} appearance-none pr-10`}
                    >
                      <option value="">Select your bank</option>
                      {INDIAN_BANKS.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                    <ChevronRightIcon className="text-panel-muted pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rotate-90" />
                  </div>
                </div>

                <div>
                  <label htmlFor="b-acct" className={panelLabel}>
                    Account number <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="b-acct"
                      type={showAccountNumber ? "text" : "password"}
                      inputMode="numeric"
                      autoComplete="off"
                      value={bankAccountNumber}
                      onChange={(e) => setBankAccountNumber(e.target.value.replace(/\s/g, ""))}
                      disabled={saving}
                      className={`${panelInput} pr-11 font-mono tracking-wide`}
                      placeholder="Enter account number"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      className="text-panel-muted hover:bg-black/10 hover:text-panel-foreground dark:hover:bg-white/10 absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 transition"
                      onClick={() => setShowAccountNumber((v) => !v)}
                      aria-label={showAccountNumber ? "Hide account number" : "Show account number"}
                    >
                      {showAccountNumber ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="b-acct2" className={panelLabel}>
                    Confirm account number <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="b-acct2"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    value={confirmAccountNumber}
                    onChange={(e) => setConfirmAccountNumber(e.target.value.replace(/\s/g, ""))}
                    disabled={saving}
                    className={`${panelInput} font-mono tracking-wide`}
                    placeholder="Re-enter account number"
                  />
                </div>

                <div>
                  <label htmlFor="b-ifsc" className={panelLabel}>
                    IFSC code
                  </label>
                  <input
                    id="b-ifsc"
                    type="text"
                    value={bankIfsc}
                    onChange={(e) => setBankIfsc(e.target.value.toUpperCase().replace(/\s/g, ""))}
                    disabled={saving}
                    className={`${panelInput} font-mono uppercase`}
                    placeholder="e.g. HDFC0001234"
                  />
                </div>

                <div>
                  <label htmlFor="b-holder" className={panelLabel}>
                    Account holder name <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="b-holder"
                    type="text"
                    value={bankAccountHolder}
                    onChange={(e) => setBankAccountHolder(e.target.value)}
                    disabled={saving}
                    className={panelInput}
                    placeholder="As per bank records"
                    autoComplete="name"
                  />
                </div>

                <div>
                  <label htmlFor="b-branch" className={panelLabel}>
                    Branch
                  </label>
                  <input
                    id="b-branch"
                    type="text"
                    value={bankBranch}
                    onChange={(e) => setBankBranch(e.target.value)}
                    disabled={saving}
                    className={panelInput}
                    placeholder="Branch name"
                  />
                </div>

                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900/45 dark:bg-emerald-950/35">
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-200/80 text-emerald-700 dark:bg-emerald-500/25 dark:text-emerald-400" aria-hidden>
                      <StepCheckIcon className="h-4 w-4 stroke-[2.5]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-300">Bank-grade security</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-emerald-800/90 dark:text-emerald-200/75">
                        Your banking details are encrypted with AES-256 and never shared with third parties.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5 text-sm">
                {/* Company details card */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-panel-muted text-xs font-medium uppercase tracking-wide">
                      Company details
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setStep(1);
                      }}
                      className="text-xs font-semibold text-amber-700 transition hover:text-amber-800 dark:text-amber-400/95 dark:hover:text-amber-300"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="bg-panel-field border-border rounded-xl border p-4">
                    <p className="text-panel-foreground text-lg font-bold leading-snug">{name.trim() || "—"}</p>
                    <p className="text-panel-muted mt-1 text-sm">GST: {gstNo.trim() || "—"}</p>
                    <div className="border-border my-3 border-t" />
                    <div className="text-panel-foreground space-y-3">
                      {email.trim() ? (
                        <div className="flex gap-2.5">
                          <MailIcon className="text-panel-muted mt-0.5 shrink-0" />
                          <span>{email.trim()}</span>
                        </div>
                      ) : null}
                      <div className="flex gap-2.5">
                        <PhoneHandsetIcon className="text-panel-muted mt-0.5 shrink-0" />
                        <span>
                          {phoneFormatted.length === 10 ? `+91 ${phoneFormatted.slice(0, 5)} ${phoneFormatted.slice(5)}` : "—"}
                        </span>
                      </div>
                      {(() => {
                        const street = registeredAddress.trim();
                        const cityState = [city.trim(), state].filter(Boolean).join(", ");
                        const pin = pinCode.trim();
                        let addr = "";
                        if (street) addr = street;
                        if (cityState) addr += (addr ? ", " : "") + cityState;
                        if (pin) addr += (addr ? " - " : "") + pin;
                        return addr ? (
                          <div className="flex gap-2.5">
                            <MapPinIcon className="text-panel-muted mt-0.5 shrink-0" />
                            <span className="leading-relaxed">{addr}</span>
                          </div>
                        ) : null;
                      })()}
                    </div>
                  </div>
                </div>

                {/* Banking details card */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-panel-muted text-xs font-medium uppercase tracking-wide">
                      Banking details
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setStep(2);
                      }}
                      className="text-xs font-semibold text-amber-700 transition hover:text-amber-800 dark:text-amber-400/95 dark:hover:text-amber-300"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="bg-panel-field border-border rounded-xl border p-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-panel-muted text-[10px] font-semibold uppercase tracking-wider">
                          Bank name
                        </p>
                        <p className="text-panel-foreground mt-1 font-semibold">{bankName.trim() || "—"}</p>
                      </div>
                      <div>
                        <p className="text-panel-muted text-[10px] font-semibold uppercase tracking-wider">
                          Account number
                        </p>
                        <p className="text-panel-foreground mt-1 font-mono tracking-wide">
                          {bankAccountNumber.replace(/\D/g, "").length >= 4
                            ? `••••••${bankAccountNumber.replace(/\D/g, "").slice(-4)}`
                            : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-panel-muted text-[10px] font-semibold uppercase tracking-wider">
                          IFSC code
                        </p>
                        <p className="text-panel-foreground mt-1 font-mono text-sm">{bankIfsc.trim() || "—"}</p>
                      </div>
                      <div>
                        <p className="text-panel-muted text-[10px] font-semibold uppercase tracking-wider">
                          Account holder
                        </p>
                        <p className="text-panel-foreground mt-1">{bankAccountHolder.trim() || "—"}</p>
                      </div>
                      <div>
                        <p className="text-panel-muted text-[10px] font-semibold uppercase tracking-wider">
                          Branch
                        </p>
                        <p className="text-panel-foreground mt-1">{bankBranch.trim() || "—"}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <label className="text-panel-foreground flex cursor-pointer gap-3 rounded-lg text-sm leading-snug">
                  <input
                    type="checkbox"
                    checked={consentAccepted}
                    onChange={(e) => setConsentAccepted(e.target.checked)}
                    className="bg-panel-field border-border text-amber-600 focus:ring-amber-500/40 mt-0.5 h-4 w-4 shrink-0 rounded"
                  />
                  <span>
                    I confirm that all the information provided is accurate and I agree to the{" "}
                    <span className="font-medium text-amber-800 underline decoration-amber-600/60 underline-offset-2 dark:text-amber-400/95 dark:decoration-amber-500/60">
                      Terms &amp; Conditions
                    </span>{" "}
                    and{" "}
                    <span className="font-medium text-amber-800 underline decoration-amber-600/60 underline-offset-2 dark:text-amber-400/95 dark:decoration-amber-500/60">
                      Privacy Policy
                    </span>
                    .
                  </span>
                </label>

                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900/40 dark:bg-emerald-950/30">
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-200/80 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" aria-hidden>
                      <StepCheckIcon className="h-4 w-4 stroke-[2.5]" />
                    </div>
                    <p className="text-xs leading-relaxed text-emerald-900/90 dark:text-emerald-200/85">
                      Almost done! Review your details carefully. Once submitted, your company will be added to your
                      account and ready to use.
                    </p>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Footer */}
          <div className="bg-panel border-border shrink-0 border-t px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {step === 1 && (
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={saveDraft}
                  disabled={saving}
                  className="border-border text-panel-foreground hover:bg-muted flex flex-1 items-center justify-center rounded-lg border bg-transparent px-4 py-3.5 text-sm font-semibold transition disabled:opacity-50"
                >
                  Save as draft
                </button>
                <button
                  type="button"
                  onClick={continueFromStep1}
                  disabled={saving}
                  className="bg-accent-secondary text-accent-secondary-foreground flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-3.5 text-sm font-semibold transition hover:brightness-105 disabled:opacity-50"
                >
                  Continue
                  <ArrowRightIcon />
                </button>
              </div>
            )}
            {step === 2 && (
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                  }}
                  disabled={saving}
                  className="border-border text-panel-foreground hover:bg-muted flex flex-1 items-center justify-center gap-1.5 rounded-lg border bg-muted/60 px-3 py-3.5 text-sm font-semibold transition disabled:opacity-50 dark:bg-zinc-900/50 dark:hover:bg-zinc-800"
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                  Back
                </button>
                <button
                  type="button"
                  onClick={continueFromStep2}
                  disabled={saving}
                  className="bg-accent-secondary text-accent-secondary-foreground flex min-w-0 flex-[1.2] items-center justify-center gap-2 rounded-lg px-4 py-3.5 text-sm font-semibold transition hover:brightness-105 disabled:opacity-50"
                >
                  Continue
                  <ArrowRightIcon />
                </button>
              </div>
            )}
            {step === 3 && (
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setStep(2);
                  }}
                  disabled={saving}
                  className="border-border text-panel-foreground hover:bg-muted flex flex-1 items-center justify-center gap-1.5 rounded-lg border bg-muted/60 px-3 py-3.5 text-sm font-semibold transition disabled:opacity-50 dark:bg-zinc-900/50 dark:hover:bg-zinc-800"
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                  Back
                </button>
                <button
                  type="button"
                  onClick={completeRegistration}
                  disabled={saving}
                  className="flex min-w-0 flex-[1.35] items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-500 disabled:opacity-50"
                >
                  {saving ? (
                    "Saving…"
                  ) : (
                    <>
                      <StepCheckIcon className="h-5 w-5 stroke-[2.5] text-white" />
                      Submit &amp; Add Company
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={toggleFab}
        className={`fixed bottom-5 right-4 z-[75] flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
          addOpen
            ? "rotate-90 bg-zinc-700 text-white hover:bg-zinc-600 dark:bg-zinc-600 dark:hover:bg-zinc-500"
            : "bg-accent text-accent-foreground shadow-[0_0_24px_rgba(224,192,104,0.35)] hover:scale-105 hover:shadow-xl active:scale-95"
        }`}
        aria-label={addOpen ? "Close add company" : "Add company"}
      >
        {addOpen ? <CloseIcon /> : <PlusIcon className="h-7 w-7" />}
      </button>
    </div>
  );
}
