-- Drop the old invoice_commissions table (no production data yet).
drop table if exists public.invoice_commissions cascade;

-- Standalone commissions table.
-- Maps to a specific invoice via invoice_id (FK) and also stores
-- retailer_id + invoice_number directly so the commissions page can
-- display records without joining back to retailer_invoices.

create table if not exists public.commissions (
  id                 uuid           primary key default gen_random_uuid(),
  user_id            uuid           not null references auth.users (id) on delete cascade,
  retailer_id        uuid           not null references public.retailers (id) on delete restrict,
  invoice_id         uuid           not null references public.retailer_invoices (id) on delete restrict,
  invoice_number     text           not null,
  retailer_name      text           not null,
  basic_amount       numeric(14, 2) not null default 0,
  gst_amount         numeric(14, 2) not null default 0,
  commission_percent numeric(6, 2)  not null default 0,
  commission_amount  numeric(14, 2) not null default 0,
  created_at         timestamptz    not null default now(),
  updated_at         timestamptz    not null default now()
);

create index if not exists commissions_user_idx     on public.commissions (user_id);
create index if not exists commissions_retailer_idx on public.commissions (retailer_id);
create index if not exists commissions_invoice_idx  on public.commissions (invoice_id);

alter table public.commissions enable row level security;

create policy "Users select own commissions"
  on public.commissions for select to authenticated
  using (auth.uid() = user_id);

create policy "Users insert own commissions"
  on public.commissions for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users update own commissions"
  on public.commissions for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users delete own commissions"
  on public.commissions for delete to authenticated
  using (auth.uid() = user_id);
