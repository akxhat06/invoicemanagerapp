-- Retailer contact fields used by the app (retailers-screen, types/retailer.ts).
-- Run via `supabase db push` or SQL Editor, then refresh the API schema if needed.

alter table public.retailers
  add column if not exists contact_person_name text,
  add column if not exists telephone text,
  add column if not exists alternative_phone text;

comment on column public.retailers.contact_person_name is 'Display name of primary contact';
comment on column public.retailers.telephone is 'Landline or office number (free text)';
comment on column public.retailers.alternative_phone is 'Secondary mobile in E.164, e.g. +91XXXXXXXXXX';

-- Hint PostgREST to refresh its schema cache (Supabase).
notify pgrst, 'reload schema';
