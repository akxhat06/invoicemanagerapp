-- Structured bank fields (replaces free-text bank_details for new entries; bank_details kept for legacy rows).

alter table public.companies
  add column if not exists bank_account_holder text,
  add column if not exists bank_name text,
  add column if not exists bank_account_number text,
  add column if not exists bank_ifsc text,
  add column if not exists bank_branch text,
  add column if not exists bank_account_type text;

comment on column public.companies.bank_account_holder is 'Name on the bank account';
comment on column public.companies.bank_name is 'Bank / institution name';
comment on column public.companies.bank_account_number is 'Account number';
comment on column public.companies.bank_ifsc is 'IFSC code (India)';
comment on column public.companies.bank_branch is 'Branch name or address';
comment on column public.companies.bank_account_type is 'e.g. Current, Savings';
