alter table public.companies
  add column if not exists alternative_phone text;

comment on column public.companies.telephone is 'Landline / office telephone (free text)';
comment on column public.companies.alternative_phone is 'Secondary mobile in E.164 (+91…), optional';
