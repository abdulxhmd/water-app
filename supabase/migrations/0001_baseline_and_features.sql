-- Water App schema baseline + new feature tables.
--
-- This file is idempotent: it uses IF NOT EXISTS / ON CONFLICT DO NOTHING
-- guards so it is safe to run against the existing production database,
-- which already has daily_water, user_pairs, weekly_results,
-- monthly_results, user_preferences, and push_subscriptions populated with
-- real data. It only adds what's missing; it never drops or rewrites data.
--
-- Run this in the Supabase SQL Editor (or `supabase db push` if you adopt
-- the CLI) for the project referenced by NEXT_PUBLIC_SUPABASE_URL.

-- ============================================================================
-- Existing tables (declared here so this file is a complete, checked-in
-- source of truth — see docs/DATABASE.md for the narrative version).
-- ============================================================================

create table if not exists public.daily_water (
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  water_ml integer not null default 0,
  primary key (user_id, date)
);

create table if not exists public.user_pairs (
  id uuid primary key default gen_random_uuid(),
  user_a_id uuid not null references auth.users (id) on delete cascade,
  user_b_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_a_id, user_b_id)
);

create table if not exists public.weekly_results (
  id uuid primary key default gen_random_uuid(),
  week_start date not null,
  week_end date not null,
  user_a_id uuid not null references auth.users (id) on delete cascade,
  user_b_id uuid not null references auth.users (id) on delete cascade,
  user_a_total integer not null default 0,
  user_b_total integer not null default 0,
  winner text,
  created_at timestamptz not null default now(),
  unique (week_start, week_end, user_a_id, user_b_id)
);

create table if not exists public.monthly_results (
  id uuid primary key default gen_random_uuid(),
  month_start date not null,
  month_end date not null,
  user_a_id uuid not null references auth.users (id) on delete cascade,
  user_b_id uuid not null references auth.users (id) on delete cascade,
  user_a_wins integer not null default 0,
  user_b_wins integer not null default 0,
  winner text,
  created_at timestamptz not null default now(),
  unique (month_start, month_end, user_a_id, user_b_id)
);

-- weekly_results/monthly_results predate this migration file in production,
-- so the `unique (...)` clauses in their `create table if not exists` above
-- were silently skipped for the already-existing tables (same issue as the
-- cascade-delete gap on user_preferences below). Add them defensively.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.weekly_results'::regclass
      and contype = 'u'
  ) then
    alter table public.weekly_results
      add constraint weekly_results_week_start_week_end_user_a_id_user_b_id_key
      unique (week_start, week_end, user_a_id, user_b_id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.monthly_results'::regclass
      and contype = 'u'
  ) then
    alter table public.monthly_results
      add constraint monthly_results_month_start_month_end_user_a_id_user_b_id_key
      unique (month_start, month_end, user_a_id, user_b_id);
  end if;
end $$;

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  daily_reminder boolean not null default false,
  partner_reminder boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.push_subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  subscription jsonb not null,
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- New columns for avatar/theme editing (Settings).
-- ============================================================================

alter table public.user_preferences
  add column if not exists avatar_url text;

alter table public.user_preferences
  add column if not exists theme text not null default 'calm';

alter table public.user_preferences
  drop constraint if exists user_preferences_theme_check;

alter table public.user_preferences
  add constraint user_preferences_theme_check
  check (theme in ('calm', 'focused', 'bold'));

-- ============================================================================
-- New table for the monthly wish reward flow.
-- ============================================================================

create table if not exists public.wishes (
  id uuid primary key default gen_random_uuid(),
  month_start date not null,
  month_end date not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  partner_id uuid not null references auth.users (id) on delete cascade,
  wish_text text not null,
  created_at timestamptz not null default now(),
  unique (month_start, month_end, user_id)
);

-- Pending/completed tracking for wishes, added after the fact once real
-- wishes started accumulating a backlog worth tracking.
alter table public.wishes
  add column if not exists fulfilled boolean not null default false;

alter table public.wishes
  add column if not exists fulfilled_at timestamptz;

alter table public.wishes
  add column if not exists fulfillment_note text;

-- ============================================================================
-- Row Level Security.
--
-- The app talks to Supabase directly from the browser with the public anon
-- key, so RLS is the only thing standing between "logged in as Shahul" and
-- "can read/write Shaima's rows". None of this existed before; every policy
-- below is additive and should be reviewed before running in production.
-- ============================================================================

alter table public.daily_water enable row level security;
alter table public.user_pairs enable row level security;
alter table public.weekly_results enable row level security;
alter table public.monthly_results enable row level security;
alter table public.user_preferences enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.wishes enable row level security;

-- user_pairs: each half of a pair can see their own pairing row. Pairs are
-- seeded by an admin (service role) — there is no app flow to create them.
drop policy if exists "user_pairs_select_own" on public.user_pairs;
create policy "user_pairs_select_own" on public.user_pairs
  for select using (auth.uid() = user_a_id or auth.uid() = user_b_id);

