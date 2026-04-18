import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

/** One retailer block: invoice lines + optional payments / credit notes tables */
export type CommissionReportRetailerSection = {
  retailerName: string;
  rows: {
    sr: number;
    invoiceNo: string;
    date: string;
    billAmt: number;
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
  payments: { date: string; mode: string; amount: number; reference: string }[];
  creditNotes: { cnNo: string; date: string; amount: number; reason: string }[];
};

/** One company section (one header + box + retailers + company grand total) */
export type CommissionReportCompanySection = {
  companyId: string;
  companyName: string;
  gstNo: string | null;
  /** e.g. "01/04/26 – 30/04/26" */
  periodLabel: string;
  retailers: CommissionReportRetailerSection[];
};

const C = {
  navy: [15, 40, 80] as [number, number, number],
  navyLight: [30, 60, 120] as [number, number, number],
  retailerBar: [210, 230, 255] as [number, number, number],
  partyText: [15, 40, 80] as [number, number, number],
  totalBg: [215, 228, 250] as [number, number, number],
  grandBg: [15, 40, 80] as [number, number, number],
  grandText: [255, 255, 255] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  text: [30, 30, 30] as [number, number, number],
  muted: [100, 100, 100] as [number, number, number],
  border: [190, 200, 220] as [number, number, number],
  stripe: [247, 249, 255] as [number, number, number],
  creditHeader: [100, 60, 130] as [number, number, number],
  creditStripe: [252, 245, 255] as [number, number, number],
  teal: [13, 148, 136] as [number, number, number],
};

/** Relative weights for 9 invoice columns (used to split full usable width). */
const COL_INV_WEIGHTS = [8, 26, 20, 22, 22, 20, 16, 22, 22];

const HALIGN_INV: ("center" | "left" | "right")[] = [
  "center",
  "left",
  "center",
  "right",
  "right",
  "right",
  "right",
  "center",
  "right",
];

const PAGE_MARGIN_MM = 10;

/** Usable width between left/right margins (matches company box / footer bars). */
function contentWidthMm(pageW: number) {
  return pageW - 2 * PAGE_MARGIN_MM;
}

function invoiceColumnStyles(pageW: number): Record<number, object> {
  const inner = contentWidthMm(pageW);
  const sum = COL_INV_WEIGHTS.reduce((a, b) => a + b, 0);
  const out: Record<number, object> = {};
  for (let i = 0; i < COL_INV_WEIGHTS.length; i++) {
    out[i] = {
      halign: HALIGN_INV[i],
      cellWidth: (COL_INV_WEIGHTS[i]! / sum) * inner,
    };
  }
  return out;
}

function scaledColumnStyles(
  pageW: number,
  weights: number[],
  haligns: ("center" | "left" | "right")[]
): Record<number, object> {
  const inner = contentWidthMm(pageW);
  const sum = weights.reduce((a, b) => a + b, 0);
  const out: Record<number, object> = {};
  for (let i = 0; i < weights.length; i++) {
    out[i] = {
      halign: haligns[i] ?? "left",
      cellWidth: (weights[i]! / sum) * inner,
    };
  }
  return out;
}

function formatInrPdf(n: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(Number.isFinite(n) ? n : 0);
}

function lastTableY(doc: jsPDF): number {
  const d = doc as unknown as { lastAutoTable?: { finalY: number } };
  return d.lastAutoTable?.finalY ?? 40;
}

export function buildCommissionReportPdf(
  sections: CommissionReportCompanySection[],
  opts: {
    printedLabel: string;
    signedInLabel: string | null;
  }
): jsPDF {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  const headerBandH = opts.signedInLabel ? 24 : 20;
  const tableTopMargin = headerBandH + 6;

  let headerCompanyName = "";
  let headerPeriodLabel = "";

  const drawPageHeader = () => {
    doc.setFillColor(...C.navy);
    doc.rect(0, 0, pageW, headerBandH, "F");
    doc.setTextColor(...C.grandText);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(headerCompanyName.toUpperCase(), pageW / 2, 7.5, { align: "center" });
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.text(`Agent Commission on Receipt Report  |  Period: ${headerPeriodLabel}`, pageW / 2, 13, { align: "center" });
    doc.setTextColor(180, 200, 240);
    doc.setFontSize(7);
    doc.text(`Printed: ${opts.printedLabel}`, pageW - 10, 13, { align: "right" });
    if (opts.signedInLabel) {
      doc.setFontSize(6.5);
      doc.text(`Signed in: ${opts.signedInLabel}`, pageW - 10, 18.5, { align: "right" });
    }
  };

  const HEAD_INV = [
    "Sr",
    "Invoice No",
    "Date",
    "Bill Amt",
    "Rcvd. Amt",
    "GR Amt",
    "Outstanding",
    "Comm %",
    "Comm Amt",
  ];

  sections.forEach((section, sectionIndex) => {
    if (sectionIndex > 0) {
      doc.addPage();
    }

    headerCompanyName = section.companyName;
    headerPeriodLabel = section.periodLabel;

    drawPageHeader();

    const boxTop = headerBandH + 4;
    const boxH = 14;
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.3);
    doc.rect(PAGE_MARGIN_MM, boxTop, contentWidthMm(pageW), boxH);
    doc.setTextColor(...C.text);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(section.companyName, 14, boxTop + 5.5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    const gstPart = section.gstNo?.trim() ? `GSTIN: ${section.gstNo.trim()}` : "GSTIN: —";
    doc.text(`${gstPart}  |  Period: ${section.periodLabel}`, 14, boxTop + 10.5);

    let startY = boxTop + boxH + 6;

    let sectionCommissionTotal = 0;

    for (const party of section.retailers) {
      sectionCommissionTotal += party.totals.commAmt;

      const retailerRow = [
        {
          content: `Retailer:  ${party.retailerName}`,
          colSpan: HEAD_INV.length,
          styles: {
            fillColor: C.retailerBar,
            textColor: C.partyText,
            fontStyle: "bold" as const,
            fontSize: 8.5,
            cellPadding: { top: 2.5, bottom: 2.5, left: 4, right: 4 },
          },
        },
      ];

      const dataRows = party.rows.map((r, idx) => {
        const fill = idx % 2 === 0 ? C.white : C.stripe;
        const mk = (content: string, halign: "left" | "center" | "right") => ({
          content,
          styles: { halign, fillColor: fill, textColor: C.text },
        });
        return [
          { content: String(r.sr), styles: { halign: "center" as const, fillColor: fill, textColor: C.muted } },
          mk(r.invoiceNo, "left"),
          mk(r.date, "center"),
          mk(formatInrPdf(r.billAmt), "right"),
          mk(formatInrPdf(r.rcvdAmt), "right"),
          mk(r.grAmt > 0 ? formatInrPdf(r.grAmt) : "-", "right"),
          mk(formatInrPdf(r.outstanding), "right"),
          mk(`${r.commPct}%`, "center"),
          {
            content: formatInrPdf(r.commAmt),
            styles: {
              halign: "right" as const,
              fontStyle: "bold" as const,
              fillColor: fill,
              textColor: C.navyLight,
            },
          },
        ];
      });

      const mkTotal = (v: string) => ({
        content: v,
        styles: {
          halign: "right" as const,
          fontStyle: "bold" as const,
          fillColor: C.totalBg,
          textColor: C.partyText,
        },
      });
      const partyTotalRow = [
        {
          content: "Sub Total",
          colSpan: 3,
          styles: {
            halign: "right" as const,
            fontStyle: "bold" as const,
            fillColor: C.totalBg,
            textColor: C.partyText,
            fontSize: 8,
          },
        },
        mkTotal(formatInrPdf(party.totals.billAmt)),
        mkTotal(formatInrPdf(party.totals.rcvdAmt)),
        mkTotal(party.totals.grAmt > 0 ? formatInrPdf(party.totals.grAmt) : "-"),
        mkTotal(formatInrPdf(party.totals.outstanding)),
        { content: "", styles: { fillColor: C.totalBg } },
        mkTotal(formatInrPdf(party.totals.commAmt)),
      ];

      autoTable(doc, {
        startY,
        head: [HEAD_INV],
        body: [retailerRow, ...dataRows, partyTotalRow],
        theme: "plain",
        tableWidth: contentWidthMm(pageW),
        columnStyles: invoiceColumnStyles(pageW),
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
        margin: { left: PAGE_MARGIN_MM, right: PAGE_MARGIN_MM, top: tableTopMargin },
        didDrawPage: () => {
          drawPageHeader();
        },
      });

      startY = lastTableY(doc) + 4;

      if (party.payments.length > 0) {
        const payColStyles = scaledColumnStyles(
          pageW,
          [22, 22, 26, 48],
          ["center", "left", "right", "left"]
        );
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...C.text);
        doc.text("Payments Received", PAGE_MARGIN_MM + 2, startY);
        startY += 4;

        const payBody = party.payments.map((p) => [
          p.date,
          p.mode,
          formatInrPdf(p.amount),
          p.reference.length > 42 ? `${p.reference.slice(0, 40)}…` : p.reference,
        ]);

        autoTable(doc, {
          startY,
          head: [["Date", "Mode", "Amount", "Reference"]],
          body: payBody,
          theme: "plain",
          tableWidth: contentWidthMm(pageW),
          headStyles: {
            fillColor: C.navyLight,
            textColor: C.white,
            fontStyle: "bold",
            fontSize: 7.5,
          },
          styles: { fontSize: 7.5, lineColor: C.border, lineWidth: 0.12 },
          columnStyles: payColStyles,
          margin: { left: PAGE_MARGIN_MM, right: PAGE_MARGIN_MM, top: tableTopMargin },
          didDrawPage: () => drawPageHeader(),
        });
        startY = lastTableY(doc) + 4;
      }

      if (party.creditNotes.length > 0) {
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...C.creditHeader);
        doc.text("Credit Notes", PAGE_MARGIN_MM + 2, startY);
        startY += 4;

        const cnBody = party.creditNotes.map((c) => [
          c.cnNo,
          c.date,
          formatInrPdf(c.amount),
          c.reason.length > 48 ? `${c.reason.slice(0, 46)}…` : c.reason,
        ]);

        autoTable(doc, {
          startY,
          head: [["CN No", "Date", "Amount", "Reason"]],
          body: cnBody,
          theme: "plain",
          tableWidth: contentWidthMm(pageW),
          headStyles: {
            fillColor: C.creditHeader,
            textColor: C.white,
            fontStyle: "bold",
            fontSize: 7.5,
          },
          styles: {
            fontSize: 7.5,
            lineColor: C.border,
            lineWidth: 0.12,
            fillColor: C.creditStripe,
            textColor: C.text,
          },
          alternateRowStyles: { fillColor: C.white },
          columnStyles: scaledColumnStyles(pageW, [26, 20, 22, 48], ["left", "center", "right", "left"]),
          margin: { left: PAGE_MARGIN_MM, right: PAGE_MARGIN_MM, top: tableTopMargin },
          didDrawPage: () => drawPageHeader(),
        });
        startY = lastTableY(doc) + 6;
      }
    }

    if (startY > pageH - 28) {
      doc.addPage();
      drawPageHeader();
      startY = tableTopMargin + 8;
    }

    const barY = startY;
    doc.setFillColor(...C.grandBg);
    doc.rect(PAGE_MARGIN_MM, barY, contentWidthMm(pageW), 12, "F");
    doc.setTextColor(...C.grandText);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("COMPANY GRAND TOTAL", 14, barY + 7.5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Total Commission Payable:", pageW - 95, barY + 5.5);
    const amtW = 42;
    const amtX = pageW - 14 - amtW;
    doc.setFillColor(...C.teal);
    doc.rect(amtX, barY + 2.2, amtW, 7.6, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...C.white);
    doc.text(`Rs. ${formatInrPdf(sectionCommissionTotal)}`, amtX + amtW / 2, barY + 7.2, { align: "center" });
  });

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
