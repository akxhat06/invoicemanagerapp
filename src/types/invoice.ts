export type RetailerInvoiceRow = {
  id: string;
  user_id: string;
  company_id: string;
  retailer_name: string | null;
  invoice_number: string;
  bill_date: string;
  basic_amount: number;
  gst_no: string | null;
  invoice_amount: number;
  transportation_amount: number;
  cd_amount: number;
  total_amount: number;
  payment_received: number;
  outstanding_amount: number;
  is_draft: boolean;
  created_at: string;
  updated_at: string;
};

export type RetailerInvoiceWithCompany = RetailerInvoiceRow & {
  company?: { name: string; gst_no: string | null } | null;
};

export type InvoiceTransportRow = {
  id: string;
  user_id: string;
  invoice_id: string;
  transport_name: string;
  lr_no: string | null;
  lr_date: string | null;
  amount: number;
  created_at: string;
  updated_at: string;
};

export type InvoiceGoodsReturnRow = {
  id: string;
  user_id: string;
  invoice_id: string;
  return_date: string;
  amount: number;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type InvoicePaymentRow = {
  id: string;
  user_id: string;
  invoice_id: string;
  payment_date: string;
  method: "Cheque" | "UPI" | "NEFT" | "Cash" | "Other";
  amount: number;
  cheque_no: string | null;
  upi_no: string | null;
  upi_ref_no: string | null;
  neft_utr_no: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type InvoiceCommissionRow = {
  id: string;
  user_id: string;
  invoice_id: string;
  total_amount: number;
  total_payment: number;
  gst_amount: number;
  tsp_amount: number;
  net_amount: number;
  commission_percent: number;
  commission_amount: number;
  created_at: string;
  updated_at: string;
};
