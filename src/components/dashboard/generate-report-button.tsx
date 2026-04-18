"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// ── Helpers ──────────────────────────────────────────────────────────────────

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

function formatInrPdf(n: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(
    Number.isFinite(n) ? n : 0
  );
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "-";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getFullYear()).slice(-2)}`;
}

// ── Types ────────────────────────────────────────────────────────────────────

type CommissionWithInvoice = {
  id: string;
  invoice_id: string;
  invoice_number: string;
  retailer_name: string;
  basic_amount: number;
  gst_amount: number;
  commission_percent: number;
  commission_amount: number;
  created_at: string;
  retailer_invoices: {
    bill_date: string;
    total_amount: number;
    payment_received: number;
    outstanding_amount: number;
    invoice_goods_returns: { amount: number }[];
  } | null;
};

type PartyGroup = {
  partyName: string;
  rows: {
    sr: number;
    invoiceNo: string;
    date: string;
    billAmt: number;
    basicAmt: number;
    gstAmt: number;
    rcvdAmt: number;
    grAmt: number;
    outstanding: number;
    commPct: number;
    commAmt: number;
  }[];
  totals: {
    billAmt: number;
    rcvdAmt: number;
    grAmt: number;
    outstanding: number;
    commAmt: number;
  };
};

// ── PDF Generation ───────────────────────────────────────────────────────────

// Color palette (light professional theme)
const C = {
  navy:      [15,  40,  80]  as [number,number,number],
  navyLight: [30,  60, 120]  as [number,number,number],
  partyBg:   [232, 240, 255] as [number,number,number],
  partyText: [15,  40,  80]  as [number,number,number],
  totalBg:   [215, 228, 250] as [number,number,number],
  grandBg:   [15,  40,  80]  as [number,number,number],
  grandText: [255, 255, 255] as [number,number,number],
  white:     [255, 255, 255] as [number,number,number],
  text:      [30,  30,  30]  as [number,number,number],
  muted:     [100, 100, 100] as [number,number,number],
  border:    [190, 200, 220] as [number,number,number],
  stripe:    [247, 249, 255] as [number,number,number],
};

// 9 columns
const COL_WIDTHS = [8, 26, 20, 22, 22, 20, 16, 22, 22]; // mm, total ≈ 178mm + margins

async function buildPDF(
  firmName: string,
  dateLabel: string,
  parties: PartyGroup[],
  grandTotals: { billAmt: number; rcvdAmt: number; grAmt: number; outstanding: number; commAmt: number },
  generatedByLabel: string | null
) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });

  const headerBandH = generatedByLabel ? 24 : 20;
  /** Top margin for autoTable so body clears the navy header band */
  const tableTopMargin = headerBandH + 6;

  let startY = 0;

  // ── Per-page header ──────────────────────────────────────────────────────
  const drawPageHeader = () => {
    // Background band (taller when showing account line)
    doc.setFillColor(...C.navy);
    doc.rect(0, 0, pageW, headerBandH, "F");

    // Firm name
    doc.setTextColor(...C.grandText);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(firmName.toUpperCase(), pageW / 2, 8, { align: "center" });

    // Subtitle
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`Agent Commission on Receipt Report  |  ${dateLabel}`, pageW / 2, 14, { align: "center" });

    // Printed date + account (right)
    doc.setTextColor(180, 200, 240);
    doc.setFontSize(7.5);
    doc.text(`Printed: ${today}`, pageW - 10, 14, { align: "right" });
    if (generatedByLabel) {
      doc.setFontSize(6.8);
      doc.text(`Signed in: ${generatedByLabel}`, pageW - 10, 19, { align: "right" });
    }

    startY = headerBandH + 4;
  };

  drawPageHeader();

  // ── Column headers ────────────────────────────────────────────────────────
  const HEAD_COLS = [
    "Sr", "Invoice No", "Date", "Bill Amt", "Rcvd. Amt", "GR Amt", "Outstanding", "Comm %", "Comm Amt",
  ];

  const colStyles: Record<number, object> = {
    0: { halign: "center", cellWidth: COL_WIDTHS[0] },
    1: { halign: "left",   cellWidth: COL_WIDTHS[1] },
    2: { halign: "center", cellWidth: COL_WIDTHS[2] },
    3: { halign: "right",  cellWidth: COL_WIDTHS[3] },
    4: { halign: "right",  cellWidth: COL_WIDTHS[4] },
    5: { halign: "right",  cellWidth: COL_WIDTHS[5] },
    6: { halign: "right",  cellWidth: COL_WIDTHS[6] },
    7: { halign: "center", cellWidth: COL_WIDTHS[7] },
    8: { halign: "right",  cellWidth: COL_WIDTHS[8] },
  };

  let globalSr = 0;

  for (const party of parties) {
    // ── Party label row ───────────────────────────────────────────────────
    const partyRow = [
      {
        content: `Party:  ${party.partyName}`,
        colSpan: HEAD_COLS.length,
        styles: {
          fillColor: C.partyBg,
          textColor: C.partyText,
          fontStyle: "bold" as const,
          fontSize: 8.5,
          cellPadding: { top: 2.5, bottom: 2.5, left: 4, right: 4 },
        },
      },
    ];

    // ── Data rows ─────────────────────────────────────────────────────────
    const dataRows = party.rows.map((r, idx) => {
      globalSr++;
      const fill = idx % 2 === 0 ? C.white : C.stripe;
      const mkCell = (content: string, halign: "left"|"center"|"right") => ({
        content,
        styles: { halign, fillColor: fill, textColor: C.text },
      });
      return [
        { content: String(globalSr), styles: { halign: "center" as const, fillColor: fill, textColor: C.muted } },
        mkCell(r.invoiceNo, "left"),
        mkCell(r.date, "center"),
        mkCell(formatInrPdf(r.billAmt), "right"),
        mkCell(formatInrPdf(r.rcvdAmt), "right"),
        mkCell(r.grAmt > 0 ? formatInrPdf(r.grAmt) : "-", "right"),
        mkCell(formatInrPdf(r.outstanding), "right"),
        mkCell(`${r.commPct}%`, "center"),
        { content: formatInrPdf(r.commAmt), styles: { halign: "right" as const, fontStyle: "bold" as const, fillColor: fill, textColor: C.navyLight } },
      ];
    });

    // ── Party total row ───────────────────────────────────────────────────
    const mkTotal = (v: string) => ({
      content: v,
      styles: { halign: "right" as const, fontStyle: "bold" as const, fillColor: C.totalBg, textColor: C.partyText },
    });
    const partyTotalRow = [
      { content: "Party Total", colSpan: 3, styles: { halign: "right" as const, fontStyle: "bold" as const, fillColor: C.totalBg, textColor: C.partyText, fontSize: 8 } },
      mkTotal(formatInrPdf(party.totals.billAmt)),
      mkTotal(formatInrPdf(party.totals.rcvdAmt)),
      mkTotal(party.totals.grAmt > 0 ? formatInrPdf(party.totals.grAmt) : "-"),
      mkTotal(formatInrPdf(party.totals.outstanding)),
      { content: "", styles: { fillColor: C.totalBg } },
      mkTotal(formatInrPdf(party.totals.commAmt)),
    ];

    autoTable(doc, {
      startY,
      head: [HEAD_COLS],
      body: [partyRow, ...dataRows, partyTotalRow],
      theme: "plain",
      tableWidth: "wrap",
      columnStyles: colStyles,
      styles: {
        fontSize: 7.5,
        cellPadding: { top: 1.8, bottom: 1.8, left: 2, right: 2 },
        textColor: C.text,
        fillColor: C.white,
        lineColor: C.border,
        lineWidth: 0.15,
        font: "helvetica",
      },
      headStyles: {
        fillColor: C.navyLight,
        textColor: C.white,
        fontStyle: "bold",
        fontSize: 8,
        halign: "center",
        cellPadding: { top: 2.5, bottom: 2.5, left: 2, right: 2 },
        lineColor: C.navy,
        lineWidth: 0.2,
      },
      margin: { left: 10, right: 10, top: tableTopMargin },
      didDrawPage: () => {
        drawPageHeader();
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    startY = (doc as any).lastAutoTable.finalY + 5;
  }

  // ── Grand Total ────────────────────────────────────────────────────────────
  const mkGrand = (v: string) => ({
    content: v,
    styles: { halign: "right" as const, fontStyle: "bold" as const, fillColor: C.grandBg, textColor: C.grandText, fontSize: 9 },
  });

  autoTable(doc, {
    startY,
    body: [[
      { content: "GRAND TOTAL", colSpan: 3, styles: { halign: "right" as const, fontStyle: "bold" as const, fillColor: C.grandBg, textColor: C.grandText, fontSize: 9 } },
      mkGrand(formatInrPdf(grandTotals.billAmt)),
      mkGrand(formatInrPdf(grandTotals.rcvdAmt)),
      mkGrand(grandTotals.grAmt > 0 ? formatInrPdf(grandTotals.grAmt) : "-"),
      mkGrand(formatInrPdf(grandTotals.outstanding)),
      { content: "", styles: { fillColor: C.grandBg } },
      mkGrand(formatInrPdf(grandTotals.commAmt)),
    ]],
    theme: "plain",
    tableWidth: "wrap",
    columnStyles: colStyles,
    styles: { lineColor: C.navy, lineWidth: 0.3, fillColor: C.grandBg },
    margin: { left: 10, right: 10 },
  });

  // ── Page numbers ────────────────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C.muted);
    doc.text(`Page ${i} of ${pageCount}`, pageW / 2, pageH - 5, { align: "center" });
  }

  return doc;
}

// ── Component ─────────────────────────────────────────────────────────────────

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

const selectCls =
  "bg-zinc-900 text-zinc-200 rounded-lg border border-zinc-700/80 px-3 py-2.5 text-sm outline-none focus:border-violet-500/60 appearance-none cursor-pointer";

export function GenerateReportButton() {
  const [open, setOpen] = useState(false);

  const now = new Date();
  const [fromMonth, setFromMonth] = useState(now.getMonth());
  const [fromYear, setFromYear] = useState(now.getFullYear());
  const [toMonth, setToMonth] = useState(now.getMonth());
  const [toYear, setToYear] = useState(now.getFullYear());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Fetch profile for firm name
      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .single();

      const firmName: string =
        (profile as { username?: string } | null)?.username ??
        user.user_metadata?.["full_name"] ??
        user.email ??
        "Commission Report";

      // Build date range
      const fromDate = new Date(fromYear, fromMonth, 1).toISOString().slice(0, 10);
      const toDate = new Date(toYear, toMonth + 1, 0).toISOString().slice(0, 10);

      if (fromDate > toDate) {
        setError("'From' date must be before or equal to 'To' date.");
        setLoading(false);
        return;
      }

      // Fetch commissions with nested invoice + goods returns
      const { data: commissions, error: fetchErr } = await supabase
        .from("commissions")
        .select(`
          id,
          invoice_id,
          invoice_number,
          retailer_name,
          basic_amount,
          gst_amount,
          commission_percent,
          commission_amount,
          created_at,
          retailer_invoices (
            bill_date,
            total_amount,
            payment_received,
            outstanding_amount,
            invoice_goods_returns ( amount )
          )
        `)
        .order("retailer_name");

      if (fetchErr) throw new Error(fetchErr.message);

      // Filter by invoice bill_date in range
      const filtered = ((commissions ?? []) as unknown as CommissionWithInvoice[]).filter((c) => {
        const inv = Array.isArray(c.retailer_invoices) ? c.retailer_invoices[0] : c.retailer_invoices;
        const bd = inv?.bill_date;
        if (!bd) return false;
        return bd >= fromDate && bd <= toDate;
      });

      if (filtered.length === 0) {
        setError("No commission records found for the selected period.");
        setLoading(false);
        return;
      }

      // Group by retailer_name
      const partyMap = new Map<string, PartyGroup>();
      let srCounter = 0;

      for (const c of filtered) {
        const party = c.retailer_name || "Unknown";
        if (!partyMap.has(party)) {
          partyMap.set(party, {
            partyName: party,
            rows: [],
            totals: { billAmt: 0, rcvdAmt: 0, grAmt: 0, outstanding: 0, commAmt: 0 },
          });
        }
        const group = partyMap.get(party)!;

        const inv = Array.isArray(c.retailer_invoices) ? c.retailer_invoices[0] : c.retailer_invoices;
        const billAmt = toNum(inv?.total_amount);
        const rcvdAmt = toNum(inv?.payment_received);
        const outstanding = toNum(inv?.outstanding_amount);
        const grAmt = (inv?.invoice_goods_returns ?? []).reduce((s: number, r: { amount?: unknown }) => s + toNum(r.amount), 0);
        const commAmt = toNum(c.commission_amount);

        srCounter++;
        group.rows.push({
          sr: srCounter,
          invoiceNo: c.invoice_number,
          date: fmtDate(inv?.bill_date),
          billAmt,
          basicAmt: toNum(c.basic_amount),
          gstAmt: toNum(c.gst_amount),
          rcvdAmt,
          grAmt,
          outstanding,
          commPct: toNum(c.commission_percent),
          commAmt,
        });

        group.totals.billAmt += billAmt;
        group.totals.rcvdAmt += rcvdAmt;
        group.totals.grAmt += grAmt;
        group.totals.outstanding += outstanding;
        group.totals.commAmt += commAmt;
      }

      const parties = Array.from(partyMap.values());

      const grandTotals = parties.reduce(
        (acc, p) => ({
          billAmt: acc.billAmt + p.totals.billAmt,
          rcvdAmt: acc.rcvdAmt + p.totals.rcvdAmt,
          grAmt: acc.grAmt + p.totals.grAmt,
          outstanding: acc.outstanding + p.totals.outstanding,
          commAmt: acc.commAmt + p.totals.commAmt,
        }),
        { billAmt: 0, rcvdAmt: 0, grAmt: 0, outstanding: 0, commAmt: 0 }
      );

      const fromLabel = `01/${String(fromMonth + 1).padStart(2, "0")}/${String(fromYear).slice(-2)}`;
      const toLabel = `${String(new Date(toYear, toMonth + 1, 0).getDate()).padStart(2, "0")}/${String(toMonth + 1).padStart(2, "0")}/${String(toYear).slice(-2)}`;
      const dateLabel = `From ${fromLabel} To ${toLabel}`;

      const loginLabel =
        user.email?.trim() ||
        (typeof user.phone === "string" && user.phone.trim() ? user.phone.trim() : null) ||
        (profile as { username?: string } | null)?.username?.trim() ||
        null;

      const doc = await buildPDF(firmName, dateLabel, parties, grandTotals, loginLabel);

      const fileName = `Commission_Report_${MONTHS[fromMonth].slice(0, 3)}${fromYear}_to_${MONTHS[toMonth].slice(0, 3)}${toYear}.pdf`;
      doc.save(fileName);

      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate report");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => { setOpen(true); setError(null); }}
        title="Generate Commission Report"
        className="flex items-center gap-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-indigo-300 ring-1 ring-inset ring-indigo-500/10 transition hover:border-indigo-400/50 hover:bg-indigo-500/15 hover:text-indigo-200 active:scale-95"
      >
        <FileTextIcon className="h-3.5 w-3.5 shrink-0" />
        Report
      </button>

      {/* Modal backdrop */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => { if (!loading) setOpen(false); }}
          />

          {/* Modal card */}
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-zinc-700/80 bg-zinc-950 shadow-2xl ring-1 ring-white/[0.06]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-800/80 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/20">
                  <FileTextIcon className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white">Generate Commission Report</h2>
                  <p className="text-[11px] text-zinc-500">PDF with party-wise commission details</p>
                </div>
              </div>
              <button
                onClick={() => { if (!loading) setOpen(false); }}
                className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-200"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="space-y-5 p-5">
              <p className="text-xs text-zinc-500">
                Select the billing period. Only invoices with a bill date in this range will be included.
              </p>

              {/* From */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">From Month</label>
                <div className="grid grid-cols-2 gap-2.5">
                  <select
                    value={fromMonth}
                    onChange={(e) => setFromMonth(Number(e.target.value))}
                    className={selectCls}
                  >
                    {MONTHS.map((m, i) => (
                      <option key={m} value={i}>{m}</option>
                    ))}
                  </select>
                  <select
                    value={fromYear}
                    onChange={(e) => setFromYear(Number(e.target.value))}
                    className={selectCls}
                  >
                    {yearRange().map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* To */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">To Month</label>
                <div className="grid grid-cols-2 gap-2.5">
                  <select
                    value={toMonth}
                    onChange={(e) => setToMonth(Number(e.target.value))}
                    className={selectCls}
                  >
                    {MONTHS.map((m, i) => (
                      <option key={m} value={i}>{m}</option>
                    ))}
                  </select>
                  <select
                    value={toYear}
                    onChange={(e) => setToYear(Number(e.target.value))}
                    className={selectCls}
                  >
                    {yearRange().map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Error */}
              {error && (
                <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                  {error}
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-zinc-800/80 px-5 py-4">
              <button
                onClick={() => setOpen(false)}
                disabled={loading}
                className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-500 disabled:opacity-60 active:scale-95"
              >
                {loading ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round" />
                    </svg>
                    Generating…
                  </>
                ) : (
                  <>
                    <FileTextIcon className="h-4 w-4" />
                    Download PDF
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
