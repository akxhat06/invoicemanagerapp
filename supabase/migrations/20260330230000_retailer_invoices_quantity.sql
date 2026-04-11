alter table public.retailer_invoices
  add column if not exists quantity integer not null default 1;

comment on column public.retailer_invoices.quantity is 'Number of units / quantity for this invoice line';

notify pgrst, 'reload schema';
