-- Allow login by username: resolve to email via SECURITY DEFINER (anon can execute).
-- Run in Supabase SQL Editor after profiles exist.

-- One username per account (case-insensitive), ignores empty usernames.
create unique index if not exists profiles_username_lower_unique
  on public.profiles ((lower(trim(username))))
  where username is not null and length(trim(username)) > 0;

create or replace function public.get_email_for_login(identifier text)
returns text
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  result text;
  trimmed text;
begin
  trimmed := trim(coalesce(identifier, ''));
  if trimmed = '' then
    return null;
  end if;
  if trimmed ~ '@' then
    return trimmed;
  end if;
  select p.email into result
  from public.profiles p
  where lower(trim(p.username)) = lower(trimmed)
  limit 1;
  return result;
end;
$$;

grant execute on function public.get_email_for_login(text) to anon;
grant execute on function public.get_email_for_login(text) to authenticated;
