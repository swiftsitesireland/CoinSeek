-- ── Tables ──────────────────────────────────────────────────────────────────

create table if not exists public.user_xp (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  total_xp   int  not null default 0,
  week_xp    int  not null default 0,
  week_start date not null default date_trunc('week', (now() at time zone 'utc'))::date,
  level      int  not null default 1,
  updated_at timestamptz not null default now()
);

create table if not exists public.user_badges (
  user_id   uuid references auth.users(id) on delete cascade,
  badge_id  text not null,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

create table if not exists public.challenges (
  id             text primary key,
  type           text not null check (type in ('daily','weekly')),
  title          text not null,
  description    text not null,
  xp_reward      int  not null,
  target_count   int  not null,
  target_action  text not null
);

create table if not exists public.user_challenges (
  user_id      uuid references auth.users(id) on delete cascade,
  challenge_id text references public.challenges(id),
  progress     int  not null default 0,
  completed_at timestamptz,
  cycle_start  date not null,
  primary key (user_id, challenge_id, cycle_start)
);

-- ── Seed challenges ──────────────────────────────────────────────────────────

insert into public.challenges (id, type, title, description, xp_reward, target_count, target_action) values
  ('daily_scan',          'daily',  'Daily Scanner',      'Scan 1 coin today',                    25,  1, 'scan'),
  ('daily_add',           'daily',  'Quick Collector',    'Add 1 coin to your collection',         25,  1, 'add'),
  ('weekly_scan_5',       'weekly', 'Active Week',        'Scan 5 coins this week',                75,  5, 'scan'),
  ('weekly_countries_3',  'weekly', 'World Traveler',     'Scan coins from 3 different countries', 100, 3, 'scan_countries'),
  ('weekly_add_3',        'weekly', 'Collection Builder', 'Add 3 coins to your collection',        100, 3, 'add'),
  ('weekly_rare',         'weekly', 'Rare Finder',        'Scan 1 rare or legendary coin',         150, 1, 'scan_rare')
on conflict (id) do nothing;

-- ── RLS ──────────────────────────────────────────────────────────────────────

-- DROP ... IF EXISTS before each CREATE POLICY: an earlier hand-run version of
-- this migration may already have created these policies, and CREATE POLICY is
-- not idempotent (SQLSTATE 42710). This keeps the migration safe to re-run.
alter table public.user_xp enable row level security;
drop policy if exists "own xp read" on public.user_xp;
create policy "own xp read"   on public.user_xp for select using (auth.uid() = user_id);

alter table public.user_badges enable row level security;
drop policy if exists "own badges read" on public.user_badges;
create policy "own badges read" on public.user_badges for select using (auth.uid() = user_id);

alter table public.challenges enable row level security;
drop policy if exists "all read challenges" on public.challenges;
create policy "all read challenges" on public.challenges for select to authenticated using (true);

alter table public.user_challenges enable row level security;
drop policy if exists "own challenges" on public.user_challenges;
create policy "own challenges"
  on public.user_challenges for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── RPC: award_xp ────────────────────────────────────────────────────────────

create or replace function public.award_xp(
  p_action   text,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_uid         uuid := auth.uid();
  v_xp_earned   int;
  v_cur_xp      int := 0;
  v_cur_week_xp int := 0;
  v_cur_week    date;
  v_new_xp      int;
  v_new_week_xp int;
  v_new_week    date := date_trunc('week', (now() at time zone 'utc'))::date;
  v_level_before int := 1;
  v_level_after  int;
begin
  v_xp_earned := case p_action
    when 'scan'             then 10
    when 'add'              then 20
    when 'daily_challenge'  then 25
    when 'weekly_challenge' then 100
    else 0
  end;

  if p_action = 'scan' and (
    (p_metadata->>'rarity')  in ('rare', 'legendary') or
    (p_metadata->>'era')      = 'ancient'
  ) then
    v_xp_earned := v_xp_earned + 50;
  end if;

  if v_xp_earned = 0 then
    return jsonb_build_object('xp_earned', 0);
  end if;

  select total_xp, week_xp, week_start, level
    into v_cur_xp, v_cur_week_xp, v_cur_week, v_level_before
    from public.user_xp where user_id = v_uid;

  v_new_xp := coalesce(v_cur_xp, 0) + v_xp_earned;

  if v_cur_week is null or v_cur_week < v_new_week then
    v_new_week_xp := v_xp_earned;
  else
    v_new_week_xp := coalesce(v_cur_week_xp, 0) + v_xp_earned;
  end if;

  v_level_after := (
    select coalesce(max(lvl), 1)
    from (values
      (1,0),(2,100),(3,250),(4,500),(5,900),(6,1400),(7,2000),(8,2800),
      (9,3800),(10,5000),(11,6500),(12,8500),(13,11000),(14,14000),(15,17500),
      (16,21500),(17,26000),(18,31000),(19,37000),(20,44000)
    ) as t(lvl, threshold)
    where threshold <= v_new_xp
  );

  insert into public.user_xp (user_id, total_xp, week_xp, week_start, level, updated_at)
  values (v_uid, v_new_xp, v_new_week_xp, v_new_week, v_level_after, now())
  on conflict (user_id) do update set
    total_xp   = v_new_xp,
    week_xp    = v_new_week_xp,
    week_start = v_new_week,
    level      = v_level_after,
    updated_at = now();

  return jsonb_build_object(
    'xp_earned',    v_xp_earned,
    'new_total',    v_new_xp,
    'new_week_xp',  v_new_week_xp,
    'level_before', coalesce(v_level_before, 1),
    'level_after',  v_level_after
  );
end;
$$;

revoke execute on function public.award_xp(text, jsonb) from public;
grant  execute on function public.award_xp(text, jsonb) to authenticated;

-- ── RPC: award_badge ─────────────────────────────────────────────────────────

create or replace function public.award_badge(p_badge_id text)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_new bool;
begin
  insert into public.user_badges (user_id, badge_id)
  values (v_uid, p_badge_id)
  on conflict (user_id, badge_id) do nothing;
  get diagnostics v_new = row_count;
  return jsonb_build_object('badge_id', p_badge_id, 'newly_earned', v_new > 0);
end;
$$;

revoke execute on function public.award_badge(text) from public;
grant  execute on function public.award_badge(text) to authenticated;

-- ── Leaderboard view ─────────────────────────────────────────────────────────

-- The profiles table predates this migration and may lack display_name in some
-- environments. Add it defensively so the leaderboard view can reference it.
-- (The app's authService already reads/writes profiles.display_name.)
alter table public.profiles add column if not exists display_name text;

create or replace view public.leaderboard_weekly as
select
  u.user_id,
  coalesce(p.display_name, 'Collector') as display_name,
  u.week_xp,
  u.level,
  rank() over (order by u.week_xp desc) as rank
from public.user_xp u
left join public.profiles p on p.id = u.user_id
order by u.week_xp desc
limit 100;

grant select on public.leaderboard_weekly to authenticated;
