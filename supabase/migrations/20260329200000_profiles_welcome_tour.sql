-- Track one-time welcome tour completion (null = not completed yet).

alter table public.profiles
  add column if not exists welcome_tour_completed_at timestamptz;

comment on column public.profiles.welcome_tour_completed_at is
  'Set when the user finishes or skips the in-app welcome tour.';
