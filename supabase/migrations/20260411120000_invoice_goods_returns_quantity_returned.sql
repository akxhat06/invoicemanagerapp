-- Credit Note / goods return: quantity returned per invoice line context
alter table public.invoice_goods_returns
  add column if not exists quantity_returned integer not null default 1;

comment on column public.invoice_goods_returns.quantity_returned is 'Units returned; must not exceed invoice quantity.';
