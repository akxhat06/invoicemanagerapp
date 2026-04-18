"use client";

import { createClient } from "@/lib/supabase/client";
import { BuildingIcon, InvoiceDocIcon } from "@/components/retailers/retailer-detail-ui";
import { PAN_PREFIX, parseRetailerTaxId, phoneDigitsFromStored } from "@/lib/retailer-helpers";
import { skipRequiredFieldValidation } from "@/lib/dev-validation";
import { toastError, toastSuccess } from "@/lib/toast";
import type { CompanyRow } from "@/types/company";
import type { RetailerRow } from "@/types/retailer";
import { useWorkspaceUiSession } from "@/hooks/use-workspace-ui-session";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type TransitionEvent } from "react";

type Props = {
  initialRetailers: RetailerRow[];
  initialCompanies: CompanyRow[];
  initialInvoiceCountByRetailer: Record<string, number>;
  initialCompanyNamesByRetailer: Record<string, string[]>;
  initialTotalAmountByRetailer: Record<string, number>;
  /** When set (e.g. `/retailers?edit=id`), opens edit sheet once for that retailer. */
  editRetailerId?: string | null;
};

type PanelMode = "closed" | "add" | "edit";

type RetailersUiSessionV1 = {
  v: 1;
  panel: PanelMode;
  selectedId: string | null;
  draft: {
    retailerName: string;
    retailerAddress: string;
    retailerContactPerson: string;
    retailerTelephone: string;
    retailerPhone: string;
    retailerAltPhone: string;
    retailerTaxIdType: "gst" | "pan";
    retailerGst: string;
  } | null;
};

const CANVAS = "#101014";
const INPUT_BG = "#1E1E24";

function trimNull(s: string): string | null {
  const v = s.trim();
  return v === "" ? null : v;
}

function toE164Contact(digits: string): string | null {
  const d = digits.replace(/\D/g, "").slice(0, 10);
  return d.length === 10 ? `+91${d}` : null;
}

