-- Additional invoice flow modules:
-- transport, goods return, payments, commission.

create table if not exists public.invoice_transports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  invoice_id uuid not null references public.retailer_invoices (id) on delete cascade,
  transport_name text not null,
  lr_no text,
  lr_date date,
  amount numeric(14, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.invoice_goods_returns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  invoice_id uuid not null references public.retailer_invoices (id) on delete cascade,
  return_date date not null default current_date,
  amount numeric(14, 2) not null default 0,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.invoice_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  invoice_id uuid not null references public.retailer_invoices (id) on delete cascade,
  payment_date date not null default current_date,
  method text not null check (method in ('Cheque', 'UPI', 'NEFT', 'Cash', 'Other')),
  amount numeric(14, 2) not null default 0,
  cheque_no text,
  upi_no text,
  upi_ref_no text,
  neft_utr_no text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.invoice_commissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  invoice_id uuid not null references public.retailer_invoices (id) on delete cascade,
  total_amount numeric(14, 2) not null default 0,
  total_payment numeric(14, 2) not null default 0,
  gst_amount numeric(14, 2) not null default 0,
  tsp_amount numeric(14, 2) not null default 0,
  net_amount numeric(14, 2) not null default 0,
  commission_percent numeric(6, 2) not null default 0,
  commission_amount numeric(14, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists invoice_transports_user_idx on public.invoice_transports (user_id);
create index if not exists invoice_transports_invoice_idx on public.invoice_transports (invoice_id);
create index if not exists invoice_goods_returns_user_idx on public.invoice_goods_returns (user_id);
create index if not exists invoice_goods_returns_invoice_idx on public.invoice_goods_returns (invoice_id);
create index if not exists invoice_payments_user_idx on public.invoice_payments (user_id);
create index if not exists invoice_payments_invoice_idx on public.invoice_payments (invoice_id);
create index if not exists invoice_commissions_user_idx on public.invoice_commissions (user_id);
create index if not exists invoice_commissions_invoice_idx on public.invoice_commissions (invoice_id);

alter table public.invoice_transports enable row level security;
alter table public.invoice_goods_returns enable row level security;
alter table public.invoice_payments enable row level security;
alter table public.invoice_commissions enable row level security;

create policy "Users select own invoice_transports"
  on public.invoice_transports for select to authenticated
  using (auth.uid() = user_id);
create policy "Users insert own invoice_transports"
  on public.invoice_transports for insert to authenticated
  with check (auth.uid() = user_id);
create policy "Users update own invoice_transports"
  on public.invoice_transports for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users delete own invoice_transports"
  on public.invoice_transports for delete to authenticated
  using (auth.uid() = user_id);

create policy "Users select own invoice_goods_returns"
  on public.invoice_goods_returns for select to authenticated
  using (auth.uid() = user_id);
create policy "Users insert own invoice_goods_returns"
  on public.invoice_goods_returns for insert to authenticated
  with check (auth.uid() = user_id);
create policy "Users update own invoice_goods_returns"
  on public.invoice_goods_returns for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users delete own invoice_goods_returns"
  on public.invoice_goods_returns for delete to authenticated
  using (auth.uid() = user_id);

create policy "Users select own invoice_payments"
  on public.invoice_payments for select to authenticated
  using (auth.uid() = user_id);
create policy "Users insert own invoice_payments"
  on public.invoice_payments for insert to authenticated
  with check (auth.uid() = user_id);
create policy "Users update own invoice_payments"
  on public.invoice_payments for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users delete own invoice_payments"
  on public.invoice_payments for delete to authenticated
  using (auth.uid() = user_id);

create policy "Users select own invoice_commissions"
  on public.invoice_commissions for select to authenticated
  using (auth.uid() = user_id);
create policy "Users insert own invoice_commissions"
  on public.invoice_commissions for insert to authenticated
  with check (auth.uid() = user_id);
create policy "Users update own invoice_commissions"
  on public.invoice_commissions for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users delete own invoice_commissions"
  on public.invoice_commissions for delete to authenticated
  using (auth.uid() = user_id);
