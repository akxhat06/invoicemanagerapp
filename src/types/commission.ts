export type CommissionStatus = "pending" | "completed";

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
  /** Amount of commission actually received by the agent. */
  commission_paid?: number;
  /** pending: commission_paid < commission_amount; completed when paid in full. */
  status: CommissionStatus;
  created_at: string;
  updated_at: string;
};
