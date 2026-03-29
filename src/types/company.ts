export type CompanyRow = {
  id: string;
  user_id: string;
  name: string;
  gst_no: string | null;
  phone_no: string | null;
  email: string | null;
  registered_address: string | null;
  city: string | null;
  state: string | null;
  pin_code: string | null;
  is_draft?: boolean;
  /** Legacy free-text; prefer structured bank_* columns */
  bank_details: string | null;
  bank_account_holder: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_ifsc: string | null;
  bank_branch: string | null;
  bank_account_type: string | null;
  created_at: string;
  updated_at: string;
};
