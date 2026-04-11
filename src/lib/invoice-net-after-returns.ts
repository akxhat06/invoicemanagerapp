/**
 * Goods returns (credit notes) reduce how much of an invoice is still “in play” for display.
 * Source: `invoice_goods_returns.amount` summed per `invoice_id`.
 */

export function sumGoodsReturnAmountsByInvoiceId(
  rows: { invoice_id: string; amount?: number | string | null }[]
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) {
    const id = r.invoice_id;
    if (!id) continue;
    const raw = r.amount;
    const n = raw === null || raw === undefined ? 0 : typeof raw === "string" ? parseFloat(raw) : Number(raw);
    if (!Number.isFinite(n) || n <= 0) continue;
    out[id] = (out[id] ?? 0) + n;
  }
  return out;
}

export function netInvoiceTotalAfterReturns(grossTotal: number, returnsSum: number): number {
  const g = Number.isFinite(grossTotal) ? grossTotal : 0;
  const r = Number.isFinite(returnsSum) ? returnsSum : 0;
  return Math.max(0, Math.round((g - r) * 100) / 100);
}
