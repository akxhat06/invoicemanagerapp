export const databaseSchema = `
## Database Schema

### Tables

**retailers**
- id (uuid, PK)
- user_id (uuid, FK)
- company_id (uuid, FK)
- name (text)
- address (text)
- contact_no (text)
- gst_no (text, nullable)
- state (text)
- created_at, updated_at (timestamptz)

**retailer_invoices** (the main invoices/bills table)
- id (uuid, PK)
- user_id (uuid, FK)
- company_id (uuid, FK)
- retailer_id (uuid, FK, nullable)
- retailer_name (text, nullable)
- retailer_address (text, nullable)
- contact_no (text, nullable)
- invoice_number (text)
- bill_date (date)
- quantity (integer, default 1)
- basic_amount (numeric)
- gst_no (text, nullable)
- gst_amount (numeric)
- invoice_amount (numeric)
- transportation_amount (numeric)
- cd_amount (numeric)
- total_amount (numeric)
- payment_received (numeric)
- outstanding_amount (numeric)
- is_draft (boolean)
- created_at, updated_at (timestamptz)

**invoice_payments**
- id (uuid, PK)
- user_id (uuid, FK)
- invoice_id (uuid, FK)
- payment_date (date)
- method (enum: Cheque, UPI, NEFT, Cash, Other)
- amount (numeric)
- cheque_no (text, nullable)
- upi_no (text, nullable)
- upi_ref_no (text, nullable)
- neft_utr_no (text, nullable)
- note (text, nullable)
- created_at, updated_at (timestamptz)

**invoice_goods_returns**
- id (uuid, PK)
- user_id (uuid, FK)
- invoice_id (uuid, FK)
- return_date (date)
- amount (numeric)
- quantity_returned (integer, nullable)
- note (text, nullable)
- created_at, updated_at (timestamptz)

**invoice_transports**
- id (uuid, PK)
- user_id (uuid, FK)
- invoice_id (uuid, FK)
- transport_name (text)
- lr_no (text, nullable)
- lr_date (date, nullable)
- amount (numeric)
- created_at, updated_at (timestamptz)

**commissions** (commission records per invoice)
- id (uuid, PK)
- user_id (uuid, FK)
- retailer_id (uuid, FK)
- invoice_id (uuid, FK)
- invoice_number (text)
- retailer_name (text)
- basic_amount (numeric)
- gst_amount (numeric)
- commission_percent (numeric)
- commission_amount (numeric)
- commission_paid (numeric) — amount received by the agent
- status (text: pending | completed) — completed when commission_paid >= commission_amount
- created_at, updated_at (timestamptz)

**companies**
- id (uuid, PK)
- user_id (uuid, FK)
- name (text)
- gst_no (text, nullable)
- address (text, nullable)
- state (text, nullable)
- created_at, updated_at (timestamptz)

**profiles**
- id (uuid, PK)
- email (text)
- full_name (text, nullable)
- firm_name (text, nullable)
- phone (text, nullable)
- created_at, updated_at (timestamptz)

### Key Relationships
- retailer_invoices (bills) belong to users and companies
- invoice_payments, invoice_goods_returns, invoice_transports, commissions link to retailer_invoices
- retailers belong to users and companies
`;

export function buildSchemaContext(userId: string) {
  return databaseSchema;
}