function toStoredRetailerTaxId(type: "gst" | "pan", value: string): string {
  const clean = value.trim().toUpperCase();
  return type === "pan" ? `${PAN_PREFIX}${clean}` : clean;
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

export function RetailersScreen({
  initialRetailers,
  initialCompanies,
  initialInvoiceCountByRetailer,
  initialCompanyNamesByRetailer,
  initialTotalAmountByRetailer,
  editRetailerId = null,
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
  const editFromQueryRef = useRef(false);

  const [retailerName, setRetailerName] = useState("");
  const [retailerAddress, setRetailerAddress] = useState("");
  const [retailerContactPerson, setRetailerContactPerson] = useState("");
  const [retailerTelephone, setRetailerTelephone] = useState("");
  const [retailerPhone, setRetailerPhone] = useState("");
  const [retailerAltPhone, setRetailerAltPhone] = useState("");
  const [retailerTaxIdType, setRetailerTaxIdType] = useState<"gst" | "pan">("gst");
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
    editFromQueryRef.current = false;
  }, [editRetailerId]);

  const resetForm = useCallback(() => {
    setRetailerName("");
    setRetailerAddress("");
    setRetailerContactPerson("");
    setRetailerTelephone("");
    setRetailerPhone("");
    setRetailerAltPhone("");
    setRetailerTaxIdType("gst");
    setRetailerGst("");
  }, []);

  const hydrateFromRetailer = useCallback((r: RetailerRow) => {
    setRetailerName(r.name ?? "");
    setRetailerAddress(r.address ?? "");
    setRetailerContactPerson(r.contact_person_name ?? "");
    setRetailerTelephone(r.telephone ?? "");
    setRetailerPhone(phoneDigitsFromStored(r.contact_no));
    setRetailerAltPhone(phoneDigitsFromStored(r.alternative_phone));
    const parsedTax = parseRetailerTaxId(r.gst_no);
    setRetailerTaxIdType(parsedTax.type);
    setRetailerGst(parsedTax.value);
  }, []);

  useEffect(() => {
    if (!editRetailerId || editFromQueryRef.current) return;
    const r = retailers.find((x) => x.id === editRetailerId);
    if (!r) return;
    editFromQueryRef.current = true;
    hydrateFromRetailer(r);
    setSelected(r);
    setPanel("edit");
    router.replace("/retailers", { scroll: false });
  }, [editRetailerId, retailers, hydrateFromRetailer, router]);

  const applyRetailersUiSession = useCallback(
    (s: RetailersUiSessionV1) => {
      if (s.panel === "closed" || (s.panel as string) === "view") {
        setPanel("closed");
        setSelected(null);
        resetForm();
        return;
      }
      setPanel(s.panel);
      if (s.selectedId) {
        const r = retailers.find((x) => x.id === s.selectedId);
        if (!r) {
          setPanel("closed");
          setSelected(null);
          resetForm();
          return;
        }
        setSelected(r);
        if (s.draft && (s.panel === "add" || s.panel === "edit")) {
          setRetailerName(s.draft.retailerName);
          setRetailerAddress(s.draft.retailerAddress);
          setRetailerContactPerson(s.draft.retailerContactPerson);
          setRetailerTelephone(s.draft.retailerTelephone);
          setRetailerPhone(s.draft.retailerPhone);
          setRetailerAltPhone(s.draft.retailerAltPhone);
          setRetailerTaxIdType(s.draft.retailerTaxIdType ?? "gst");
          setRetailerGst(s.draft.retailerGst);
        } else if (s.panel === "edit") {
          hydrateFromRetailer(r);
        }
      } else if (s.panel === "add") {
        setSelected(null);
        if (s.draft) {
          setRetailerName(s.draft.retailerName);
          setRetailerAddress(s.draft.retailerAddress);
          setRetailerContactPerson(s.draft.retailerContactPerson);
          setRetailerTelephone(s.draft.retailerTelephone);
          setRetailerPhone(s.draft.retailerPhone);
          setRetailerAltPhone(s.draft.retailerAltPhone);
          setRetailerTaxIdType(s.draft.retailerTaxIdType ?? "gst");
          setRetailerGst(s.draft.retailerGst);
        } else {
          resetForm();
        }
      }
    },
    [retailers, hydrateFromRetailer, resetForm]
  );

  useWorkspaceUiSession<RetailersUiSessionV1>({
    route: "retailers",
    version: 1,
    restoreReady: true,
    buildSnapshot: () => ({
      v: 1,
      panel,
      selectedId: selected?.id ?? null,
      draft:
        panel === "add" || panel === "edit"
          ? {
              retailerName,
              retailerAddress,
              retailerContactPerson,
              retailerTelephone,
              retailerPhone,
              retailerAltPhone,
              retailerTaxIdType,
              retailerGst,
            }
          : null,
    }),
    applyRestore: applyRetailersUiSession,
    saveDeps: [
      panel,
      selected?.id,
      retailerName,
      retailerAddress,
      retailerContactPerson,
      retailerTelephone,
      retailerPhone,
      retailerAltPhone,
      retailerTaxIdType,
      retailerGst,
    ],
  });

  const finalizeClose = useCallback(() => {
    setPanel("closed");
    setSelected(null);
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
    router.push(`/retailers/${r.id}`);
  };

  const openEdit = (r: RetailerRow) => {
    setSelected(r);
    hydrateFromRetailer(r);
    setPanel("edit");
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
    if (retailerTaxIdType === "gst") {
      if (g.length !== 15) {
        toastError("GST number must be 15 characters.");
        return false;
      }
    } else {
      if (!g) {
        toastError("Enter PAN number.");
        return false;
      }
      if (g.length > 15) {
        toastError("PAN number cannot exceed 15 characters.");
        return false;
      }
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
      gst_no: (() => {
        const clean = retailerGst.trim().toUpperCase();
        if (retailerTaxIdType === "gst") {
          return clean.length === 15 ? clean : dev ? "29AAAAA0000A1Z5" : "";
        }
        if (clean.length > 0 && clean.length <= 15) {
          return toStoredRetailerTaxId("pan", clean);
        }
        return dev ? `${PAN_PREFIX}ABCDE1234F` : "";
      })(),
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
    requestClose();
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

  const totalInvoicesAcrossRetailers = useMemo(
    () => retailers.reduce((sum, r) => sum + (invoiceCountByRetailer[r.id] ?? 0), 0),
    [retailers, invoiceCountByRetailer]
  );

  const panelTitle = useMemo(() => {
    if (panel === "add") return "Add retailer";
    if (panel === "edit") return "Edit retailer";
    return "";
  }, [panel]);

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
        <label htmlFor="r-tax-type" className={labelDark}>
          Tax ID type <span className="text-red-400">*</span>
        </label>
        <div className="relative">
          <select
            id="r-tax-type"
            value={retailerTaxIdType}
            onChange={(e) => setRetailerTaxIdType(e.target.value === "pan" ? "pan" : "gst")}
            disabled={saving}
            className={`${fieldClassDark()} appearance-none pr-9`}
            style={inputStyle}
          >
            <option value="gst">GST</option>
            <option value="pan">PAN</option>
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
        <label htmlFor="r-gst" className={labelDark}>
          {retailerTaxIdType === "gst" ? "GST no." : "PAN no."} <span className="text-red-400">*</span>
        </label>
        <input
          id="r-gst"
          type="text"
          value={retailerGst}
          onChange={(e) =>
            setRetailerGst(
              e.target.value
                .toUpperCase()
                .replace(/\s/g, "")
                .slice(0, 15)
            )
          }
          disabled={saving}
          className={`${fieldClassDark()} font-mono uppercase`}
          style={inputStyle}
          placeholder={retailerTaxIdType === "gst" ? "15-character GSTIN" : "PAN (max 15 characters)"}
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
        className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-300 to-violet-200 text-violet-950 shadow-[0_8px_32px_rgba(167,139,250,0.42),0_2px_8px_rgba(0,0,0,0.4)] ring-2 ring-[#101014] transition hover:scale-105 hover:from-violet-200 hover:to-violet-100 active:scale-95 md:bottom-10 md:right-10"
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
            className="fixed inset-x-0 bottom-0 top-12 z-[90] flex min-h-0 max-h-[100dvh] flex-col overflow-hidden rounded-t-[1.75rem] border border-white/[0.09] bg-[#0f1117] shadow-[0_-28px_64px_rgba(0,0,0,0.5)] md:left-auto md:right-0 md:top-0 md:max-h-none md:w-full md:max-w-lg md:rounded-none md:rounded-l-[1.75rem] md:border-l md:border-t-0"
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
            <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-t-[1.75rem] md:rounded-l-[1.75rem]" aria-hidden>
              <div className="absolute -left-1/4 -top-32 h-56 w-[150%] bg-gradient-to-b from-violet-600/18 via-fuchsia-600/5 to-transparent blur-2xl" />
              <div className="absolute -right-8 top-24 h-44 w-44 rounded-full bg-teal-500/12 blur-3xl" />
              <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black/25 to-transparent" />
            </div>
            <div className="relative z-10 mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-white/20 md:hidden" aria-hidden />
            <div className="relative z-20 flex shrink-0 items-center gap-3 border-b border-white/[0.07] bg-black/20 px-4 py-3.5 backdrop-blur-xl">
              <button
                type="button"
                onClick={() => requestClose()}
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

            <div className="relative z-10 min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 pb-32">
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
              <div className="absolute bottom-0 left-0 right-0 z-20 border-t border-white/[0.08] bg-[#0f1117]/90 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl">
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
              <div className="absolute bottom-0 left-0 right-0 z-20 border-t border-white/[0.08] bg-[#0f1117]/90 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl">
                <div className="flex gap-3">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => requestClose()}
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

    </div>
  );
}
