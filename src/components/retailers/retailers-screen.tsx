"use client";

import { createClient } from "@/lib/supabase/client";
import { skipRequiredFieldValidation } from "@/lib/dev-validation";
import { toastError, toastSuccess } from "@/lib/toast";
import type { RetailerRow } from "@/types/retailer";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type TransitionEvent } from "react";

type Props = {
  initialRetailers: RetailerRow[];
};

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

export function RetailersScreen({ initialRetailers }: Props) {
  const router = useRouter();
  const [retailers, setRetailers] = useState<RetailerRow[]>(initialRetailers);
  const [panel, setPanel] = useState<PanelMode>("closed");
  const prevPanelRef = useRef<PanelMode>("closed");
  const [sheetOpen, setSheetOpen] = useState(false);
  const sheetOpenRef = useRef(sheetOpen);
  const isAnimatingClose = useRef(false);
  const [selected, setSelected] = useState<RetailerRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RetailerRow | null>(null);
  const [deleting, setDeleting] = useState(false);

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
        <div className="mb-1 flex items-center gap-2">
          <span className="h-5 w-1 rounded-full bg-zinc-500" aria-hidden />
          <h2 className="font-login-serif text-xl font-semibold tracking-tight text-white sm:text-2xl">Retailers</h2>
        </div>
        <p className="text-sm text-zinc-400">View, add, and edit retailer profiles used on invoices.</p>
      </div>

      {retailers.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/40 px-6 py-14 text-center">
          <p className="font-semibold text-white">No retailers yet</p>
          <p className="mt-2 max-w-sm text-sm text-zinc-400">Add a retailer to use them when creating invoices.</p>
          <button
            type="button"
            onClick={openAdd}
            className="mt-6 rounded-xl bg-zinc-300 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200"
          >
            Add your first retailer
          </button>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {retailers.map((r) => {
            const phoneDigits = phoneDigitsFromStored(r.contact_no);
            const phoneLabel = phoneDigits ? `+91 ${phoneDigits}` : "—";
            return (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => openView(r)}
                  className="group flex w-full items-stretch overflow-hidden rounded-xl border border-zinc-800/90 bg-zinc-950/35 text-left transition hover:border-zinc-600/80 hover:bg-zinc-900/45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500"
                >
                  <span className="w-1 shrink-0 bg-zinc-500" aria-hidden />
                  <div className="flex min-w-0 flex-1 items-center gap-3 py-3.5 pl-3 pr-4">
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-base font-semibold text-white">{r.name}</h3>
                      <p className="mt-0.5 font-mono text-[15px] tabular-nums tracking-tight text-zinc-400">{phoneLabel}</p>
                      <p className="mt-0.5 truncate text-xs text-zinc-500">
                        <span className="text-zinc-600">GSTIN</span> {r.gst_no?.trim() || "—"}
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

      <button
        type="button"
        onClick={openAdd}
        className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-300 text-zinc-950 shadow-lg transition hover:scale-105 hover:bg-zinc-200 active:scale-95 md:bottom-10 md:right-10"
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
            className="fixed inset-x-0 bottom-0 top-12 z-[90] flex max-h-[100dvh] flex-col rounded-t-3xl border border-zinc-700/90 bg-[#16181f] shadow-[0_-12px_40px_rgba(0,0,0,0.45)] md:left-auto md:right-0 md:top-0 md:max-h-none md:w-full md:max-w-lg md:rounded-none md:rounded-l-3xl md:border-l md:border-t-0"
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
            <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-zinc-600 md:hidden" aria-hidden />
            <div className="flex shrink-0 items-center gap-3 border-b border-zinc-700/80 px-4 py-3">
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
              <h2 id="retailer-sheet-title" className="flex-1 truncate text-center text-lg font-semibold text-white md:text-left">
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
    </div>
  );
}
