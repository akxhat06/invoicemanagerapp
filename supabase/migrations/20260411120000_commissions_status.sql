-- Pending = bill not fully paid; completed = bill fully paid (outstanding cleared).
-- User can override in UI; existing rows backfilled from invoice outstanding.

alter table public.commissions
  add column if not exists status text not null default 'pending'
    constraint commissions_status_check check (status in ('pending', 'completed'));

comment on column public.commissions.status is 'pending: invoice has outstanding; completed: bill fully paid (or manual override).';

update public.commissions c
set status = case
  when coalesce(ri.outstanding_amount, 0) <= 0 then 'completed'
  else 'pending'
end
from public.retailer_invoices ri
where ri.id = c.invoice_id;
