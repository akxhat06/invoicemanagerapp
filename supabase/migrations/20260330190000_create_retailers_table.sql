-- Standalone retailers (created first); invoices reference them.

create table if not exists public.retailers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  address text,
  contact_no text,
  gst_no text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists retailers_user_id_idx on public.retailers (user_id);
create index if not exists retailers_user_name_idx on public.retailers (user_id, name);

alter table public.retailer_invoices
  add column if not exists retailer_id uuid references public.retailers (id) on delete restrict;

create index if not exists retailer_invoices_retailer_id_idx on public.retailer_invoices (retailer_id);

alter table public.retailers enable row level security;

create policy "Users select own retailers"
  on public.retailers
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users insert own retailers"
  on public.retailers
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users update own retailers"
  on public.retailers
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users delete own retailers"
  on public.retailers
  for delete
  to authenticated
  using (auth.uid() = user_id);
