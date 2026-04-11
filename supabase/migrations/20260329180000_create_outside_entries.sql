-- Outside entries: countable records per user (e.g. outside sales / visits). Add rows via your app when ready.

create table if not exists public.outside_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists outside_entries_user_id_idx on public.outside_entries (user_id);

alter table public.outside_entries enable row level security;

create policy "Users select own outside_entries"
  on public.outside_entries for select to authenticated
  using (auth.uid() = user_id);

create policy "Users insert own outside_entries"
  on public.outside_entries for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users update own outside_entries"
  on public.outside_entries for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users delete own outside_entries"
  on public.outside_entries for delete to authenticated
  using (auth.uid() = user_id);
