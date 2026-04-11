-- Catch-up migration for environments that missed earlier retailer invoice updates.
-- Safe to run multiple times.

alter table public.retailer_invoices
  add column if not exists retailer_id uuid references public.retailers (id) on delete restrict,
  add column if not exists retailer_name text,
  add column if not exists retailer_address text,
  add column if not exists contact_no text,
  add column if not exists gst_amount numeric(14, 2) not null default 0;

create index if not exists retailer_invoices_retailer_id_idx on public.retailer_invoices (retailer_id);
