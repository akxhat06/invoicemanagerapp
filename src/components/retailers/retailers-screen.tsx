"use client";

import { createClient } from "@/lib/supabase/client";
import { skipRequiredFieldValidation } from "@/lib/dev-validation";
import { toastError, toastSuccess } from "@/lib/toast";
import { SwipeCompanyRow } from "@/components/companies/swipe-company-row";
import type { CompanyRow } from "@/types/company";
import type { RetailerInvoiceRow } from "@/types/invoice";
import type { RetailerRow } from "@/types/retailer";
import { DatePicker } from "@/components/ui/date-picker";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type Props = {
  initialRetailers: RetailerRow[];
  initialInvoices: RetailerInvoiceRow[];
  initialCompanies: CompanyRow[];
};

type Panel = "closed" | "retailer" | "invoice";

function todayISODate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseAmount(s: string): number {
  const v = parseFloat(s.replace(/,/g, ""));
  return Number.isFinite(v) ? v : 0;
}

const panelInput =
  "bg-panel-field text-panel-foreground placeholder:text-panel-muted w-full rounded-lg border border-border px-3.5 py-3 text-[15px] outline-none transition focus:border-amber-600/60 focus:ring-1 focus:ring-amber-500/30 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700/80";

const panelLabel = "text-panel-foreground mb-1.5 block text-sm font-medium";

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
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

function InvoiceDocIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6M7 4h7l4 4v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
    </svg>
  );
}

function EditPencilIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  );
}

