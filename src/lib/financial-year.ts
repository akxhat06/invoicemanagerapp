/**
 * Indian financial year: 1 Apr (startYear) → 31 Mar (startYear + 1).
 * Example: FY 2024-25 is 2024-04-01 through 2025-03-31.
 */

export function getIndianFYStartYearForDate(d: Date): number {
  const y = d.getFullYear();
  const m = d.getMonth();
  if (m >= 3) return y;
  return y - 1;
}

export function getCurrentIndianFYStartYear(): number {
  return getIndianFYStartYearForDate(new Date());
}

/** ISO date string YYYY-MM-DD → FY start year (April–March). */
export function fyStartYearFromBillDate(isoDate: string): number {
  const d = new Date(`${isoDate.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return getCurrentIndianFYStartYear();
  return getIndianFYStartYearForDate(d);
}

export function indianFYRangeISO(startYear: number): { start: string; end: string } {
  const start = `${startYear}-04-01`;
  const end = `${startYear + 1}-03-31`;
  return { start, end };
}

export function formatIndianFYLabel(startYear: number): string {
  const endYY = String(startYear + 1).slice(-2);
  return `${startYear}-${endYY}`;
}

export function parseFYQueryParam(raw: string | string[] | undefined): number | null {
  if (raw == null) return null;
  const s = Array.isArray(raw) ? raw[0] : raw;
  if (!s || !/^\d{4}$/.test(s)) return null;
  const y = parseInt(s, 10);
  if (y < 2000 || y > 2100) return null;
  return y;
}

export function billDateInIndianFY(isoDate: string | null | undefined, fyStartYear: number): boolean {
  if (!isoDate) return false;
  const day = isoDate.slice(0, 10);
  const { start, end } = indianFYRangeISO(fyStartYear);
  return day >= start && day <= end;
}

export function buildFYOptionList(invoiceBillDates: (string | null | undefined)[], extraYears = 5): number[] {
  const years = new Set<number>();
  for (const bd of invoiceBillDates) {
    if (bd) years.add(fyStartYearFromBillDate(bd));
  }
  const current = getCurrentIndianFYStartYear();
  years.add(current);
  for (let i = 1; i <= extraYears; i++) {
    years.add(current - i);
  }
  return [...years].sort((a, b) => b - a);
}
