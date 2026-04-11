import type { InvoicePaymentRow } from "@/types/invoice";

type Method = InvoicePaymentRow["method"];

/** Only the selected method’s reference fields are persisted; others are forced to null. */
export function paymentReferenceColumnsForMethod(
  method: Method | "",
  raw: { chequeNo: string; upiNo: string; upiRefNo: string; neftUtrNo: string }
): Pick<InvoicePaymentRow, "cheque_no" | "upi_no" | "upi_ref_no" | "neft_utr_no"> {
  const cheque = raw.chequeNo.trim() || null;
  const upi = raw.upiNo.trim() || null;
  const upiRef = raw.upiRefNo.trim() || null;
  const neft = raw.neftUtrNo.trim() || null;
  switch (method) {
    case "Cheque":
      return { cheque_no: cheque, upi_no: null, upi_ref_no: null, neft_utr_no: null };
    case "UPI":
      return { cheque_no: null, upi_no: upi, upi_ref_no: upiRef, neft_utr_no: null };
    case "NEFT":
      return { cheque_no: null, upi_no: null, upi_ref_no: null, neft_utr_no: neft };
    default:
      return { cheque_no: null, upi_no: null, upi_ref_no: null, neft_utr_no: null };
  }
}