export function RetailersScreen({ initialRetailers, initialInvoices, initialCompanies }: Props) {
  const router = useRouter();
  const [retailers, setRetailers] = useState<RetailerRow[]>(initialRetailers);
  const [invoices, setInvoices] = useState<RetailerInvoiceRow[]>(initialInvoices);
  const [companies] = useState<CompanyRow[]>(initialCompanies);

  const [panel, setPanel] = useState<Panel>("closed");
  const [saving, setSaving] = useState(false);

  const [deleteRetailerPending, setDeleteRetailerPending] = useState<RetailerRow | null>(null);
  const [deletingRetailerId, setDeletingRetailerId] = useState<string | null>(null);
  const [deleteInvoicePending, setDeleteInvoicePending] = useState<RetailerInvoiceRow | null>(null);
  const [deletingInvoiceId, setDeletingInvoiceId] = useState<string | null>(null);

  /** When set, retailer panel saves as update instead of insert */
  const [editingRetailerId, setEditingRetailerId] = useState<string | null>(null);

  /** Retailer form */
  const [retailerName, setRetailerName] = useState("");
  const [retailerAddress, setRetailerAddress] = useState("");
  const [retailerContact, setRetailerContact] = useState("");
  const [retailerGst, setRetailerGst] = useState("");

  /** Invoice form */
  const [invoiceCompanyId, setInvoiceCompanyId] = useState("");
  const [invoiceRetailerId, setInvoiceRetailerId] = useState("");
  const [billDate, setBillDate] = useState(todayISODate());
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [basicAmount, setBasicAmount] = useState("");
  const [gstAmount, setGstAmount] = useState("");
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [transportationAmount, setTransportationAmount] = useState("");

  useEffect(() => {
    setRetailers(initialRetailers);
  }, [initialRetailers]);

  useEffect(() => {
    setInvoices(initialInvoices);
  }, [initialInvoices]);

  useEffect(() => {
    document.body.style.overflow = panel !== "closed" ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [panel]);

  const selectedRetailerForInvoice = useMemo(
    () => retailers.find((r) => r.id === invoiceRetailerId) ?? null,
    [retailers, invoiceRetailerId]
  );

  function closePanel() {
    if (saving) return;
    if (panel === "retailer") {
      resetRetailerForm();
    }
    setPanel("closed");
  }

  function openRetailerPanel() {
    resetRetailerForm();
    setPanel("retailer");
  }

  function openRetailerPanelForEdit(r: RetailerRow) {
    if (deletingRetailerId) return;
    setEditingRetailerId(r.id);
    setRetailerName(r.name ?? "");
    setRetailerAddress(r.address ?? "");
    setRetailerContact(r.contact_no?.replace(/\D/g, "").slice(0, 10) ?? "");
    setRetailerGst(r.gst_no ?? "");
    setPanel("retailer");
  }

  function openInvoicePanel() {
    if (companies.length === 0) {
      toastError("Add a company first.");
      return;
    }
    if (retailers.length === 0) {
      toastError("Create a retailer first, then add an invoice.");
      return;
    }
    resetInvoiceForm();
    setPanel("invoice");
  }

  function resetRetailerForm() {
    setEditingRetailerId(null);
    setRetailerName("");
    setRetailerAddress("");
    setRetailerContact("");
    setRetailerGst("");
  }

  function resetInvoiceForm() {
    setInvoiceCompanyId("");
    setInvoiceRetailerId("");
    setBillDate(todayISODate());
    setInvoiceNumber("");
    setBasicAmount("");
    setGstAmount("");
    setInvoiceAmount("");
    setTransportationAmount("");
  }

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
    const digits = retailerContact.replace(/\D/g, "");
    if (digits.length !== 10) {
      toastError("Enter a valid 10-digit contact number.");
      return false;
    }
    const g = retailerGst.trim().toUpperCase();
    if (g.length !== 15) {
      toastError("GST number must be 15 characters.");
      return false;
    }
    return true;
  }

  function validateInvoiceForm(): boolean {
    if (skipRequiredFieldValidation()) return true;
    if (!invoiceCompanyId) {
      toastError("Select company.");
      return false;
    }
    if (!invoiceRetailerId) {
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
    if (parseAmount(basicAmount) <= 0) {
      toastError("Enter basic amount.");
      return false;
    }
    if (parseAmount(gstAmount) < 0) {
      toastError("GST amount cannot be negative.");
      return false;
    }
    if (parseAmount(invoiceAmount) <= 0) {
      toastError("Enter invoice amount.");
      return false;
    }
    if (parseAmount(transportationAmount) < 0) {
      toastError("Transportation amount cannot be negative.");
      return false;
    }
    return true;
  }

  async function submitRetailer() {
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
    const dev = skipRequiredFieldValidation();
    const digits = retailerContact.replace(/\D/g, "");
    const payload = {
      name: retailerName.trim() || (dev ? "Untitled retailer" : ""),
      address: retailerAddress.trim() || (dev ? "—" : ""),
      contact_no: digits.length === 10 ? digits : dev ? "0000000000" : "",
      gst_no:
        retailerGst.trim().toUpperCase().length === 15
          ? retailerGst.trim().toUpperCase()
          : dev
            ? "29AAAAA0000A1Z5"
            : "",
    };

    const isEdit = editingRetailerId !== null;
    const { data, error } = isEdit
      ? await supabase.from("retailers").update(payload).eq("id", editingRetailerId).select().single()
      : await supabase
          .from("retailers")
          .insert({
            user_id: user.id,
            ...payload,
          })
          .select()
          .single();

    setSaving(false);
    if (error) {
      toastError(error.message);
      return;
    }
    const row = data as RetailerRow;
    setRetailers((prev) => {
      const next = isEdit ? prev.map((x) => (x.id === row.id ? row : x)) : [...prev, row];
      return next.sort((a, b) => a.name.localeCompare(b.name));
    });
    toastSuccess(isEdit ? "Retailer updated." : "Retailer created.");
    setPanel("closed");
    resetRetailerForm();
    router.refresh();
  }

  async function submitInvoice() {
    if (!validateInvoiceForm()) return;
    const dev = skipRequiredFieldValidation();
    const r = selectedRetailerForInvoice ?? (dev ? retailers[0] : undefined);
    const cid = invoiceCompanyId || (dev ? companies[0]?.id ?? "" : "");
    if (!r || !cid) {
      toastError(dev ? "Add at least one retailer and company first." : "Select company and retailer.");
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
    const basicRaw = parseAmount(basicAmount);
    const gstRaw = parseAmount(gstAmount);
    const invoiceRaw = parseAmount(invoiceAmount);
    const transportRaw = parseAmount(transportationAmount);
    const basic = dev && basicRaw <= 0 ? 0.01 : basicRaw;
    const gst = dev && gstRaw < 0 ? 0 : gstRaw;
    const invoice = dev && invoiceRaw <= 0 ? 0.01 : invoiceRaw;
    const transport = dev && transportRaw < 0 ? 0 : transportRaw;
    const total = invoice + transport;
    const { data, error } = await supabase
      .from("retailer_invoices")
      .insert({
        user_id: user.id,
        retailer_id: r.id,
        retailer_name: r.name,
        retailer_address: r.address,
        contact_no: r.contact_no,
        gst_no: r.gst_no,
        company_id: cid,
        invoice_number: invoiceNumber.trim() || (dev ? "DEV-000" : ""),
        bill_date: billDate || (dev ? todayISODate() : ""),
        basic_amount: basic,
        gst_amount: gst,
        invoice_amount: invoice,
        transportation_amount: transport,
        cd_amount: 0,
        total_amount: total,
        payment_received: 0,
        outstanding_amount: total,
        is_draft: false,
      })
      .select()
      .single();
    setSaving(false);
    if (error) {
      toastError(error.message);
      return;
    }
    setInvoices((prev) => [data as RetailerInvoiceRow, ...prev]);
    toastSuccess("Invoice saved.");
    setPanel("closed");
    resetInvoiceForm();
    router.refresh();
  }

  function fabToggle() {
    if (panel !== "closed") {
      closePanel();
      return;
    }
    openRetailerPanel();
  }

  function requestDeleteRetailer(r: RetailerRow) {
    if (deletingRetailerId) return;
    const hasInvoices = invoices.some((inv) => inv.retailer_id === r.id);
    if (hasInvoices) {
      toastError("Remove or reassign invoices before deleting this retailer.");
      return;
    }
    setDeleteRetailerPending(r);
  }

  async function confirmDeleteRetailer() {
    const target = deleteRetailerPending;
    if (!target || deletingRetailerId) return;
    setDeletingRetailerId(target.id);
    setDeleteRetailerPending(null);
    const supabase = createClient();
    const { error } = await supabase.from("retailers").delete().eq("id", target.id);
    if (error) {
      setDeletingRetailerId(null);
      toastError(error.message);
      return;
    }
    setRetailers((prev) => prev.filter((x) => x.id !== target.id));
    setDeletingRetailerId(null);
    toastSuccess("Retailer deleted.");
    router.refresh();
  }

  function requestDeleteInvoice(inv: RetailerInvoiceRow) {
    if (deletingInvoiceId) return;
    setDeleteInvoicePending(inv);
  }

  async function confirmDeleteInvoice() {
    const target = deleteInvoicePending;
    if (!target || deletingInvoiceId) return;
    setDeletingInvoiceId(target.id);
    setDeleteInvoicePending(null);
    const supabase = createClient();
    const { error } = await supabase.from("retailer_invoices").delete().eq("id", target.id);
    if (error) {
      setDeletingInvoiceId(null);
      toastError(error.message);
      return;
    }
    setInvoices((prev) => prev.filter((i) => i.id !== target.id));
    setDeletingInvoiceId(null);
    toastSuccess("Invoice deleted.");
    router.refresh();
  }

  const panelTitle =
    panel === "retailer"
      ? editingRetailerId
        ? "Edit Retailer"
        : "New Retailer"
      : panel === "invoice"
        ? "Invoice Entry"
        : "";

  return (
    <div className="relative pb-28">
      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="bg-accent h-5 w-1 shrink-0 rounded-full" />
            <h2 className="text-base font-bold tracking-tight text-zinc-900 dark:text-white">Retailers</h2>
          </div>
          <button
            type="button"
            onClick={openInvoicePanel}
            className="border-border text-foreground inline-flex shrink-0 items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm font-semibold shadow-sm transition hover:bg-muted/60"
          >
            <InvoiceDocIcon />
            Invoice entry
          </button>
        </div>
        <p className="text-muted-foreground mb-4 text-sm">
          Add retailers first, then use <span className="font-medium">Invoice entry</span> to choose company, retailer, and invoice details. Tap a retailer to edit.
        </p>

        <h3 className="text-muted-foreground mb-2 text-xs font-semibold uppercase tracking-wider">Your retailers</h3>
        {retailers.length === 0 ? (
          <div className="mb-6 flex flex-col items-center rounded-2xl border border-dashed border-zinc-300 bg-white/80 px-5 py-10 text-center dark:border-zinc-600/80 dark:bg-card/80">
            <p className="font-semibold text-zinc-900 dark:text-white">No retailers yet</p>
            <p className="mt-1 max-w-xs text-sm text-zinc-500 dark:text-zinc-400">
              Tap <span className="font-medium text-zinc-700 dark:text-zinc-300">+</span> to create a retailer.
            </p>
          </div>
        ) : (
          <ul className="mb-8 flex flex-col gap-3">
            {retailers.map((r) => (
              <SwipeCompanyRow
                key={r.id}
                onSwipeDelete={() => requestDeleteRetailer(r)}
                disabled={deletingRetailerId === r.id || !!deletingRetailerId}
              >
                <button
                  type="button"
                  onClick={() => openRetailerPanelForEdit(r)}
                  aria-label={`Edit retailer ${r.name}`}
                  className={`flex w-full cursor-pointer items-start gap-3 p-4 text-left transition hover:bg-muted/40 ${deletingRetailerId === r.id ? "pointer-events-none opacity-60" : ""}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-zinc-900 dark:text-white">{r.name}</p>
                    <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                      {r.contact_no?.trim() || "—"} · {r.gst_no?.trim() || "—"}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{r.address?.trim() || "—"}</p>
                  </div>
                  <span
                    className="border-border text-muted-foreground inline-flex shrink-0 rounded-lg border bg-muted/30 p-2 dark:bg-muted/20"
                    title="Edit"
                  >
                    <EditPencilIcon />
                  </span>
                </button>
              </SwipeCompanyRow>
            ))}
          </ul>
        )}

        <h3 className="text-muted-foreground mb-2 text-xs font-semibold uppercase tracking-wider">Invoices</h3>
        {invoices.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-zinc-300 bg-white/80 px-5 py-10 text-center dark:border-zinc-600/80 dark:bg-card/80">
            <p className="font-semibold text-zinc-900 dark:text-white">No invoices yet</p>
            <p className="mt-1 max-w-xs text-sm text-zinc-500 dark:text-zinc-400">
              Use <span className="font-medium">Invoice entry</span> after you add a retailer.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {invoices.map((inv) => (
              <SwipeCompanyRow
                key={inv.id}
                onSwipeDelete={() => requestDeleteInvoice(inv)}
                disabled={deletingInvoiceId === inv.id || !!deletingInvoiceId}
              >
                <Link
                  href={`/retailers/${inv.id}`}
                  className={`block p-4 ${deletingInvoiceId === inv.id ? "pointer-events-none opacity-60" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-zinc-900 dark:text-white">{inv.invoice_number}</p>
                      <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                        {inv.retailer_name?.trim() || "Retailer"} · {companies.find((c) => c.id === inv.company_id)?.name ?? "Company"} ·{" "}
                        {inv.bill_date}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        Basic: {Number(inv.basic_amount || 0).toFixed(2)} · GST: {Number(inv.gst_amount || 0).toFixed(2)} · Transport:{" "}
                        {Number(inv.transportation_amount || 0).toFixed(2)}
                      </p>
                    </div>
                    <span className="inline-flex shrink-0 rounded-md border border-amber-300/70 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800 dark:border-amber-700/60 dark:bg-amber-900/30 dark:text-amber-200">
                      Manage flow
                    </span>
                  </div>
                </Link>
              </SwipeCompanyRow>
            ))}
          </ul>
        )}
      </section>

      {deleteRetailerPending && (
        <>
          <button type="button" aria-label="Close" className="fixed inset-0 z-[95] bg-black/55 backdrop-blur-[2px]" onClick={() => setDeleteRetailerPending(null)} />
          <div className="border-border bg-card fixed left-1/2 top-1/2 z-[100] w-[min(92vw,22rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border p-4 shadow-2xl">
            <h3 className="text-base font-bold">Delete retailer?</h3>
            <p className="text-muted-foreground mt-2 text-sm">This cannot be undone. Retailers with invoices cannot be deleted.</p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteRetailerPending(null)}
                className="border-border text-foreground flex-1 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted/70"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmDeleteRetailer()}
                className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-500"
              >
                Delete
              </button>
            </div>
          </div>
        </>
      )}

      {deleteInvoicePending && (
        <>
          <button type="button" aria-label="Close" className="fixed inset-0 z-[95] bg-black/55 backdrop-blur-[2px]" onClick={() => setDeleteInvoicePending(null)} />
          <div className="border-border bg-card fixed left-1/2 top-1/2 z-[100] w-[min(92vw,22rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border p-4 shadow-2xl">
            <h3 className="text-base font-bold">Delete invoice?</h3>
            <p className="text-muted-foreground mt-2 text-sm">This will also delete Transport, Returns, Payments, and Commission linked to this invoice.</p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteInvoicePending(null)}
                className="border-border text-foreground flex-1 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted/70"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmDeleteInvoice()}
                className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-500"
              >
                Delete
              </button>
            </div>
          </div>
        </>
      )}

      <button
        type="button"
        aria-label="Close panel"
        className={`fixed inset-0 z-[85] bg-black/55 backdrop-blur-[2px] transition-opacity duration-300 ${
          panel !== "closed" ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={closePanel}
      />

      <div
        className={`bg-panel text-panel-foreground fixed inset-y-0 right-0 z-[90] flex w-full max-w-md flex-col shadow-2xl transition-transform duration-300 ease-out ${
          panel !== "closed" ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="border-border relative flex shrink-0 items-center justify-center border-b px-2 py-4">
            <button
              type="button"
              onClick={closePanel}
              disabled={saving}
              className="text-panel-muted hover:bg-black/5 hover:text-panel-foreground dark:hover:bg-white/10 absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg transition disabled:opacity-50"
              aria-label="Close"
            >
              <ChevronLeftIcon />
            </button>
            <h2 className="text-panel-foreground px-12 text-center text-lg font-bold">{panelTitle}</h2>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
            {panel === "retailer" && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="r-name" className={panelLabel}>
                    Retailer name <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="r-name"
                    type="text"
                    value={retailerName}
                    onChange={(e) => setRetailerName(e.target.value)}
                    disabled={saving}
                    className={panelInput}
                    placeholder="Retailer name"
                    autoComplete="organization"
                  />
                </div>
                <div>
                  <label htmlFor="r-address" className={panelLabel}>
                    Retailer address <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    id="r-address"
                    rows={3}
                    value={retailerAddress}
                    onChange={(e) => setRetailerAddress(e.target.value)}
                    disabled={saving}
                    className={panelInput}
                    placeholder="Full address"
                  />
                </div>
                <div>
                  <label htmlFor="r-contact" className={panelLabel}>
                    Contact no. <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="r-contact"
                    type="text"
                    inputMode="numeric"
                    value={retailerContact}
                    onChange={(e) => setRetailerContact(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    disabled={saving}
                    className={panelInput}
                    placeholder="10-digit number"
                  />
                </div>
                <div>
                  <label htmlFor="r-gst" className={panelLabel}>
                    GST no. (retailer) <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="r-gst"
                    type="text"
                    value={retailerGst}
                    onChange={(e) => setRetailerGst(e.target.value.toUpperCase())}
                    disabled={saving}
                    className={`${panelInput} font-mono uppercase`}
                    placeholder="15-character GSTIN"
                    maxLength={15}
                  />
                </div>
              </div>
            )}

            {panel === "invoice" && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="i-company" className={panelLabel}>
                    Company name <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <select
                      id="i-company"
                      value={invoiceCompanyId}
                      onChange={(e) => setInvoiceCompanyId(e.target.value)}
                      disabled={saving}
                      className={`${panelInput} appearance-none pr-9`}
                    >
                      <option value="">Select company</option>
                      {companies.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <svg
                      className="text-panel-muted pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2"
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
                  <label htmlFor="i-retailer" className={panelLabel}>
                    Retailer <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <select
                      id="i-retailer"
                      value={invoiceRetailerId}
                      onChange={(e) => setInvoiceRetailerId(e.target.value)}
                      disabled={saving}
                      className={`${panelInput} appearance-none pr-9`}
                    >
                      <option value="">Select retailer</option>
                      {retailers.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                    <svg
                      className="text-panel-muted pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2"
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
                  <label htmlFor="i-date" className={panelLabel}>
                    Invoice date <span className="text-red-400">*</span>
                  </label>
                  <DatePicker value={billDate} onChange={setBillDate} disabled={saving} className={panelInput} />
                </div>
                <div>
                  <label htmlFor="i-no" className={panelLabel}>
                    Invoice no. <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="i-no"
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    disabled={saving}
                    className={panelInput}
                    placeholder="Invoice number"
                  />
                </div>
                <div>
                  <label htmlFor="i-basic" className={panelLabel}>
                    Basic amount <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="i-basic"
                    type="text"
                    inputMode="decimal"
                    value={basicAmount}
                    onChange={(e) => setBasicAmount(e.target.value)}
                    disabled={saving}
                    className={panelInput}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label htmlFor="i-gst-amt" className={panelLabel}>
                    GST amount <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="i-gst-amt"
                    type="text"
                    inputMode="decimal"
                    value={gstAmount}
                    onChange={(e) => setGstAmount(e.target.value)}
                    disabled={saving}
                    className={panelInput}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label htmlFor="i-inv-amt" className={panelLabel}>
                    Invoice amount <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="i-inv-amt"
                    type="text"
                    inputMode="decimal"
                    value={invoiceAmount}
                    onChange={(e) => setInvoiceAmount(e.target.value)}
                    disabled={saving}
                    className={panelInput}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label htmlFor="i-transport" className={panelLabel}>
                    Transportation
                  </label>
                  <input
                    id="i-transport"
                    type="text"
                    inputMode="decimal"
                    value={transportationAmount}
                    onChange={(e) => setTransportationAmount(e.target.value)}
                    disabled={saving}
                    className={panelInput}
                    placeholder="0.00"
                  />
                </div>
              </div>
            )}
          </div>

          {(panel === "retailer" || panel === "invoice") && (
            <div className="bg-panel border-border shrink-0 border-t px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={closePanel}
                  disabled={saving}
                  className="border-border text-panel-foreground hover:bg-muted flex flex-1 items-center justify-center rounded-lg border bg-transparent px-4 py-3.5 text-sm font-semibold transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void (panel === "retailer" ? submitRetailer() : submitInvoice())}
                  disabled={saving}
                  className="bg-accent-secondary text-accent-secondary-foreground flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-3.5 text-sm font-semibold transition hover:brightness-105 disabled:opacity-50"
                >
                  {saving ? "Saving…" : (
                    <>
                      {panel === "retailer" ? "Save retailer" : "Save invoice"}
                      <ArrowRightIcon />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={fabToggle}
        className={`fixed bottom-5 right-4 z-[75] flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
          panel !== "closed"
            ? "rotate-90 bg-zinc-700 text-white hover:bg-zinc-600 dark:bg-zinc-600 dark:hover:bg-zinc-500"
            : "bg-accent text-accent-foreground shadow-[0_0_24px_rgba(224,192,104,0.35)] hover:scale-105 hover:shadow-xl active:scale-95"
        }`}
        aria-label={panel !== "closed" ? "Close panel" : "New retailer"}
      >
        {panel !== "closed" ? <CloseIcon /> : <PlusIcon className="h-7 w-7" />}
      </button>
    </div>
  );
}
