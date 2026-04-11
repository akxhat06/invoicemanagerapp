-- Profile avatar URL for user-uploaded images.

alter table public.profiles
  add column if not exists avatar_url text;

comment on column public.profiles.avatar_url is
  'Public URL to the user avatar image.';
