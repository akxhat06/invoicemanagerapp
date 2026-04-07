"use client";

import { createClient } from "@/lib/supabase/client";
import { InvoiceEditForm } from "@/components/invoices/invoice-edit-form";
import { skipRequiredFieldValidation } from "@/lib/dev-validation";
import { toastError, toastSuccess } from "@/lib/toast";
import type { CompanyRow } from "@/types/company";
import type { RetailerInvoiceRow } from "@/types/invoice";
import type { RetailerRow } from "@/types/retailer";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode, type TransitionEvent } from "react";

type Props = {
  initialRetailers: RetailerRow[];
  initialCompanies: CompanyRow[];
  initialInvoiceCountByRetailer: Record<string, number>;
  initialCompanyNamesByRetailer: Record<string, string[]>;
  initialTotalAmountByRetailer: Record<string, number>;
};

type RetailerViewTab = "profile" | "invoices";

type PanelMode = "closed" | "add" | "view" | "edit";

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

function PersonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" strokeLinecap="round" strokeLinejoin="round" />
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

export function RetailersScreen({
  initialRetailers,
  initialCompanies,
  initialInvoiceCountByRetailer,
  initialCompanyNamesByRetailer,
  initialTotalAmountByRetailer,
}: Props) {
  const router = useRouter();
  const [retailers, setRetailers] = useState<RetailerRow[]>(initialRetailers);
  const [companies, setCompanies] = useState<CompanyRow[]>(initialCompanies);
  const [invoiceCountByRetailer, setInvoiceCountByRetailer] = useState(initialInvoiceCountByRetailer);
  const [companyNamesByRetailer, setCompanyNamesByRetailer] = useState(initialCompanyNamesByRetailer);
  const [totalAmountByRetailer, setTotalAmountByRetailer] = useState(initialTotalAmountByRetailer);
  const [panel, setPanel] = useState<PanelMode>("closed");
  const prevPanelRef = useRef<PanelMode>("closed");
  const [sheetOpen, setSheetOpen] = useState(false);
  const sheetOpenRef = useRef(sheetOpen);
  const isAnimatingClose = useRef(false);
  const [selected, setSelected] = useState<RetailerRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RetailerRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [retailerViewTab, setRetailerViewTab] = useState<RetailerViewTab>("profile");
  const [retailerInvoices, setRetailerInvoices] = useState<RetailerInvoiceRow[]>([]);
  const [retailerInvoicesLoading, setRetailerInvoicesLoading] = useState(false);
  const [inlineInvoiceEdit, setInlineInvoiceEdit] = useState<RetailerInvoiceRow | null>(null);
  const [invoiceDeleteTarget, setInvoiceDeleteTarget] = useState<RetailerInvoiceRow | null>(null);
  const [invoiceDeleting, setInvoiceDeleting] = useState(false);

  const [retailerName, setRetailerName] = useState("");
  const [retailerAddress, setRetailerAddress] = useState("");
  const [retailerContactPerson, setRetailerContactPerson] = useState("");
  const [retailerTelephone, setRetailerTelephone] = useState("");
  const [retailerPhone, setRetailerPhone] = useState("");
  const [retailerAltPhone, setRetailerAltPhone] = useState("");
  const [retailerGst, setRetailerGst] = useState("");

  const inputStyle = { backgroundColor: INPUT_BG } as CSSProperties;

  useEffect(() => {
    setRetailers(initialRetailers);
  }, [initialRetailers]);

  useEffect(() => {
    setCompanies(initialCompanies);
  }, [initialCompanies]);

  useEffect(() => {
    setInvoiceCountByRetailer(initialInvoiceCountByRetailer);
  }, [initialInvoiceCountByRetailer]);

  useEffect(() => {
    setCompanyNamesByRetailer(initialCompanyNamesByRetailer);
  }, [initialCompanyNamesByRetailer]);

  useEffect(() => {
    setTotalAmountByRetailer(initialTotalAmountByRetailer);
  }, [initialTotalAmountByRetailer]);

  useEffect(() => {
    if (panel !== "view" || !selected) {
      setRetailerInvoices([]);
      setRetailerInvoicesLoading(false);
      return;
    }
    let cancelled = false;
    setRetailerInvoicesLoading(true);
    (async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("retailer_invoices")
        .select("*")
        .eq("retailer_id", selected.id)
        .order("bill_date", { ascending: false });
      if (cancelled) return;
      setRetailerInvoicesLoading(false);
      if (error) {
        toastError(error.message);
        setRetailerInvoices([]);
        return;
      }
      setRetailerInvoices((data ?? []) as RetailerInvoiceRow[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [panel, selected?.id]);

  const resetForm = useCallback(() => {
    setRetailerName("");
    setRetailerAddress("");
    setRetailerContactPerson("");
    setRetailerTelephone("");
    setRetailerPhone("");
    setRetailerAltPhone("");
    setRetailerGst("");
  }, []);

  const hydrateFromRetailer = useCallback((r: RetailerRow) => {
    setRetailerName(r.name ?? "");
    setRetailerAddress(r.address ?? "");
    setRetailerContactPerson(r.contact_person_name ?? "");
    setRetailerTelephone(r.telephone ?? "");
    setRetailerPhone(phoneDigitsFromStored(r.contact_no));
    setRetailerAltPhone(phoneDigitsFromStored(r.alternative_phone));
    setRetailerGst(r.gst_no ?? "");
  }, []);

  const finalizeClose = useCallback(() => {
    setPanel("closed");
    setSelected(null);
    setInlineInvoiceEdit(null);
    setRetailerViewTab("profile");
    resetForm();
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
    setSelected(null);
    resetForm();
    setPanel("add");
  };

  const openView = (r: RetailerRow) => {
    setSelected(r);
    hydrateFromRetailer(r);
    setRetailerViewTab("profile");
    setInlineInvoiceEdit(null);
    setPanel("view");
  };

  const openEdit = (r: RetailerRow) => {
    setSelected(r);
    hydrateFromRetailer(r);
    setPanel("edit");
  };

  const startEdit = () => {
    if (!selected) return;
    openEdit(selected);
  };

  function validateRetailerForm(): boolean {
    if (skipRequiredFieldValidation()) return true;
    if (!retailerName.trim()) {
      toastError("Enter retailer name.");
      return false;
    }
    if (!retailerAddress.trim()) {
      toastError("Enter retailer address.");
      return false;
    }
    const digits = retailerPhone.replace(/\D/g, "");
    if (digits.length !== 10) {
      toastError("Enter a valid 10-digit phone number.");
      return false;
    }
    const alt = retailerAltPhone.replace(/\D/g, "");
    if (alt.length > 0 && alt.length !== 10) {
      toastError("Alternative number must be 10 digits or leave it blank.");
      return false;
    }
    if (digits.length === 10 && alt.length === 10 && digits === alt) {
      toastError("Alternative number must differ from the primary phone.");
      return false;
    }
    const g = retailerGst.trim().toUpperCase();
    if (g.length !== 15) {
      toastError("GST number must be 15 characters.");
      return false;
    }
    return true;
  }

  function buildPayload() {
    const dev = skipRequiredFieldValidation();
    const digits = retailerPhone.replace(/\D/g, "");
    const phoneE164 = toE164Contact(digits);
    const altE164 = toE164Contact(retailerAltPhone);
    return {
      name: retailerName.trim() || (dev ? "Untitled retailer" : ""),
      address: retailerAddress.trim() || (dev ? "—" : ""),
      contact_person_name: trimNull(retailerContactPerson),
      telephone: trimNull(retailerTelephone),
      contact_no: phoneE164 ?? (dev ? "+919999999999" : ""),
      alternative_phone: altE164,
      gst_no:
        retailerGst.trim().toUpperCase().length === 15
          ? retailerGst.trim().toUpperCase()
          : dev
            ? "29AAAAA0000A1Z5"
            : "",
    };
  }

  async function saveNew() {
    if (!validateRetailerForm()) return;
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
    const payload = buildPayload();
    const { data, error } = await supabase
      .from("retailers")
      .insert({ user_id: user.id, ...payload })
      .select()
      .single();
    setSaving(false);
    if (error) {
      toastError(error.message);
      return;
    }
    const row = data as RetailerRow;
    setRetailers((prev) => [...prev, row].sort((a, b) => a.name.localeCompare(b.name)));
    toastSuccess("Retailer created.");
    requestClose();
    router.refresh();
  }

  async function saveEdit() {
    if (!selected || !validateRetailerForm()) return;
    setSaving(true);
    const supabase = createClient();
    const payload = buildPayload();
    const { data, error } = await supabase.from("retailers").update(payload).eq("id", selected.id).select().single();
    setSaving(false);
    if (error) {
      toastError(error.message);
      return;
    }
    const row = data as RetailerRow;
    setRetailers((prev) => prev.map((x) => (x.id === row.id ? row : x)).sort((a, b) => a.name.localeCompare(b.name)));
    setSelected(row);
    toastSuccess("Retailer updated.");
    setPanel("view");
    router.refresh();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const supabase = createClient();
    const { count, error: countErr } = await supabase
      .from("retailer_invoices")
      .select("id", { count: "exact", head: true })
      .eq("retailer_id", deleteTarget.id);
    if (countErr) {
      toastError(countErr.message);
      return;
    }
    if ((count ?? 0) > 0) {
      toastError("Remove or reassign invoices before deleting this retailer.");
      setDeleteTarget(null);
      return;
    }
    setDeleting(true);
    const { error } = await supabase.from("retailers").delete().eq("id", deleteTarget.id);
    setDeleting(false);
    if (error) {
      toastError(error.message);
      return;
    }
    setRetailers((prev) => prev.filter((x) => x.id !== deleteTarget.id));
    toastSuccess("Retailer deleted.");
    setDeleteTarget(null);
    if (selected?.id === deleteTarget.id) requestClose();
    router.refresh();
  }

  const companyNameById = useMemo(() => new Map(companies.map((c) => [c.id, c.name ?? ""])), [companies]);

  async function confirmDeleteInvoice() {
    if (!invoiceDeleteTarget || !selected) return;
    setInvoiceDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.from("retailer_invoices").delete().eq("id", invoiceDeleteTarget.id);
    setInvoiceDeleting(false);
    if (error) {
      toastError(error.message);
      return;
    }
    const prevLen = retailerInvoices.length;
    const nextInv = retailerInvoices.filter((i) => i.id !== invoiceDeleteTarget.id);
    setRetailerInvoices(nextInv);
    setInvoiceCountByRetailer((prev) => ({
      ...prev,
      [selected.id]: Math.max(0, (prev[selected.id] ?? prevLen) - 1),
    }));
    const t = nextInv.reduce((s, i) => s + Number(i.total_amount ?? 0), 0);
    const cids = new Set<string>();
    for (const inv of nextInv) {
      if (inv.company_id) cids.add(inv.company_id);
    }
    setTotalAmountByRetailer((p) => ({ ...p, [selected.id]: t }));
    setCompanyNamesByRetailer((p) => ({
      ...p,
      [selected.id]: [...cids].map((id) => companyNameById.get(id) ?? id).filter(Boolean).sort(),
    }));
    if (inlineInvoiceEdit?.id === invoiceDeleteTarget.id) setInlineInvoiceEdit(null);
    toastSuccess("Invoice deleted.");
    setInvoiceDeleteTarget(null);
    router.refresh();
  }

  const retailerViewStats = useMemo(() => {
    if (retailerInvoicesLoading) {
      return {
        loading: true as const,
        invoiceCount: invoiceCountByRetailer[selected?.id ?? ""] ?? 0,
        companyCount: companyNamesByRetailer[selected?.id ?? ""]?.length ?? 0,
        totalAmount: totalAmountByRetailer[selected?.id ?? ""] ?? 0,
      };
    }
    let total = 0;
    const cids = new Set<string>();
    for (const inv of retailerInvoices) {
      total += Number(inv.total_amount ?? 0);
      if (inv.company_id) cids.add(inv.company_id);
    }
    return {
      loading: false as const,
      invoiceCount: retailerInvoices.length,
      companyCount: cids.size,
      totalAmount: total,
    };
  }, [
    retailerInvoices,
    retailerInvoicesLoading,
    selected?.id,
    invoiceCountByRetailer,
    companyNamesByRetailer,
    totalAmountByRetailer,
  ]);

  const totalInvoicesAcrossRetailers = useMemo(
    () => retailers.reduce((sum, r) => sum + (invoiceCountByRetailer[r.id] ?? 0), 0),
    [retailers, invoiceCountByRetailer]
  );

  const linkedCompanyNames = useMemo(() => {
    if (!selected) return [];
    if (retailerInvoices.length > 0) {
      const s = new Set<string>();
      for (const inv of retailerInvoices) {
        const n = companyNameById.get(inv.company_id);
        if (n) s.add(n);
      }
      return [...s].sort();
    }
    return companyNamesByRetailer[selected.id] ?? [];
  }, [selected, retailerInvoices, companyNamesByRetailer, companyNameById]);

  const panelTitle = useMemo(() => {
    if (panel === "add") return "Add retailer";
    if (panel === "edit") return "Edit retailer";
    if (panel === "view") return selected?.name ?? "Retailer";
    return "";
  }, [panel, selected]);

  const formFields = (
    <div className="space-y-4">
      <div>
        <label htmlFor="r-name" className={labelDark}>
          Name <span className="text-red-400">*</span>
        </label>
        <input
          id="r-name"
          type="text"
          value={retailerName}
          onChange={(e) => setRetailerName(e.target.value)}
          disabled={saving}
          className={fieldClassDark()}
          style={inputStyle}
          placeholder="Retailer name"
          autoComplete="organization"
        />
      </div>
      <div>
        <label htmlFor="r-address" className={labelDark}>
          Address <span className="text-red-400">*</span>
        </label>
        <textarea
          id="r-address"
          rows={3}
          value={retailerAddress}
          onChange={(e) => setRetailerAddress(e.target.value)}
          disabled={saving}
          className={fieldClassDark(true)}
          style={inputStyle}
          placeholder="Full address"
        />
      </div>
      <div className="rounded-xl border border-white/10 bg-zinc-900/30 p-4">
        <p className="mb-3 text-sm font-semibold text-zinc-200">Contact details</p>
        <div className="space-y-4">
          <div>
            <label htmlFor="r-contact-person" className={labelDark}>
              Contact person name
            </label>
            <input
              id="r-contact-person"
              type="text"
              value={retailerContactPerson}
              onChange={(e) => setRetailerContactPerson(e.target.value)}
              disabled={saving}
              className={fieldClassDark()}
              style={inputStyle}
              placeholder="Name of contact person"
              autoComplete="name"
            />
          </div>
          <div>
            <label htmlFor="r-telephone" className={labelDark}>
              Telephone
            </label>
            <input
              id="r-telephone"
              type="text"
              value={retailerTelephone}
              onChange={(e) => setRetailerTelephone(e.target.value)}
              disabled={saving}
              className={fieldClassDark()}
              style={inputStyle}
              placeholder="Landline or office number"
            />
          </div>
          <div>
            <label htmlFor="r-phone" className={labelDark}>
              Phone no. <span className="text-red-400">*</span>
            </label>
            <div className="flex gap-2">
              <span
                className="flex w-[4.25rem] shrink-0 items-center justify-center rounded-xl border border-white/10 text-sm font-medium text-zinc-300"
                style={{ backgroundColor: INPUT_BG }}
              >
                +91
              </span>
              <input
                id="r-phone"
                type="text"
                inputMode="numeric"
                value={retailerPhone}
                onChange={(e) => setRetailerPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                disabled={saving}
                className={fieldClassDark()}
                style={inputStyle}
                placeholder="10-digit mobile"
              />
            </div>
          </div>
          <div>
            <label htmlFor="r-alt" className={labelDark}>
              Alternative no.
            </label>
            <div className="flex gap-2">
              <span
                className="flex w-[4.25rem] shrink-0 items-center justify-center rounded-xl border border-white/10 text-sm font-medium text-zinc-300"
                style={{ backgroundColor: INPUT_BG }}
              >
                +91
              </span>
              <input
                id="r-alt"
                type="text"
                inputMode="numeric"
                value={retailerAltPhone}
                onChange={(e) => setRetailerAltPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                disabled={saving}
                className={fieldClassDark()}
                style={inputStyle}
                placeholder="Optional second mobile"
              />
            </div>
          </div>
        </div>
      </div>
      <div>
        <label htmlFor="r-gst" className={labelDark}>
          GST no. <span className="text-red-400">*</span>
        </label>
        <input
          id="r-gst"
          type="text"
          value={retailerGst}
          onChange={(e) => setRetailerGst(e.target.value.toUpperCase())}
          disabled={saving}
          className={`${fieldClassDark()} font-mono uppercase`}
          style={inputStyle}
          placeholder="15-character GSTIN"
          maxLength={15}
        />
      </div>
    </div>
  );

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
                className="h-5 w-1 rounded-full bg-gradient-to-b from-violet-400 via-fuchsia-500 to-amber-500 shadow-[0_0_12px_rgba(167,139,250,0.35)]"
                aria-hidden
              />
              <h2 className="font-login-serif text-xl font-semibold tracking-tight text-white sm:text-2xl">Retailers</h2>
            </div>
            <p className="max-w-xl text-sm leading-relaxed text-zinc-400">
              Billing parties on invoices—see which companies they trade with and how many invoices each has.
            </p>
          </div>
          {retailers.length > 0 ? (
            <div className="flex shrink-0 gap-2 sm:justify-end">
              <div className="rounded-xl border border-zinc-700/60 bg-zinc-900 px-3.5 py-2.5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Retailers</p>
                <p className="mt-0.5 text-lg font-bold tabular-nums text-white">{retailers.length}</p>
              </div>
              <div className="rounded-xl border border-violet-900/40 bg-zinc-900 px-3.5 py-2.5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] ring-1 ring-violet-500/10">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Invoices</p>
                <p className="mt-0.5 text-lg font-bold tabular-nums text-violet-200">{totalInvoicesAcrossRetailers}</p>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {retailers.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-700/70 bg-gradient-to-b from-zinc-900/50 via-zinc-950/80 to-zinc-950 px-6 py-16 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-zinc-600/50 bg-zinc-900 text-zinc-400 shadow-[0_8px_32px_rgba(0,0,0,0.35)] ring-1 ring-white/[0.06]">
            <BuildingIcon className="h-8 w-8 opacity-90" />
          </div>
          <p className="text-lg font-semibold tracking-tight text-white">No retailers yet</p>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-zinc-400">Add a retailer to use them when creating invoices.</p>
          <button
            type="button"
            onClick={openAdd}
            className="mt-7 rounded-xl bg-zinc-200 px-6 py-3.5 text-sm font-semibold text-zinc-950 shadow-[0_4px_20px_rgba(255,255,255,0.08)] transition hover:bg-white active:scale-[0.98]"
          >
            Add your first retailer
          </button>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {retailers.map((r) => {
            const phoneDigits = phoneDigitsFromStored(r.contact_no);
            const phoneLabel = phoneDigits ? `+91 ${phoneDigits}` : "—";
            const invCount = invoiceCountByRetailer[r.id] ?? 0;
            const coNames = companyNamesByRetailer[r.id] ?? [];
            const coSummary =
              coNames.length === 0
                ? "No companies yet"
                : coNames.length <= 2
                  ? coNames.join(" · ")
                  : `${coNames.slice(0, 2).join(" · ")} +${coNames.length - 2}`;
            return (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => openView(r)}
                  className="group flex w-full items-stretch overflow-hidden rounded-2xl border border-zinc-800/80 bg-gradient-to-br from-zinc-950 to-zinc-950/85 text-left shadow-[0_1px_0_rgba(255,255,255,0.05)_inset,0_8px_24px_rgba(0,0,0,0.2)] ring-1 ring-white/[0.03] transition hover:border-zinc-600/80 hover:from-zinc-900/95 hover:to-zinc-950 hover:shadow-[0_12px_40px_rgba(0,0,0,0.35)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500/45 active:scale-[0.995]"
                >
                  <span
                    className="w-1.5 shrink-0 bg-gradient-to-b from-violet-400/95 via-fuchsia-500/85 to-amber-600/70 shadow-[2px_0_12px_rgba(167,139,250,0.2)]"
                    aria-hidden
                  />
                  <div className="flex min-w-0 flex-1 items-center gap-3 py-4 pl-4 pr-3 sm:gap-4 sm:pl-5 sm:pr-4">
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-[17px] font-semibold tracking-tight text-white">{r.name}</h3>
                      <p className="mt-1.5 font-mono text-sm tabular-nums tracking-tight text-zinc-400">{phoneLabel}</p>
                      <p className="mt-1 line-clamp-2 text-xs leading-snug text-zinc-500">
                        <span className="font-medium text-zinc-500">Companies</span> · {coSummary}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center sm:gap-3">
                      <div
                        className="flex items-center gap-1.5 rounded-full border border-zinc-700/60 bg-zinc-900 px-2.5 py-1 text-xs font-medium text-zinc-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                        title={`${invCount} invoice${invCount === 1 ? "" : "s"}`}
                      >
                        <InvoiceDocIcon className="h-3.5 w-3.5 text-violet-400" />
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

      <button
        type="button"
        onClick={openAdd}
        className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-200 text-zinc-950 shadow-[0_4px_24px_rgba(167,139,250,0.22),0_8px_32px_rgba(0,0,0,0.45)] ring-2 ring-[#101014] transition hover:scale-105 hover:bg-white hover:shadow-[0_6px_28px_rgba(167,139,250,0.28)] active:scale-95 md:bottom-10 md:right-10"
        aria-label="Add retailer"
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
            className={`fixed inset-0 z-[85] bg-black/60 transition-opacity duration-300 ${sheetOpen ? "opacity-100" : "opacity-0"}`}
            onClick={() => !saving && requestClose()}
          />
          <div
            className="fixed inset-x-0 bottom-0 top-12 z-[90] flex min-h-0 max-h-[100dvh] flex-col overflow-hidden rounded-t-3xl border border-zinc-600/50 bg-[#16181f] shadow-[0_-16px_48px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.06)] md:left-auto md:right-0 md:top-0 md:max-h-none md:w-full md:max-w-lg md:rounded-none md:rounded-l-3xl md:border-l md:border-t-0"
            role="dialog"
            aria-modal="true"
            aria-labelledby="retailer-sheet-title"
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
                id="retailer-sheet-title"
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
                  aria-label="Invoice summary for this retailer"
                  className="mb-3 rounded-xl bg-zinc-900 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ring-1 ring-white/[0.04]"
                >
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <div className="flex gap-2.5 rounded-lg border border-zinc-700/50 bg-zinc-950 px-2.5 py-2.5 sm:min-h-[5.5rem]">
                      <StatIconWrap tone="neutral">
                        <InvoiceDocIcon className="h-4 w-4" />
                      </StatIconWrap>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Invoices</p>
                        {retailerViewStats.loading ? (
                          <div className="mt-2 h-7 w-12 animate-pulse rounded-md bg-zinc-800/80" aria-hidden />
                        ) : (
                          <p className="mt-0.5 text-xl font-bold tabular-nums text-white">{retailerViewStats.invoiceCount}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2.5 rounded-lg border border-zinc-700/50 bg-zinc-950 px-2.5 py-2.5 sm:min-h-[5.5rem]">
                      <StatIconWrap tone="cyan">
                        <BuildingIcon className="h-4 w-4" />
                      </StatIconWrap>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Companies</p>
                        {retailerViewStats.loading ? (
                          <div className="mt-2 h-7 w-12 animate-pulse rounded-md bg-zinc-800/80" aria-hidden />
                        ) : (
                          <p className="mt-0.5 text-xl font-bold tabular-nums text-cyan-200">{retailerViewStats.companyCount}</p>
                        )}
                      </div>
                    </div>
                    <div className="col-span-2 flex gap-2.5 rounded-lg border border-teal-800/45 bg-zinc-950 px-2.5 py-2.5 ring-1 ring-teal-500/10 sm:col-span-1">
                      <StatIconWrap tone="teal">
                        <span className="text-[15px] font-semibold leading-none">₹</span>
                      </StatIconWrap>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Total amount</p>
                        {retailerViewStats.loading ? (
                          <div className="mt-2 h-7 w-28 max-w-full animate-pulse rounded-md bg-zinc-800/80" aria-hidden />
                        ) : (
                          <p className="mt-0.5 truncate font-mono text-base font-bold tabular-nums tracking-tight text-teal-200 sm:text-lg">
                            {formatInr(retailerViewStats.totalAmount)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  role="tablist"
                  aria-label="Retailer details"
                  className="flex gap-1 rounded-xl border border-zinc-700/70 bg-zinc-950 p-1 shadow-[inset_0_2px_8px_rgba(0,0,0,0.35)] ring-1 ring-white/[0.04]"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={retailerViewTab === "profile"}
                    id="tab-retailer-profile"
                    aria-controls="panel-retailer-profile"
                    onClick={() => {
                      setRetailerViewTab("profile");
                      setInlineInvoiceEdit(null);
                    }}
                    className={`relative flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition ${
                      retailerViewTab === "profile"
                        ? "bg-zinc-600 text-white shadow-[0_2px_8px_rgba(0,0,0,0.35)] ring-1 ring-white/10"
                        : "text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300"
                    }`}
                  >
                    <PersonIcon className="h-4 w-4 shrink-0 opacity-90" />
                    Retailer
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={retailerViewTab === "invoices"}
                    id="tab-retailer-invoices"
                    aria-controls="panel-retailer-invoices"
                    onClick={() => setRetailerViewTab("invoices")}
                    className={`relative flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition ${
                      retailerViewTab === "invoices"
                        ? "bg-zinc-600 text-white shadow-[0_2px_8px_rgba(0,0,0,0.35)] ring-1 ring-white/10"
                        : "text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300"
                    }`}
                  >
                    <InvoiceDocIcon className="h-4 w-4 shrink-0 opacity-90" />
                    <span>Invoices</span>
                    {!retailerInvoicesLoading ? (
                      <span
                        className={`min-w-[1.25rem] rounded-md px-1.5 py-0.5 text-xs font-bold tabular-nums ${
                          retailerViewTab === "invoices" ? "bg-violet-500/25 text-violet-100" : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        {retailerInvoices.length}
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
                  {retailerViewTab === "profile" ? (
                    <section
                      id="panel-retailer-profile"
                      role="tabpanel"
                      aria-labelledby="tab-retailer-profile"
                      className="relative z-0"
                    >
                      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <p className="max-w-md text-xs leading-relaxed text-zinc-500">
                          Contact and GST for this retailer, plus companies they appear on via invoices.
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

                      <ViewSectionCard className="mb-4">
                        <ViewSubsectionLabel>Linked companies</ViewSubsectionLabel>
                        <div className="px-3 py-3 sm:px-4">
                          {linkedCompanyNames.length === 0 ? (
                            <p className="text-sm text-zinc-500">No invoices yet—companies will show here once you bill this retailer.</p>
                          ) : (
                            <ul className="flex flex-wrap gap-2">
                              {linkedCompanyNames.map((name) => (
                                <li
                                  key={name}
                                  className="rounded-lg border border-zinc-700/60 bg-zinc-900 px-2.5 py-1.5 text-sm font-medium text-zinc-200"
                                >
                                  {name}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </ViewSectionCard>

                      <ViewSectionCard>
                        <ViewSubsectionLabel>Contact &amp; registration</ViewSubsectionLabel>
                        <div className="px-3 pb-2 pt-0.5 sm:px-4">
                          <ViewRow label="Name" value={selected.name ?? ""} />
                          <ViewRow label="Address" value={selected.address ?? ""} />
                          <ViewRow label="Contact person name" value={selected.contact_person_name ?? ""} />
                          <ViewRow label="Telephone" value={selected.telephone ?? ""} />
                          <ViewRow
                            label="Phone no."
                            value={phoneDigitsFromStored(selected.contact_no) ? `+91 ${phoneDigitsFromStored(selected.contact_no)}` : ""}
                            mono
                          />
                          <ViewRow
                            label="Alternative no."
                            value={
                              phoneDigitsFromStored(selected.alternative_phone)
                                ? `+91 ${phoneDigitsFromStored(selected.alternative_phone)}`
                                : ""
                            }
                            mono
                          />
                          <ViewRow label="GST no." value={selected.gst_no ?? ""} mono />
                        </div>
                      </ViewSectionCard>
                    </section>
                  ) : (
                    <section
                      id="panel-retailer-invoices"
                      role="tabpanel"
                      aria-labelledby="tab-retailer-invoices"
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
                                const next = retailerInvoices.map((x) => (x.id === row.id ? row : x));
                                setRetailerInvoices(next);
                                let total = 0;
                                const cids = new Set<string>();
                                for (const inv of next) {
                                  total += Number(inv.total_amount ?? 0);
                                  if (inv.company_id) cids.add(inv.company_id);
                                }
                                setTotalAmountByRetailer((p) => ({ ...p, [selected.id]: total }));
                                setCompanyNamesByRetailer((p) => ({
                                  ...p,
                                  [selected.id]: [...cids].map((id) => companyNameById.get(id) ?? id).filter(Boolean).sort(),
                                }));
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
                            Invoices for this retailer. Edit here without leaving; delete removes the invoice permanently.
                          </p>
                          <ViewSectionCard className="border-violet-900/35 ring-violet-500/[0.07]">
                            {retailerInvoicesLoading ? (
                              <div className="flex items-center gap-3 px-4 py-8">
                                <span
                                  className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-zinc-600 border-t-violet-400"
                                  aria-hidden
                                />
                                <p className="text-sm text-zinc-400">Loading invoices…</p>
                              </div>
                            ) : retailerInvoices.length === 0 ? (
                              <div className="px-4 py-10 text-center">
                                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-800/80 bg-zinc-900/50 text-zinc-600">
                                  <InvoiceDocIcon className="h-6 w-6" />
                                </div>
                                <p className="text-sm font-medium text-zinc-300">No invoices yet</p>
                                <p className="mt-1 text-xs text-zinc-500">Create an invoice from the Invoices tab and select this retailer.</p>
                              </div>
                            ) : (
                              <ul>
                                {retailerInvoices.map((inv) => {
                                  const coName = companyNameById.get(inv.company_id) ?? "—";
                                  return (
                                    <li
                                      key={inv.id}
                                      className="flex flex-wrap items-center gap-3 border-b border-zinc-800/45 px-3 py-4 transition-colors last:border-b-0 hover:bg-zinc-900/45 sm:flex-nowrap sm:px-4"
                                    >
                                      <div className="min-w-0 flex-1">
                                        <p className="font-semibold tracking-tight text-white">{inv.invoice_number}</p>
                                        <p className="mt-0.5 text-xs text-violet-200/90">{coName}</p>
                                        <p className="mt-0.5 text-xs text-zinc-500">
                                          {(inv.bill_date ?? "").slice(0, 10)}
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
                                  );
                                })}
                              </ul>
                            )}
                          </ViewSectionCard>
                        </>
                      )}
                    </section>
                  )}
                </div>
              )}

              {(panel === "add" || panel === "edit") && (
                <form
                  id="retailer-form"
                  className="space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void (panel === "add" ? saveNew() : saveEdit());
                  }}
                >
                  {formFields}
                </form>
              )}
            </div>

            {panel === "add" && (
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
                    type="submit"
                    form="retailer-form"
                    disabled={saving}
                    className="min-h-[48px] flex-[1.15] rounded-xl bg-zinc-300 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200 disabled:opacity-50"
                  >
                    {saving ? "Saving…" : "Save retailer"}
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
                    form="retailer-form"
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
            aria-labelledby="retailer-del-title"
            className="fixed left-1/2 top-1/2 z-[101] w-[min(100%-2rem,22rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-zinc-700 bg-[#1A1C26] p-5 shadow-xl"
          >
            <h3 id="retailer-del-title" className="text-lg font-semibold text-white">
              Delete retailer?
            </h3>
            <p className="mt-2 text-sm text-zinc-400">
              Remove <span className="font-medium text-white">&ldquo;{deleteTarget.name}&rdquo;</span>? This cannot be undone. Retailers with invoices
              cannot be deleted.
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
          <div className="fixed inset-0 z-[100] bg-black/70" aria-hidden onClick={() => !invoiceDeleting && setInvoiceDeleteTarget(null)} />
          <div
            role="alertdialog"
            aria-labelledby="retailer-inv-del-title"
            className="fixed left-1/2 top-1/2 z-[101] w-[min(100%-2rem,22rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-zinc-700 bg-[#1A1C26] p-5 shadow-xl"
          >
            <h3 id="retailer-inv-del-title" className="text-lg font-semibold text-white">
              Delete invoice?
            </h3>
            <p className="mt-2 text-sm text-zinc-400">
              Remove invoice{" "}
              <span className="font-medium text-white">&ldquo;{invoiceDeleteTarget.invoice_number}&rdquo;</span>? This cannot be undone.
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
