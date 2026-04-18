export type CommissionRow = {
  id: string;
  user_id: string;
  retailer_id: string;
  invoice_id: string;
  invoice_number: string;
  retailer_name: string;
  basic_amount: number;
  gst_amount: number;
  commission_percent: number;
  commission_amount: number;
  created_at: string;
  updated_at: string;
};
