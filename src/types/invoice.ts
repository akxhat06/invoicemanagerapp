export type RetailerInvoiceRow = {
  id: string;
  user_id: string;
  company_id: string;
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
