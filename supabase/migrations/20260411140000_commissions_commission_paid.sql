-- Amount actually received by the agent; status is derived vs commission_amount in app.

alter table public.commissions
  add column if not exists commission_paid numeric(14, 2) not null default 0;

comment on column public.commissions.commission_paid is 'Commission amount received/paid to the agent.';

-- Rows previously marked completed (e.g. from bill paid) assume full commission was received.
update public.commissions
set commission_paid = commission_amount
where status = 'completed' and coalesce(commission_paid, 0) = 0;

-- Align status with paid vs due commission
update public.commissions
set status = case
  when coalesce(commission_amount, 0) > 0
       and coalesce(commission_paid, 0) + 0.005 >= coalesce(commission_amount, 0) then 'completed'
  else 'pending'
end;
