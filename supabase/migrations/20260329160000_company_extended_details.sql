alter table public.companies
  add column if not exists email text,
  add column if not exists registered_address text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists pin_code text,
  add column if not exists is_draft boolean not null default false;

comment on column public.companies.is_draft is 'When true, company record is incomplete / saved from Add flow draft';
