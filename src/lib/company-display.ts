import type { CompanyRow } from "@/types/company";

export function hasStructuredBank(c: CompanyRow): boolean {
  return !!(
    c.bank_account_holder ||
    c.bank_name ||
    c.bank_account_number ||
    c.bank_ifsc ||
    c.bank_branch
  );
}

export type CompanyUiStatus = "active" | "pending";

/** Active when a GST number is present; otherwise pending (matches reference badges). */
export function companyUiStatus(c: CompanyRow): CompanyUiStatus {
  return c.gst_no?.trim() ? "active" : "pending";
}

export function gstDisplayLine(c: CompanyRow): string {
  if (c.gst_no?.trim()) return `GST: ${c.gst_no.trim()}`;
  return "GST: Verification pending";
}

/** Bank column: "BankName ••••1234" using last four digits when available. */
export function bankSummaryLine(c: CompanyRow): string {
  const name = c.bank_name?.trim();
  const digits = (c.bank_account_number ?? "").replace(/\D/g, "");
  const last4 = digits.length >= 4 ? digits.slice(-4) : digits;
  if (name && last4) return `${name} ••••${last4}`;
  if (name) return name;
  if (last4) return `••••${last4}`;
  if (c.bank_details?.trim()) return "On file";
  return "—";
}
