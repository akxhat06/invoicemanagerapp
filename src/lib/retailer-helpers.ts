/** Shared retailer formatting helpers for list + detail screens. */

export const PAN_PREFIX = "PAN:";

export function phoneDigitsFromStored(phone: string | null | undefined): string {
  if (!phone?.trim()) return "";
  const d = phone.replace(/\D/g, "");
  if (d.length >= 12 && d.startsWith("91")) return d.slice(2, 12);
  if (d.length === 10) return d;
  return d.slice(-10);
}

export function parseRetailerTaxId(raw: string | null | undefined): { type: "gst" | "pan"; value: string } {
  const v = (raw ?? "").trim().toUpperCase();
  if (!v) return { type: "gst", value: "" };
  if (v.startsWith(PAN_PREFIX)) {
    return { type: "pan", value: v.slice(PAN_PREFIX.length) };
  }
  return { type: "gst", value: v };
}
