alter table public.retailer_invoices
  add column if not exists gst_amount numeric(14, 2) not null default 0;
