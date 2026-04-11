alter table public.retailer_invoices
  add column if not exists retailer_address text,
  add column if not exists contact_no text;
