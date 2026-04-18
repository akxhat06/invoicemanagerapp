"use client";

import {
  buildCommissionReportPdf,
  type CommissionReportCompanySection,
  type CommissionReportRetailerSection,
} from "@/lib/commission-report-pdf";
import { SearchableDropdown, type SearchableDropdownOption } from "@/components/ui/searchable-dropdown";
import { createClient } from "@/lib/supabase/client";
import type { CompanyRow } from "@/types/company";
import { useCallback, useEffect, useMemo, useState } from "react";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function currentYear() {
  return new Date().getFullYear();
}

function yearRange() {
  const y = currentYear();
  const years: number[] = [];
  for (let i = y - 4; i <= y + 1; i++) years.push(i);
  return years;
}

function toNum(v: unknown): number {
  const n = parseFloat(String(v ?? "0"));
  return Number.isFinite(n) ? n : 0;
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "-";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getFullYear()).slice(-2)}`;
}

function fmtPeriodLabel(
  fromMonth: number,
  fromYear: number,
  toMonth: number,
  toYear: number
) {
  const fromLabel = `01/${String(fromMonth + 1).padStart(2, "0")}/${String(fromYear).slice(-2)}`;
  const toLabel = `${String(new Date(toYear, toMonth + 1, 0).getDate()).padStart(2, "0")}/${String(toMonth + 1).padStart(2, "0")}/${String(toYear).slice(-2)}`;
  return `${fromLabel} – ${toLabel}`;
}

type InvNested = {
  id: string;
  bill_date: string;
  company_id: string;
  retailer_name: string | null;
  total_amount: number;
  payment_received: number;
  outstanding_amount: number;
  invoice_goods_returns: { id: string; amount: number; return_date: string; note: string | null }[] | null;
  invoice_payments: {
    payment_date: string;
    method: string;
    amount: number;
    cheque_no: string | null;
    upi_no: string | null;
    upi_ref_no: string | null;
    neft_utr_no: string | null;
    note: string | null;
  }[] | null;
};

type CommissionNested = {
  id: string;
  commission_percent: number;
  commission_amount: number;
  retailer_id: string;
  retailer_name: string;
};

/** Invoice row from DB with nested payments, returns, and optional commission line(s). */
type InvoiceForReport = {
  id: string;
  bill_date: string;
  company_id: string;
  retailer_id: string | null;
  retailer_name: string | null;
  invoice_number: string;
  total_amount: number;
  payment_received: number;
  outstanding_amount: number;
  invoice_goods_returns: InvNested["invoice_goods_returns"];
  invoice_payments: InvNested["invoice_payments"];
  commissions: CommissionNested | CommissionNested[] | null;
};

function pickCommNested(raw: InvoiceForReport["commissions"]): CommissionNested[] {
  if (raw == null) return [];
  return Array.isArray(raw) ? raw : [raw];
}

function aggregateCommission(raw: InvoiceForReport["commissions"]): { pct: number; amt: number } {
  const rows = pickCommNested(raw);
  if (rows.length === 0) return { pct: 0, amt: 0 };
  const amt = rows.reduce((s, r) => s + toNum(r.commission_amount), 0);
  const pct = toNum(rows[0]!.commission_percent);
  return { pct, amt };
}

function invoiceRetailerDisplayName(inv: InvoiceForReport): string {
  const fromInv = inv.retailer_name?.trim();
  const rows = pickCommNested(inv.commissions);
  const fromComm = rows[0]?.retailer_name?.trim();
  return fromInv || fromComm || "Unknown";
}

function paymentRef(p: {
  cheque_no?: string | null;
  upi_no?: string | null;
  upi_ref_no?: string | null;
  neft_utr_no?: string | null;
  note?: string | null;
}): string {
  const s = (x: string | null | undefined) => (x?.trim() ? x.trim() : "");
  return s(p.neft_utr_no) || s(p.upi_ref_no) || s(p.upi_no) || s(p.cheque_no) || s(p.note) || "—";
}

/**
 * Build PDF sections from bills in range (not from commissions alone), so every retailer
 * with an invoice appears even when no commission row exists yet.
 */
function buildSectionsFromInvoices(
  invoices: InvoiceForReport[],
  periodLabel: string,
  companyFilter: "all" | string,
  companiesById: Map<string, Pick<CompanyRow, "id" | "name" | "gst_no">>
): CommissionReportCompanySection[] {
  const byCompany = new Map<string, InvoiceForReport[]>();
  for (const inv of invoices) {
    const cid = inv.company_id;
    if (companyFilter !== "all" && cid !== companyFilter) continue;
    if (!byCompany.has(cid)) byCompany.set(cid, []);
    byCompany.get(cid)!.push(inv);
  }

  const companyIds = [...byCompany.keys()].sort((a, b) => {
    const na = companiesById.get(a)?.name ?? a;
    const nb = companiesById.get(b)?.name ?? b;
    return na.localeCompare(nb);
  });

  const sections: CommissionReportCompanySection[] = [];

  for (const companyId of companyIds) {
    const list = byCompany.get(companyId)!;

    const dbCo = companiesById.get(companyId);
    const companyName = dbCo?.name?.trim() || "Company";
    const gstNo = dbCo?.gst_no ?? null;

    const byRetailerId = new Map<string, InvoiceForReport[]>();
    for (const inv of list) {
      const rid = inv.retailer_id?.trim();
      const key = rid || `invoice:${inv.id}`;
      if (!byRetailerId.has(key)) byRetailerId.set(key, []);
      byRetailerId.get(key)!.push(inv);
    }

    const retailerKeys = [...byRetailerId.keys()].sort((a, b) => {
      const na = invoiceRetailerDisplayName(byRetailerId.get(a)![0]!);
      const nb = invoiceRetailerDisplayName(byRetailerId.get(b)![0]!);
      const cmp = na.localeCompare(nb);
      return cmp !== 0 ? cmp : a.localeCompare(b);
    });

    const retailers: CommissionReportRetailerSection[] = [];

    for (const rkey of retailerKeys) {
      const rlist = byRetailerId.get(rkey)!;
      const rname = invoiceRetailerDisplayName(rlist[0]!);
      rlist.sort((a, b) => a.bill_date.localeCompare(b.bill_date));

      const invoiceRows: CommissionReportRetailerSection["rows"] = [];
      const totals = { billAmt: 0, rcvdAmt: 0, grAmt: 0, outstanding: 0, commAmt: 0 };
      let sr = 0;

      const paymentList: { date: string; mode: string; amount: number; reference: string }[] = [];
      const creditList: { cnNo: string; date: string; amount: number; reason: string }[] = [];

      for (const inv of rlist) {
        sr++;
        const billAmt = toNum(inv.total_amount);
        const rcvdAmt = toNum(inv.payment_received);
        const outstanding = toNum(inv.outstanding_amount);
        const grAmt = (inv.invoice_goods_returns ?? []).reduce((s, g) => s + toNum(g.amount), 0);
        const { pct: commPct, amt: commAmt } = aggregateCommission(inv.commissions);

        invoiceRows.push({
          sr,
          invoiceNo: inv.invoice_number,
          date: fmtDate(inv.bill_date),
          billAmt,
          rcvdAmt,
          grAmt,
          outstanding,
          commPct,
          commAmt,
        });

        totals.billAmt += billAmt;
        totals.rcvdAmt += rcvdAmt;
        totals.grAmt += grAmt;
        totals.outstanding += outstanding;
        totals.commAmt += commAmt;

        for (const p of inv.invoice_payments ?? []) {
          paymentList.push({
            date: fmtDate(p.payment_date),
            mode: p.method,
            amount: toNum(p.amount),
            reference: paymentRef(p),
          });
        }

        for (const g of inv.invoice_goods_returns ?? []) {
          creditList.push({
            cnNo: g.note?.trim() || `GR-${g.id.slice(0, 8)}`,
            date: fmtDate(g.return_date),
            amount: toNum(g.amount),
            reason: g.note?.trim() || "Goods return",
          });
        }
      }

      paymentList.sort((a, b) => a.date.localeCompare(b.date));
      creditList.sort((a, b) => a.date.localeCompare(b.date));

      retailers.push({
        retailerName: rname,
        rows: invoiceRows,
        totals,
        payments: paymentList,
        creditNotes: creditList,
      });
    }

    sections.push({
      companyId,
      companyName,
      gstNo,
      periodLabel,
      retailers,
    });
  }

  return sections;
}

const REPORT_PAGE_SIZE = 1000;

async function fetchInvoicesForReport(
  supabase: ReturnType<typeof createClient>,
  fromDate: string,
  toDate: string,
  companyFilter: "all" | string
): Promise<InvoiceForReport[]> {
  const out: InvoiceForReport[] = [];
  for (let offset = 0; ; offset += REPORT_PAGE_SIZE) {
    let q = supabase
      .from("retailer_invoices")
      .select(
        `
          id,
          bill_date,
          company_id,
          retailer_id,
          retailer_name,
          invoice_number,
          total_amount,
          payment_received,
          outstanding_amount,
          invoice_goods_returns ( id, amount, return_date, note ),
          invoice_payments ( payment_date, method, amount, cheque_no, upi_no, upi_ref_no, neft_utr_no, note ),
          commissions ( id, commission_percent, commission_amount, retailer_id, retailer_name )
        `
      )
      .gte("bill_date", fromDate)
      .lte("bill_date", toDate)
      .order("company_id", { ascending: true })
      .order("retailer_name", { ascending: true })
      .order("bill_date", { ascending: true })
      .range(offset, offset + REPORT_PAGE_SIZE - 1);

    if (companyFilter !== "all") {
      q = q.eq("company_id", companyFilter);
    }

    const { data, error } = await q;
    if (error) throw new Error(error.message);
    const batch = (data ?? []) as unknown as InvoiceForReport[];
    out.push(...batch);
    if (batch.length < REPORT_PAGE_SIZE) break;
  }
  return out;
}

function FileTextIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const reportDropdownTriggerCls =
  "w-full rounded-md border border-zinc-700/80 bg-zinc-900 px-2.5 py-1.5 text-left text-xs outline-none transition focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/20 disabled:cursor-not-allowed disabled:opacity-50";

export function GenerateReportButton() {
  const [open, setOpen] = useState(false);

  const now = new Date();
  const [fromMonth, setFromMonth] = useState(now.getMonth());
  const [fromYear, setFromYear] = useState(now.getFullYear());
  const [toMonth, setToMonth] = useState(now.getMonth());
  const [toYear, setToYear] = useState(now.getFullYear());
  const [companyFilter, setCompanyFilter] = useState<"all" | string>("all");
  const [companies, setCompanies] = useState<Pick<CompanyRow, "id" | "name" | "gst_no">[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoadingCompanies(true);
      try {
        const supabase = createClient();
        const { data, error: e } = await supabase.from("companies").select("id,name,gst_no").order("name");
        if (e) throw e;
        if (!cancelled) setCompanies((data ?? []) as Pick<CompanyRow, "id" | "name" | "gst_no">[]);
      } catch {
        if (!cancelled) setCompanies([]);
      } finally {
        if (!cancelled) setLoadingCompanies(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const closePreview = useCallback(() => {
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

  const monthOptions = useMemo<SearchableDropdownOption[]>(
    () => MONTHS.map((m, i) => ({ value: String(i), label: m })),
    []
  );

  const yearOptions = useMemo<SearchableDropdownOption[]>(
    () => yearRange().map((y) => ({ value: String(y), label: String(y) })),
    []
  );

  const companyOptions = useMemo<SearchableDropdownOption[]>(() => {
    const base: SearchableDropdownOption[] = [{ value: "all", label: "All companies" }];
    return base.concat(companies.map((c) => ({ value: c.id, label: c.name })));
  }, [companies]);

  async function runReport(mode: "view" | "download") {
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase.from("profiles").select("username").eq("id", user.id).single();

      const fromDate = new Date(fromYear, fromMonth, 1).toISOString().slice(0, 10);
      const toDate = new Date(toYear, toMonth + 1, 0).toISOString().slice(0, 10);

      if (fromDate > toDate) {
        setError("'From' date must be before or equal to 'To' date.");
        setLoading(false);
        return;
      }

      const invoices = await fetchInvoicesForReport(supabase, fromDate, toDate, companyFilter);

      if (invoices.length === 0) {
        setError(
          companyFilter === "all"
            ? "No bills in the selected date range."
            : "No bills for this company in the selected date range."
        );
        setLoading(false);
        return;
      }

      const companiesById = new Map(companies.map((c) => [c.id, c]));
      const periodLabel = fmtPeriodLabel(fromMonth, fromYear, toMonth, toYear);

      const sections = buildSectionsFromInvoices(invoices, periodLabel, companyFilter, companiesById);

      if (sections.length === 0) {
        setError("No data for the selected company in this period.");
        setLoading(false);
        return;
      }

      const loginLabel =
        user.email?.trim() ||
        (typeof user.phone === "string" && user.phone.trim() ? user.phone.trim() : null) ||
        (profile as { username?: string } | null)?.username?.trim() ||
        null;

      const printedLabel = new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });

      const doc = buildCommissionReportPdf(sections, {
        printedLabel,
        signedInLabel: loginLabel,
      });

      if (mode === "view") {
        const blob = doc.output("blob");
        const url = URL.createObjectURL(blob);
        setPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
        setOpen(false);
      } else {
        const fileName = `Commission_Report_${MONTHS[fromMonth].slice(0, 3)}${fromYear}_to_${MONTHS[toMonth].slice(0, 3)}${toYear}.pdf`;
        doc.save(fileName);
        setOpen(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate report");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => {
          setOpen(true);
          setError(null);
        }}
        title="Generate Commission Report"
        className="flex items-center gap-1 rounded-md border border-indigo-500/30 bg-indigo-500/10 px-2 py-1 text-[10px] font-semibold text-indigo-300 ring-1 ring-inset ring-indigo-500/10 transition hover:border-indigo-400/50 hover:bg-indigo-500/15 hover:text-indigo-200 active:scale-95"
      >
        <FileTextIcon className="h-3 w-3 shrink-0" />
        Report
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              if (!loading) setOpen(false);
            }}
          />

          <div className="relative z-10 w-full max-w-[min(100%,17.5rem)] rounded-xl border border-zinc-700/80 bg-zinc-950 shadow-2xl ring-1 ring-white/[0.06] sm:max-w-[18.5rem]">
            <div className="flex items-center justify-between border-b border-zinc-800/80 px-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/20">
                  <FileTextIcon className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-xs font-semibold leading-tight text-white">Commission report</h2>
                  <p className="truncate text-[10px] text-zinc-500">Party-wise PDF</p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (!loading) setOpen(false);
                }}
                className="shrink-0 rounded-md p-1 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-200"
              >
                <XIcon className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="space-y-3 px-3 pb-3 pt-2.5">
              <p className="text-[10px] leading-snug text-zinc-500">
                Bill date in range. Pick company to filter.
              </p>

              <div className="space-y-1">
                <label className="text-[9px] font-semibold uppercase tracking-wider text-zinc-500">Company</label>
                <SearchableDropdown
                  value={companyFilter}
                  onChange={(v) => setCompanyFilter(v === "all" ? "all" : v)}
                  options={companyOptions}
                  placeholder="All companies"
                  disabled={loadingCompanies}
                  showSearch
                  allowClear={false}
                  size="sm"
                  placement="below"
                  listMaxHeight="calc(2.25rem * 4)"
                  triggerClassName={reportDropdownTriggerCls}
                  placeholderClassName="text-zinc-500"
                  valueClassName="text-zinc-100"
                  inputBackground="#18181b"
                  menuZIndex={400}
                  aria-label="Company for report"
                />
                {loadingCompanies ? (
                  <p className="text-[10px] text-zinc-600">Loading companies…</p>
                ) : null}
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-semibold uppercase tracking-wider text-zinc-500">From</label>
                <div className="grid grid-cols-2 gap-2">
                  <SearchableDropdown
                    value={String(fromMonth)}
                    onChange={(v) => setFromMonth(Number(v))}
                    options={monthOptions}
                    showSearch={false}
                    allowClear={false}
                    size="sm"
                    placement="below"
                    listMaxHeight="calc(2.25rem * 5)"
                    triggerClassName={reportDropdownTriggerCls}
                    placeholderClassName="text-zinc-500"
                    valueClassName="text-zinc-100"
                    inputBackground="#18181b"
                    menuZIndex={400}
                    aria-label="From month"
                  />
                  <SearchableDropdown
                    value={String(fromYear)}
                    onChange={(v) => setFromYear(Number(v))}
                    options={yearOptions}
                    showSearch={false}
                    allowClear={false}
                    size="sm"
                    placement="below"
                    listMaxHeight="calc(2.25rem * 5)"
                    triggerClassName={reportDropdownTriggerCls}
                    placeholderClassName="text-zinc-500"
                    valueClassName="text-zinc-100"
                    inputBackground="#18181b"
                    menuZIndex={400}
                    aria-label="From year"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-semibold uppercase tracking-wider text-zinc-500">To</label>
                <div className="grid grid-cols-2 gap-2">
                  <SearchableDropdown
                    value={String(toMonth)}
                    onChange={(v) => setToMonth(Number(v))}
                    options={monthOptions}
                    showSearch={false}
                    allowClear={false}
                    size="sm"
                    placement="below"
                    listMaxHeight="calc(2.25rem * 5)"
                    triggerClassName={reportDropdownTriggerCls}
                    placeholderClassName="text-zinc-500"
                    valueClassName="text-zinc-100"
                    inputBackground="#18181b"
                    menuZIndex={400}
                    aria-label="To month"
                  />
                  <SearchableDropdown
                    value={String(toYear)}
                    onChange={(v) => setToYear(Number(v))}
                    options={yearOptions}
                    showSearch={false}
                    allowClear={false}
                    size="sm"
                    placement="below"
                    listMaxHeight="calc(2.25rem * 5)"
                    triggerClassName={reportDropdownTriggerCls}
                    placeholderClassName="text-zinc-500"
                    valueClassName="text-zinc-100"
                    inputBackground="#18181b"
                    menuZIndex={400}
                    aria-label="To year"
                  />
                </div>
              </div>

              {error && (
                <p className="rounded-md border border-red-500/20 bg-red-500/10 px-2 py-1.5 text-[10px] leading-snug text-red-400">
                  {error}
                </p>
              )}
            </div>

            <div className="border-t border-zinc-800/80 px-3 pb-3 pt-2.5">
              <div className="flex flex-nowrap items-center justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={loading}
                  className="shrink-0 rounded-md px-2 py-1.5 text-[11px] font-medium text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void runReport("view")}
                  disabled={loading}
                  className="inline-flex min-h-8 shrink-0 items-center justify-center gap-1.5 rounded-md border border-violet-500/35 bg-violet-950/60 px-2.5 py-1.5 text-[11px] font-semibold text-violet-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:border-violet-400/45 hover:bg-violet-900/50 disabled:cursor-wait disabled:opacity-100"
                >
                  {loading ? (
                    <>
                      <svg className="h-3.5 w-3.5 shrink-0 animate-spin text-violet-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round" />
                      </svg>
                      <span>Loading…</span>
                    </>
                  ) : (
                    "View"
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => void runReport("download")}
                  disabled={loading}
                  className="inline-flex min-h-8 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-indigo-600 px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-md shadow-indigo-500/25 ring-1 ring-indigo-400/20 transition hover:bg-indigo-500 disabled:cursor-wait disabled:opacity-100 active:scale-[0.99]"
                >
                  {loading ? (
                    <>
                      <svg className="h-3.5 w-3.5 shrink-0 animate-spin text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round" />
                      </svg>
                      <span>Loading…</span>
                    </>
                  ) : (
                    <>
                      <FileTextIcon className="h-3.5 w-3.5 shrink-0" />
                      Download
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {previewUrl && (
        <div className="fixed inset-0 z-[70] flex flex-col bg-zinc-950">
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-zinc-800 px-3 py-1.5">
            <p className="truncate text-xs font-medium text-white">Preview</p>
            <button
              type="button"
              onClick={closePreview}
              className="rounded-md px-2 py-1 text-[11px] font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white"
            >
              Close
            </button>
          </div>
          <iframe title="Commission report preview" src={previewUrl} className="min-h-0 flex-1 w-full border-0 bg-zinc-900" />
        </div>
      )}
    </>
  );
}
