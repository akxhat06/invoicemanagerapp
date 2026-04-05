export type BillingSummaryLine = {
  id: string;
  name: string;
  invoiceCount: number;
  totalBilled: number;
  totalPaid: number;
  totalOutstanding: number;
};

export type BillingGrandTotals = {
  invoiceCount: number;
  totalBilled: number;
  totalPaid: number;
  totalOutstanding: number;
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
  is_draft: boolean | null;
};

function num(v: number | string | null | undefined): number {
  const n = typeof v === "string" ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function emptyGrand(): BillingGrandTotals {
  return { invoiceCount: 0, totalBilled: 0, totalPaid: 0, totalOutstanding: 0 };
}

/**
 * Roll up non-draft retailer invoices by company and by retailer.
 */
export function aggregateBillingSummaries(
  invoices: InvoiceAggRow[] | null | undefined,
  companyIdToName: Map<string, string>
): BillingSummaryBundle {
  const rows = (invoices ?? []).filter((inv) => !inv.is_draft);

  const byCompany = new Map<
    string,
    { invoiceCount: number; totalBilled: number; totalPaid: number; totalOutstanding: number }
  >();
  const byRetailer = new Map<
    string,
    {
      retailerId: string | null;
      retailerName: string;
      invoiceCount: number;
      totalBilled: number;
      totalPaid: number;
      totalOutstanding: number;
    }
  >();

  for (const inv of rows) {
    const billed = num(inv.total_amount);
    const paid = num(inv.payment_received);
    const out = num(inv.outstanding_amount);

    const c = byCompany.get(inv.company_id) ?? {
      invoiceCount: 0,
      totalBilled: 0,
      totalPaid: 0,
      totalOutstanding: 0,
    };
    c.invoiceCount += 1;
    c.totalBilled += billed;
    c.totalPaid += paid;
    c.totalOutstanding += out;
    byCompany.set(inv.company_id, c);

    const rKey = inv.retailer_id ?? `name:${(inv.retailer_name ?? "").trim() || "—"}`;
    const r = byRetailer.get(rKey) ?? {
      retailerId: inv.retailer_id,
      retailerName: inv.retailer_name?.trim() || "Unknown retailer",
      invoiceCount: 0,
      totalBilled: 0,
      totalPaid: 0,
      totalOutstanding: 0,
    };
    r.invoiceCount += 1;
    r.totalBilled += billed;
    r.totalPaid += paid;
    r.totalOutstanding += out;
    if (!r.retailerName && inv.retailer_name?.trim()) {
      r.retailerName = inv.retailer_name.trim();
    }
    byRetailer.set(rKey, r);
  }

  const companyLines: BillingSummaryLine[] = [...byCompany.entries()]
    .map(([id, v]) => ({
      id,
      name: companyIdToName.get(id) ?? "Unknown company",
      ...v,
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
    }))
    .sort((a, b) => b.totalBilled - a.totalBilled);

  const grand = rows.reduce(
    (acc, inv) => ({
      invoiceCount: acc.invoiceCount + 1,
      totalBilled: acc.totalBilled + num(inv.total_amount),
      totalPaid: acc.totalPaid + num(inv.payment_received),
      totalOutstanding: acc.totalOutstanding + num(inv.outstanding_amount),
    }),
    emptyGrand()
  );

  return { byCompany: companyLines, byRetailer: retailerLines, grand };
}
