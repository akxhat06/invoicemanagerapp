export type BillingSummaryLine = {
  id: string;
  name: string;
  invoiceCount: number;
  totalBilled: number;
  totalPaid: number;
  totalOutstanding: number;
  totalBasic: number;
  totalGst: number;
  totalInvoiceAmount: number;
  totalTransport: number;
};

export type BillingGrandTotals = {
  invoiceCount: number;
  totalBilled: number;
  totalPaid: number;
  totalOutstanding: number;
  totalBasic: number;
  totalGst: number;
  totalInvoiceAmount: number;
  totalTransport: number;
};

export type BillingSummaryBundle = {
  byCompany: BillingSummaryLine[];
  byRetailer: BillingSummaryLine[];
  grand: BillingGrandTotals;
};

type InvoiceAggRow = {
  company_id: string;
  retailer_id: string | null;
  retailer_name: string | null;
  total_amount: number | string | null;
  payment_received: number | string | null;
  outstanding_amount: number | string | null;
  basic_amount?: number | string | null;
  gst_amount?: number | string | null;
  invoice_amount?: number | string | null;
  transportation_amount?: number | string | null;
  is_draft: boolean | null;
};

function num(v: number | string | null | undefined): number {
  const n = typeof v === "string" ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function emptyGrand(): BillingGrandTotals {
  return {
    invoiceCount: 0,
    totalBilled: 0,
    totalPaid: 0,
    totalOutstanding: 0,
    totalBasic: 0,
    totalGst: 0,
    totalInvoiceAmount: 0,
    totalTransport: 0,
  };
}

type Rollup = {
  invoiceCount: number;
  totalBilled: number;
  totalPaid: number;
  totalOutstanding: number;
  totalBasic: number;
  totalGst: number;
  totalInvoiceAmount: number;
  totalTransport: number;
};

function emptyRollup(): Rollup {
  return {
    invoiceCount: 0,
    totalBilled: 0,
    totalPaid: 0,
    totalOutstanding: 0,
    totalBasic: 0,
    totalGst: 0,
    totalInvoiceAmount: 0,
    totalTransport: 0,
  };
}

/**
 * Roll up non-draft retailer invoices by company and by retailer.
 */
export function aggregateBillingSummaries(
  invoices: InvoiceAggRow[] | null | undefined,
  companyIdToName: Map<string, string>
): BillingSummaryBundle {
  const rows = (invoices ?? []).filter((inv) => !inv.is_draft);

  const byCompany = new Map<string, Rollup>();
  const byRetailer = new Map<
    string,
    Rollup & {
      retailerId: string | null;
      retailerName: string;
    }
  >();

  for (const inv of rows) {
    const billed = num(inv.total_amount);
    const paid = num(inv.payment_received);
    const out = num(inv.outstanding_amount);
    const basic = num(inv.basic_amount);
    const gst = num(inv.gst_amount);
    const invAmt = num(inv.invoice_amount);
    const transport = num(inv.transportation_amount);

    const c = byCompany.get(inv.company_id) ?? emptyRollup();
    c.invoiceCount += 1;
    c.totalBilled += billed;
    c.totalPaid += paid;
    c.totalOutstanding += out;
    c.totalBasic += basic;
    c.totalGst += gst;
    c.totalInvoiceAmount += invAmt;
    c.totalTransport += transport;
    byCompany.set(inv.company_id, c);

    const rKey = inv.retailer_id ?? `name:${(inv.retailer_name ?? "").trim() || "—"}`;
    const r =
      byRetailer.get(rKey) ??
      ({
        ...emptyRollup(),
        retailerId: inv.retailer_id,
        retailerName: inv.retailer_name?.trim() || "Unknown retailer",
      } as Rollup & { retailerId: string | null; retailerName: string });
    r.invoiceCount += 1;
    r.totalBilled += billed;
    r.totalPaid += paid;
    r.totalOutstanding += out;
    r.totalBasic += basic;
    r.totalGst += gst;
    r.totalInvoiceAmount += invAmt;
    r.totalTransport += transport;
    if (!r.retailerName && inv.retailer_name?.trim()) {
      r.retailerName = inv.retailer_name.trim();
    }
    byRetailer.set(rKey, r);
  }

  const companyLines: BillingSummaryLine[] = [...byCompany.entries()]
    .map(([id, v]) => ({
      id,
      name: companyIdToName.get(id) ?? "Unknown company",
      invoiceCount: v.invoiceCount,
      totalBilled: v.totalBilled,
      totalPaid: v.totalPaid,
      totalOutstanding: v.totalOutstanding,
      totalBasic: v.totalBasic,
      totalGst: v.totalGst,
      totalInvoiceAmount: v.totalInvoiceAmount,
      totalTransport: v.totalTransport,
    }))
    .sort((a, b) => b.totalBilled - a.totalBilled);

  const retailerLines: BillingSummaryLine[] = [...byRetailer.entries()]
    .map(([id, v]) => ({
      id,
      name: v.retailerName,
      invoiceCount: v.invoiceCount,
      totalBilled: v.totalBilled,
      totalPaid: v.totalPaid,
      totalOutstanding: v.totalOutstanding,
      totalBasic: v.totalBasic,
      totalGst: v.totalGst,
      totalInvoiceAmount: v.totalInvoiceAmount,
      totalTransport: v.totalTransport,
    }))
    .sort((a, b) => b.totalBilled - a.totalBilled);

  const grand = rows.reduce((acc, inv) => {
    const basic = num(inv.basic_amount);
    const gst = num(inv.gst_amount);
    const invAmt = num(inv.invoice_amount);
    const transport = num(inv.transportation_amount);
    return {
      invoiceCount: acc.invoiceCount + 1,
      totalBilled: acc.totalBilled + num(inv.total_amount),
      totalPaid: acc.totalPaid + num(inv.payment_received),
      totalOutstanding: acc.totalOutstanding + num(inv.outstanding_amount),
      totalBasic: acc.totalBasic + basic,
      totalGst: acc.totalGst + gst,
      totalInvoiceAmount: acc.totalInvoiceAmount + invAmt,
      totalTransport: acc.totalTransport + transport,
    };
  }, emptyGrand());

  return { byCompany: companyLines, byRetailer: retailerLines, grand };
}

function emptyBillingLine(id: string, name: string): BillingSummaryLine {
  return {
    id,
    name,
    invoiceCount: 0,
    totalBilled: 0,
    totalPaid: 0,
    totalOutstanding: 0,
    totalBasic: 0,
    totalGst: 0,
    totalInvoiceAmount: 0,
    totalTransport: 0,
  };
}

/** All companies with billing rolled up (zeros when no invoices yet). */
export function mergeCompanyBillingRows(
  companies: { id: string; name: string }[],
  lines: BillingSummaryLine[]
): BillingSummaryLine[] {
  const byId = new Map(lines.map((l) => [l.id, l]));
  return companies
    .map((c) => {
      const line = byId.get(c.id);
      if (line) return { ...line, name: c.name };
      return emptyBillingLine(c.id, c.name);
    })
    .sort((a, b) => b.totalBilled - a.totalBilled || a.name.localeCompare(b.name));
}

/** All retailer profiles plus legacy invoice-only groupings (name:… keys). */
export function mergeRetailerBillingRows(
  retailers: { id: string; name: string }[],
  lines: BillingSummaryLine[]
): BillingSummaryLine[] {
  const byId = new Map<string, BillingSummaryLine>();
  const orphans: BillingSummaryLine[] = [];
  for (const l of lines) {
    if (l.id.startsWith("name:")) {
      orphans.push(l);
    } else {
      byId.set(l.id, l);
    }
  }
  const fromDb = retailers.map((r) => {
    const line = byId.get(r.id);
    if (line) return { ...line, name: r.name };
    return emptyBillingLine(r.id, r.name);
  });
  const usedIds = new Set(retailers.map((r) => r.id));
  const strayLines = [...byId.entries()]
    .filter(([id]) => !usedIds.has(id))
    .map(([, v]) => v);
  return [...fromDb, ...strayLines, ...orphans].sort(
    (a, b) => b.totalBilled - a.totalBilled || a.name.localeCompare(b.name)
  );
}
