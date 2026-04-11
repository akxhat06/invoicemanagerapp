alter table public.companies
  add column if not exists telephone text,
  add column if not exists mop text;

comment on column public.companies.telephone is 'Landline / alternate phone';
comment on column public.companies.mop is 'Mode of payment (e.g. Bank transfer, UPI, Cash)';