-- daily_water: you can always read/write your own rows, and read (but not
-- write) your paired partner's rows so the week/month pages can compare.
drop policy if exists "daily_water_select_self_or_partner" on public.daily_water;
create policy "daily_water_select_self_or_partner" on public.daily_water
  for select using (
    auth.uid() = user_id
    or exists (
      select 1 from public.user_pairs p
      where (p.user_a_id = auth.uid() and p.user_b_id = daily_water.user_id)
         or (p.user_b_id = auth.uid() and p.user_a_id = daily_water.user_id)
    )
  );

drop policy if exists "daily_water_write_self" on public.daily_water;
create policy "daily_water_write_self" on public.daily_water
  for insert with check (auth.uid() = user_id);

drop policy if exists "daily_water_update_self" on public.daily_water;
create policy "daily_water_update_self" on public.daily_water
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- weekly_results / monthly_results: either paired user can read; either
-- paired user's session can insert the result once the period has ended
-- (the app checks for an existing row first, so this is effectively
-- insert-once in practice).
drop policy if exists "weekly_results_select_pair" on public.weekly_results;
create policy "weekly_results_select_pair" on public.weekly_results
  for select using (auth.uid() = user_a_id or auth.uid() = user_b_id);

drop policy if exists "weekly_results_insert_pair" on public.weekly_results;
create policy "weekly_results_insert_pair" on public.weekly_results
  for insert with check (auth.uid() = user_a_id or auth.uid() = user_b_id);

drop policy if exists "monthly_results_select_pair" on public.monthly_results;
create policy "monthly_results_select_pair" on public.monthly_results
  for select using (auth.uid() = user_a_id or auth.uid() = user_b_id);

drop policy if exists "monthly_results_insert_pair" on public.monthly_results;
create policy "monthly_results_insert_pair" on public.monthly_results
  for insert with check (auth.uid() = user_a_id or auth.uid() = user_b_id);

-- user_preferences: you manage your own row; your partner can read your
-- avatar_url so their pages can display it.
drop policy if exists "user_preferences_select_self_or_partner" on public.user_preferences;
create policy "user_preferences_select_self_or_partner" on public.user_preferences
  for select using (
    auth.uid() = user_id
    or exists (
      select 1 from public.user_pairs p
      where (p.user_a_id = auth.uid() and p.user_b_id = user_preferences.user_id)
         or (p.user_b_id = auth.uid() and p.user_a_id = user_preferences.user_id)
    )
  );

drop policy if exists "user_preferences_write_self" on public.user_preferences;
create policy "user_preferences_write_self" on public.user_preferences
  for insert with check (auth.uid() = user_id);

drop policy if exists "user_preferences_update_self" on public.user_preferences;
create policy "user_preferences_update_self" on public.user_preferences
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- push_subscriptions: strictly private to the owning user. The send-push
-- edge function reads across users with the service role key, which
-- bypasses RLS entirely, so no cross-user policy is needed here.
drop policy if exists "push_subscriptions_all_self" on public.push_subscriptions;
create policy "push_subscriptions_all_self" on public.push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- wishes: the winner can create a wish for the month they won; both halves
-- of the pair can read it. The insert check re-derives winner status from
-- monthly_results server-side so a client can't fabricate a wish it didn't
-- earn.
drop policy if exists "wishes_select_pair" on public.wishes;
create policy "wishes_select_pair" on public.wishes
  for select using (auth.uid() = user_id or auth.uid() = partner_id);

drop policy if exists "wishes_insert_winner_only" on public.wishes;
create policy "wishes_insert_winner_only" on public.wishes
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.monthly_results mr
      where mr.month_start = wishes.month_start
        and mr.month_end = wishes.month_end
        and mr.winner = auth.uid()::text
        and (
          (mr.user_a_id = wishes.user_id and mr.user_b_id = wishes.partner_id)
          or (mr.user_b_id = wishes.user_id and mr.user_a_id = wishes.partner_id)
        )
    )
  );

-- Either half of the pair can update the fulfilled/fulfillment_note fields
-- (the partner marks it done once they've delivered on the wish, though
-- either person doing it is fine for a two-person app).
drop policy if exists "wishes_update_pair" on public.wishes;
create policy "wishes_update_pair" on public.wishes
  for update using (auth.uid() = user_id or auth.uid() = partner_id)
  with check (auth.uid() = user_id or auth.uid() = partner_id);

-- ============================================================================
-- Storage bucket for avatar images.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Avatar images are not sensitive, so anyone (including logged-out
-- visitors) can read them once uploaded — this keeps <img src> simple.
drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

-- Each user may only write inside a folder named after their own user id,
-- e.g. avatars/<user_id>/avatar.png.
drop policy if exists "avatars_write_own_folder" on storage.objects;
create policy "avatars_write_own_folder" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_update_own_folder" on storage.objects;
create policy "avatars_update_own_folder" on storage.objects
  for update using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_delete_own_folder" on storage.objects;
create policy "avatars_delete_own_folder" on storage.objects
  for delete using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
