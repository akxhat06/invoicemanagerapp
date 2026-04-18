import type { CommissionStatus } from "@/types/commission";

export type { CommissionStatus } from "@/types/commission";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Completed when commission received >= commission due (full settlement). */
export function commissionStatusFromPaidAmounts(
  commissionAmount: number,
  commissionPaid: number
): CommissionStatus {
  const due = round2(Number(commissionAmount));
  const paid = round2(Number(commissionPaid));
  if (due <= 0) return "pending";
  return paid + 0.005 >= due ? "completed" : "pending";
}

export function parseCommissionStatus(v: unknown): CommissionStatus {
  return v === "completed" ? "completed" : "pending";
}
