-- Retailer invoices: bills linked to a company (seller) and stored per user.

create table if not exists public.retailer_invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete restrict,
  invoice_number text not null,
  bill_date date not null,
  basic_amount numeric(14, 2) not null default 0,
  gst_no text,
  invoice_amount numeric(14, 2) not null default 0,
  transportation_amount numeric(14, 2) not null default 0,
  cd_amount numeric(14, 2) not null default 0,
  total_amount numeric(14, 2) not null default 0,
  payment_received numeric(14, 2) not null default 0,
  outstanding_amount numeric(14, 2) not null default 0,
  is_draft boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint retailer_invoices_user_invoice_number_unique unique (user_id, invoice_number)
);

create index if not exists retailer_invoices_user_id_idx on public.retailer_invoices (user_id);
create index if not exists retailer_invoices_company_id_idx on public.retailer_invoices (company_id);
create index if not exists retailer_invoices_bill_date_idx on public.retailer_invoices (bill_date desc);

alter table public.retailer_invoices enable row level security;

create policy "Users select own retailer_invoices"
  on public.retailer_invoices
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users insert own retailer_invoices"
  on public.retailer_invoices
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users update own retailer_invoices"
  on public.retailer_invoices
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users delete own retailer_invoices"
  on public.retailer_invoices
  for delete
  to authenticated
  using (auth.uid() = user_id);
