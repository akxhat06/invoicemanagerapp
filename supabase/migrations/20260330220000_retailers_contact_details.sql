alter table public.retailers
  add column if not exists contact_person_name text,
  add column if not exists telephone text,
  add column if not exists alternative_phone text;

comment on column public.retailers.contact_person_name is 'Primary contact person at the retailer';
comment on column public.retailers.telephone is 'Landline / office telephone (free text)';
comment on column public.retailers.contact_no is 'Primary mobile (+91 E.164 or legacy 10-digit)';
comment on column public.retailers.alternative_phone is 'Secondary mobile (+91), optional';
