-- Run this in Supabase SQL Editor if migrations are not applied automatically.
-- Table: companies — one row per company per user.

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  gst_no text,
  phone_no text,
  bank_details text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists companies_user_id_idx on public.companies (user_id);

alter table public.companies enable row level security;

create policy "Users select own companies"
  on public.companies
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users insert own companies"
  on public.companies
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users update own companies"
  on public.companies
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users delete own companies"
  on public.companies
  for delete
  to authenticated
  using (auth.uid() = user_id);
