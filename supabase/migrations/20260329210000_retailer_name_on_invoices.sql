-- Add retailer name field to retailer_invoices.

alter table public.retailer_invoices
  add column if not exists retailer_name text;

comment on column public.retailer_invoices.retailer_name is
  'Retailer/customer name for this invoice.';
