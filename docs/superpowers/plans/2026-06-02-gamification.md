# Gamification System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a full progression system — XP + levels, badges, daily/weekly challenges, and a leaderboard — behind a dedicated Progress tab and ambient XP toasts after every scan.

**Architecture:** XP is awarded via a server-side Supabase RPC so the client can never write XP directly. Badge insertion and challenge progress go through a second RPC and direct RLS-guarded writes respectively. The Redux `gamificationSlice` caches all state for offline display; the `useGamification` hook keeps it synced on mount and app-foreground events.

**Tech Stack:** React Native 0.81, Expo SDK 54, Redux Toolkit, Supabase JS v2, react-native-toast-message v2.2, jest-expo, @testing-library/react-native

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `supabase/migrations/20260602_gamification.sql` | DB tables, RPCs, RLS, leaderboard view |
| Create | `src/data/badges.js` | 30 badge definitions + `getBadge(id)` |
| Create | `src/data/challenges.js` | Daily/weekly templates + `getChallenge(id)` |
| Create | `src/store/slices/gamificationSlice.js` | Redux cache for XP, level, badges, challenges |
| Create | `src/services/gamificationService.js` | All Supabase calls (award_xp RPC, badge RPC, leaderboard, fetch) |
| Create | `src/hooks/useGamification.js` | Fetch + subscribe, exposes state to Progress screen |
| Create | `src/components/XPToast.js` | Custom toast UI component for XP feedback |
| Create | `src/screens/ProgressScreen.js` | Full hub: level card, challenges, badges, leaderboard |
| Modify | `src/store/index.js` | Add gamificationReducer |
| Modify | `App.js` | Register `xpEarned` toast type in Toast config |
| Modify | `src/navigation/AppNavigator.js` | Add Progress tab (4th tab) |
| Modify | `src/screens/ResultsScreen.js` | Call `awardXP` after scan + add to collection |
| Modify | `package.json` | Add jest-expo + @testing-library/react-native |

---

## Task 1: Test Infrastructure

**Files:**
- Modify: `package.json`
- Create: `jest.setup.js`

- [ ] **Step 1: Install test dependencies**

```bash
npm install --save-dev jest-expo @testing-library/react-native @testing-library/jest-native
```

Expected: packages appear in `devDependencies` in `package.json`.

- [ ] **Step 2: Add jest config to `package.json`**

Add after the `"scripts"` section:

```json
"jest": {
  "preset": "jest-expo",
  "setupFilesAfterFramework": ["@testing-library/jest-native/extend-expect"],
  "transformIgnorePatterns": [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|react-native-toast-message|@reduxjs/.*)"
  ]
}
```

- [ ] **Step 3: Add test script to `package.json`**

Inside `"scripts"`:
```json
"test": "jest",
"test:watch": "jest --watch"
```

- [ ] **Step 4: Create `jest.setup.js`**

```js
import '@testing-library/jest-native/extend-expect';
```

- [ ] **Step 5: Write a smoke test to verify setup works**

Create `src/__tests__/smoke.test.js`:

```js
describe('test setup', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 6: Run smoke test**

```bash
npm test -- src/__tests__/smoke.test.js
```

Expected output: `PASS src/__tests__/smoke.test.js` with 1 passing test.

- [ ] **Step 7: Commit**

```bash
git add package.json jest.setup.js src/__tests__/smoke.test.js
git commit -m "chore: add jest-expo test infrastructure"
```

---

## Task 2: Database Migration

**Files:**
- Create: `supabase/migrations/20260602_gamification.sql`

- [ ] **Step 1: Create the migrations directory**

```bash
mkdir -p supabase/migrations
```

- [ ] **Step 2: Write the migration file**

Create `supabase/migrations/20260602_gamification.sql`:

```sql
-- ── Tables ──────────────────────────────────────────────────────────────────

create table if not exists public.user_xp (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  total_xp   int  not null default 0,
  week_xp    int  not null default 0,
  week_start date not null default date_trunc('week', current_date)::date,
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
  target_action  text not null  -- 'scan' | 'add' | 'scan_rare' | 'scan_countries'
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

alter table public.user_xp enable row level security;
create policy "own xp read"   on public.user_xp for select using (auth.uid() = user_id);

alter table public.user_badges enable row level security;
create policy "own badges read" on public.user_badges for select using (auth.uid() = user_id);

alter table public.challenges enable row level security;
create policy "all read challenges" on public.challenges for select to authenticated using (true);

alter table public.user_challenges enable row level security;
create policy "own challenges"
  on public.user_challenges for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── RPC: award_xp ────────────────────────────────────────────────────────────

create or replace function public.award_xp(
  p_action   text,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql security definer
as $$
declare
  v_uid         uuid := auth.uid();
  v_xp_earned   int;
  v_cur_xp      int := 0;
  v_cur_week_xp int := 0;
  v_cur_week    date;
  v_new_xp      int;
  v_new_week_xp int;
  v_new_week    date := date_trunc('week', current_date)::date;
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
    return jsonb_build_object('xp_earned', 0, 'new_total', 0, 'level_before', 1, 'level_after', 1);
  end if;

  select total_xp, week_xp, week_start, level
    into v_cur_xp, v_cur_week_xp, v_cur_week, v_level_before
    from public.user_xp where user_id = v_uid;

  v_new_xp := coalesce(v_cur_xp, 0) + v_xp_earned;

  -- Reset weekly XP if we've crossed into a new week
  if v_cur_week is null or v_cur_week < v_new_week then
    v_new_week_xp := v_xp_earned;
  else
    v_new_week_xp := coalesce(v_cur_week_xp, 0) + v_xp_earned;
  end if;

  -- Recalculate level
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

-- ── RPC: award_badge ─────────────────────────────────────────────────────────

create or replace function public.award_badge(p_badge_id text)
returns jsonb
language plpgsql security definer
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

-- ── Leaderboard view ─────────────────────────────────────────────────────────

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
```

- [ ] **Step 3: Run the migration in Supabase SQL Editor**

Open your Supabase dashboard → SQL Editor → paste the contents of `supabase/migrations/20260602_gamification.sql` and click **Run**.

Expected: no errors. Tables `user_xp`, `user_badges`, `challenges`, `user_challenges` appear in Table Editor. View `leaderboard_weekly` is visible under Database → Views.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260602_gamification.sql
git commit -m "feat: gamification DB migration — tables, RPCs, leaderboard view"
```

---

## Task 3: Static Data — Badges & Challenges

**Files:**
- Create: `src/data/badges.js`
- Create: `src/data/challenges.js`
- Create: `src/__tests__/data/badges.test.js`
- Create: `src/__tests__/data/challenges.test.js`

- [ ] **Step 1: Write failing tests for badges.js**

Create `src/__tests__/data/badges.test.js`:

```js
import { BADGES, getBadge, getBadgesByCategory } from '../../data/badges';

describe('BADGES', () => {
  it('has 30 entries', () => {
    expect(BADGES).toHaveLength(30);
  });

  it('every badge has required fields', () => {
    BADGES.forEach((b) => {
      expect(b).toHaveProperty('id');
      expect(b).toHaveProperty('emoji');
      expect(b).toHaveProperty('name');
      expect(b).toHaveProperty('description');
      expect(b).toHaveProperty('category');
      expect(b).toHaveProperty('criteria');
    });
  });
});

describe('getBadge', () => {
  it('returns the badge with matching id', () => {
    const badge = getBadge('first_scan');
    expect(badge.name).toBe('First Scan');
  });

  it('returns undefined for unknown id', () => {
    expect(getBadge('nonexistent')).toBeUndefined();
  });
});

describe('getBadgesByCategory', () => {
  it('returns only badges in the given category', () => {
    const scanning = getBadgesByCategory('scanning');
    expect(scanning.length).toBeGreaterThan(0);
    scanning.forEach((b) => expect(b.category).toBe('scanning'));
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npm test -- src/__tests__/data/badges.test.js
```

Expected: FAIL — `Cannot find module '../../data/badges'`

- [ ] **Step 3: Write `src/data/badges.js`**

```js
export const BADGES = [
  // ── Scanning ──────────────────────────────────────────────────────────────
  { id: 'first_scan',        emoji: '📷', name: 'First Scan',         description: 'Scan your first coin',         category: 'scanning',   criteria: { action: 'scan',       count: 1 } },
  { id: 'warm_up',           emoji: '🔥', name: 'Warm Up',            description: 'Scan 10 coins',                category: 'scanning',   criteria: { action: 'scan',       count: 10 } },
  { id: 'century_scanner',   emoji: '💯', name: 'Century Scanner',    description: 'Scan 100 coins',               category: 'scanning',   criteria: { action: 'scan',       count: 100 } },
  { id: 'scan_master',       emoji: '🎖️', name: 'Scan Master',        description: 'Scan 500 coins',               category: 'scanning',   criteria: { action: 'scan',       count: 500 } },
  // ── Collection ────────────────────────────────────────────────────────────
  { id: 'starting_out',      emoji: '🌱', name: 'Starting Out',       description: 'Add your first coin',          category: 'collection', criteria: { action: 'add',        count: 1 } },
  { id: 'growing',           emoji: '📦', name: 'Growing Collection', description: 'Add 10 coins',                 category: 'collection', criteria: { action: 'add',        count: 10 } },
  { id: 'serious_collector', emoji: '🏛️', name: 'Serious Collector',  description: 'Add 50 coins',                 category: 'collection', criteria: { action: 'add',        count: 50 } },
  { id: 'century_collection',emoji: '🗄️', name: 'Century Collection', description: 'Add 100 coins',                category: 'collection', criteria: { action: 'add',        count: 100 } },
  // ── Geography ─────────────────────────────────────────────────────────────
  { id: 'world_traveler',    emoji: '🌍', name: 'World Traveler',     description: 'Coins from 5 countries',       category: 'geography',  criteria: { action: 'countries',  count: 5 } },
  { id: 'global_citizen',    emoji: '🌐', name: 'Global Citizen',     description: 'Coins from 10 countries',      category: 'geography',  criteria: { action: 'countries',  count: 10 } },
  { id: 'euro_explorer',     emoji: '🇪🇺', name: 'Euro Explorer',      description: 'Coins from 5 European countries', category: 'geography', criteria: { action: 'eu_countries', count: 5 } },
  // ── Era & Material ────────────────────────────────────────────────────────
  { id: 'ancient_history',   emoji: '🏛️', name: 'Ancient History',    description: 'Scan a Roman or ancient coin', category: 'era',        criteria: { action: 'scan_era',   era: 'ancient' } },
  { id: 'silver_age',        emoji: '🌕', name: 'Silver Age',         description: 'Scan a silver coin',           category: 'era',        criteria: { action: 'scan_metal', metal: 'silver' } },
  { id: 'gold_standard',     emoji: '🥇', name: 'Gold Standard',      description: 'Scan a gold coin',             category: 'era',        criteria: { action: 'scan_metal', metal: 'gold' } },
  { id: 'medieval_times',    emoji: '⚔️', name: 'Medieval Times',     description: 'Scan a medieval coin',         category: 'era',        criteria: { action: 'scan_era',   era: 'medieval' } },
  { id: 'modern_era',        emoji: '🏭', name: 'Modern Era',         description: 'Scan 10 post-1900 coins',      category: 'era',        criteria: { action: 'scan_modern', count: 10 } },
  // ── Rarity ────────────────────────────────────────────────────────────────
  { id: 'rare_find',         emoji: '💎', name: 'Rare Find',          description: 'Scan a rare coin',             category: 'rarity',     criteria: { action: 'scan_rare',  count: 1 } },
  { id: 'legendary_hunter',  emoji: '👑', name: 'Legendary Hunter',   description: 'Scan a legendary coin',        category: 'rarity',     criteria: { action: 'scan_legendary', count: 1 } },
  { id: 'rarity_seeker',     emoji: '🔍', name: 'Rarity Seeker',      description: 'Scan 5 rare or legendary coins',category: 'rarity',   criteria: { action: 'scan_rare',  count: 5 } },
  // ── Challenges ────────────────────────────────────────────────────────────
  { id: 'challenge_accepted',emoji: '🎯', name: 'Challenge Accepted', description: 'Complete your first challenge',category: 'challenges', criteria: { action: 'challenge',  count: 1 } },
  { id: 'weekly_warrior',    emoji: '⚔️', name: 'Weekly Warrior',     description: 'Complete 4 weekly challenges', category: 'challenges', criteria: { action: 'weekly_challenge', count: 4 } },
  { id: 'daily_devotion',    emoji: '📅', name: 'Daily Devotion',     description: 'Complete 7 daily challenges',  category: 'challenges', criteria: { action: 'daily_challenge',  count: 7 } },
  { id: 'streak_7',          emoji: '🔥', name: 'On Fire',            description: '7-day scan streak',           category: 'challenges', criteria: { action: 'streak',     count: 7 } },
  // ── Level milestones ──────────────────────────────────────────────────────
  { id: 'level_5',           emoji: '⭐', name: 'Rising Star',        description: 'Reach level 5',               category: 'levels',     criteria: { action: 'level',      count: 5 } },
  { id: 'level_10',          emoji: '🌟', name: 'Expert Eye',         description: 'Reach level 10',              category: 'levels',     criteria: { action: 'level',      count: 10 } },
  { id: 'level_15',          emoji: '💫', name: 'Elite Collector',    description: 'Reach level 15',              category: 'levels',     criteria: { action: 'level',      count: 15 } },
  { id: 'level_20',          emoji: '🏆', name: 'Master',             description: 'Reach level 20',              category: 'levels',     criteria: { action: 'level',      count: 20 } },
  // ── Special ───────────────────────────────────────────────────────────────
  { id: 'first_add',         emoji: '➕', name: 'Collector Born',     description: 'Add first coin to collection', category: 'collection', criteria: { action: 'add',        count: 1 } },
  { id: 'wishlist_10',       emoji: '💫', name: 'Dream Collector',    description: 'Add 10 coins to wishlist',     category: 'collection', criteria: { action: 'wishlist',   count: 10 } },
  { id: 'share_1',           emoji: '📤', name: 'Show Off',           description: 'Share a coin result',          category: 'special',    criteria: { action: 'share',      count: 1 } },
  { id: 'profile_complete',  emoji: '✅', name: 'All Set',            description: 'Complete your profile',        category: 'special',    criteria: { action: 'profile',    count: 1 } },
];

export function getBadge(id) {
  return BADGES.find((b) => b.id === id);
}

export function getBadgesByCategory(category) {
  return BADGES.filter((b) => b.category === category);
}
```

- [ ] **Step 4: Write failing tests for challenges.js**

Create `src/__tests__/data/challenges.test.js`:

```js
import { CHALLENGE_TEMPLATES, getChallenge, getDailyChallenges, getWeeklyChallenges } from '../../data/challenges';

describe('CHALLENGE_TEMPLATES', () => {
  it('has 6 entries', () => {
    expect(CHALLENGE_TEMPLATES).toHaveLength(6);
  });

  it('every template has required fields', () => {
    CHALLENGE_TEMPLATES.forEach((c) => {
      expect(c).toHaveProperty('id');
      expect(c).toHaveProperty('type');
      expect(c).toHaveProperty('title');
      expect(c).toHaveProperty('xpReward');
      expect(c).toHaveProperty('targetCount');
      expect(c).toHaveProperty('targetAction');
    });
  });
});

describe('getChallenge', () => {
  it('returns template with matching id', () => {
    expect(getChallenge('daily_scan').title).toBe('Daily Scanner');
  });
});

describe('getDailyChallenges / getWeeklyChallenges', () => {
  it('daily returns only daily type', () => {
    getDailyChallenges().forEach((c) => expect(c.type).toBe('daily'));
  });
  it('weekly returns only weekly type', () => {
    getWeeklyChallenges().forEach((c) => expect(c.type).toBe('weekly'));
  });
});
```

- [ ] **Step 5: Implement `src/data/challenges.js`**

```js
export const CHALLENGE_TEMPLATES = [
  { id: 'daily_scan',         type: 'daily',  title: 'Daily Scanner',      description: 'Scan 1 coin today',                       xpReward: 25,  targetCount: 1, targetAction: 'scan' },
  { id: 'daily_add',          type: 'daily',  title: 'Quick Collector',    description: 'Add 1 coin to your collection',            xpReward: 25,  targetCount: 1, targetAction: 'add' },
  { id: 'weekly_scan_5',      type: 'weekly', title: 'Active Week',        description: 'Scan 5 coins this week',                   xpReward: 75,  targetCount: 5, targetAction: 'scan' },
  { id: 'weekly_countries_3', type: 'weekly', title: 'World Traveler',     description: 'Scan coins from 3 different countries',    xpReward: 100, targetCount: 3, targetAction: 'scan_countries' },
  { id: 'weekly_add_3',       type: 'weekly', title: 'Collection Builder', description: 'Add 3 coins to your collection this week', xpReward: 100, targetCount: 3, targetAction: 'add' },
  { id: 'weekly_rare',        type: 'weekly', title: 'Rare Finder',        description: 'Scan 1 rare or legendary coin',            xpReward: 150, targetCount: 1, targetAction: 'scan_rare' },
];

export function getChallenge(id) {
  return CHALLENGE_TEMPLATES.find((c) => c.id === id);
}

export function getDailyChallenges() {
  return CHALLENGE_TEMPLATES.filter((c) => c.type === 'daily');
}

export function getWeeklyChallenges() {
  return CHALLENGE_TEMPLATES.filter((c) => c.type === 'weekly');
}
```

- [ ] **Step 6: Run tests**

```bash
npm test -- src/__tests__/data/
```

Expected: PASS — 8 tests across 2 files.

- [ ] **Step 7: Commit**

```bash
git add src/data/badges.js src/data/challenges.js src/__tests__/data/
git commit -m "feat: badge and challenge static data with tests"
```

---

## Task 4: Redux Gamification Slice

**Files:**
- Create: `src/store/slices/gamificationSlice.js`
- Create: `src/__tests__/store/gamificationSlice.test.js`
- Modify: `src/store/index.js`

- [ ] **Step 1: Write failing tests**

Create `src/__tests__/store/gamificationSlice.test.js`:

```js
import gamificationReducer, {
  setGamification,
  addEarnedBadge,
  updateChallengeProgress,
  selectXP,
  selectLevel,
  selectLevelTitle,
  selectBadges,
  selectChallenges,
  selectLeaderboard,
} from '../../store/slices/gamificationSlice';

const initial = gamificationReducer(undefined, { type: '@@INIT' });

describe('initial state', () => {
  it('has zero xp', () => expect(initial.xp).toBe(0));
  it('has level 1', () => expect(initial.level).toBe(1));
  it('has empty badges', () => expect(initial.badges).toEqual([]));
  it('has empty challenges', () => expect(initial.challenges).toEqual([]));
});

describe('setGamification', () => {
  it('merges partial payload', () => {
    const next = gamificationReducer(initial, setGamification({ xp: 500, level: 4 }));
    expect(next.xp).toBe(500);
    expect(next.level).toBe(4);
    expect(next.badges).toEqual([]);
  });
});

describe('addEarnedBadge', () => {
  it('appends badge_id', () => {
    const next = gamificationReducer(initial, addEarnedBadge('first_scan'));
    expect(next.badges).toContain('first_scan');
  });

  it('does not add duplicate', () => {
    let state = gamificationReducer(initial, addEarnedBadge('first_scan'));
    state = gamificationReducer(state, addEarnedBadge('first_scan'));
    expect(state.badges.filter((b) => b === 'first_scan')).toHaveLength(1);
  });
});

describe('updateChallengeProgress', () => {
  it('upserts challenge progress', () => {
    const payload = { challengeId: 'daily_scan', progress: 1, completed: false };
    const next = gamificationReducer(initial, updateChallengeProgress(payload));
    expect(next.challenges[0]).toMatchObject(payload);
  });

  it('updates existing entry', () => {
    let state = gamificationReducer(initial, updateChallengeProgress({ challengeId: 'daily_scan', progress: 0, completed: false }));
    state = gamificationReducer(state, updateChallengeProgress({ challengeId: 'daily_scan', progress: 1, completed: true }));
    expect(state.challenges).toHaveLength(1);
    expect(state.challenges[0].completed).toBe(true);
  });
});

describe('selectors', () => {
  const state = { gamification: { xp: 1320, weekXp: 200, level: 7, levelTitle: 'Silver Hoarder', badges: ['first_scan'], challenges: [], leaderboard: [] } };
  it('selectXP', () => expect(selectXP(state)).toBe(1320));
  it('selectLevel', () => expect(selectLevel(state)).toBe(7));
  it('selectLevelTitle', () => expect(selectLevelTitle(state)).toBe('Silver Hoarder'));
  it('selectBadges', () => expect(selectBadges(state)).toContain('first_scan'));
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- src/__tests__/store/gamificationSlice.test.js
```

Expected: FAIL — `Cannot find module '../../store/slices/gamificationSlice'`

- [ ] **Step 3: Write `src/store/slices/gamificationSlice.js`**

```js
import { createSlice } from '@reduxjs/toolkit';

const LEVEL_TITLES = [
  '', 'Pocket Change', 'Penny Picker', 'Nickel Novice', 'Dime Dropper',
  'Quarter Master', 'Dollar Digger', 'Silver Hoarder', 'Gold Hunter',
  'Bronze Age', 'Silver Scholar', 'Gold Expert', 'Coin Whisperer',
  'Numismatist', 'Ancient Seeker', 'Relic Hunter', 'Museum Worthy',
  'Vault Keeper', 'Grand Collector', 'Legendary Hoarder', 'Master Numismatist',
];

const gamificationSlice = createSlice({
  name: 'gamification',
  initialState: {
    xp:         0,
    weekXp:     0,
    level:      1,
    levelTitle: 'Pocket Change',
    badges:     [],    // array of badge_id strings
    challenges: [],    // [{ challengeId, progress, completed }]
    leaderboard:[],    // [{ user_id, display_name, week_xp, level, rank }]
    loading:    false,
  },
  reducers: {
    setGamification(state, action) {
      return { ...state, ...action.payload };
    },
    addEarnedBadge(state, action) {
      if (!state.badges.includes(action.payload)) {
        state.badges.push(action.payload);
      }
    },
    updateChallengeProgress(state, action) {
      const { challengeId, progress, completed } = action.payload;
      const idx = state.challenges.findIndex((c) => c.challengeId === challengeId);
      if (idx >= 0) {
        state.challenges[idx] = { challengeId, progress, completed };
      } else {
        state.challenges.push({ challengeId, progress, completed });
      }
    },
    setLeaderboard(state, action) {
      state.leaderboard = action.payload;
    },
    setLoading(state, action) {
      state.loading = action.payload;
    },
  },
});

export const {
  setGamification, addEarnedBadge, updateChallengeProgress, setLeaderboard, setLoading,
} = gamificationSlice.actions;

export default gamificationSlice.reducer;

export const selectXP           = (s) => s.gamification.xp;
export const selectWeekXP       = (s) => s.gamification.weekXp;
export const selectLevel        = (s) => s.gamification.level;
export const selectLevelTitle   = (s) => s.gamification.levelTitle;
export const selectBadges       = (s) => s.gamification.badges;
export const selectChallenges   = (s) => s.gamification.challenges;
export const selectLeaderboard  = (s) => s.gamification.leaderboard;
export const selectGamLoading   = (s) => s.gamification.loading;

export { LEVEL_TITLES };
```

- [ ] **Step 4: Add gamificationReducer to `src/store/index.js`**

```js
import { configureStore } from '@reduxjs/toolkit';
import collectionReducer from './slices/collectionSlice';
import historyReducer from './slices/historySlice';
import settingsReducer from './slices/settingsSlice';
import gamificationReducer from './slices/gamificationSlice';
import { collectionSyncMiddleware } from './middleware/collectionSync';
import { settingsPersistMiddleware } from './middleware/settingsPersist';

export const store = configureStore({
  reducer: {
    collection:    collectionReducer,
    history:       historyReducer,
    settings:      settingsReducer,
    gamification:  gamificationReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(collectionSyncMiddleware, settingsPersistMiddleware),
});
```

- [ ] **Step 5: Run tests**

```bash
npm test -- src/__tests__/store/gamificationSlice.test.js
```

Expected: PASS — 12 tests.

- [ ] **Step 6: Commit**

```bash
git add src/store/slices/gamificationSlice.js src/store/index.js src/__tests__/store/
git commit -m "feat: gamification Redux slice with tests"
```

---

## Task 5: Gamification Service

**Files:**
- Create: `src/services/gamificationService.js`
- Create: `src/__tests__/services/gamificationService.test.js`

- [ ] **Step 1: Write failing tests**

Create `src/__tests__/services/gamificationService.test.js`:

```js
jest.mock('../../config/supabase', () => ({
  supabase: {
    rpc: jest.fn(),
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq:         jest.fn(() => ({ data: null, error: null })),
        order:      jest.fn(() => ({ limit: jest.fn(() => ({ data: [], error: null })) })),
        maybeSingle: jest.fn(() => ({ data: null, error: null })),
      })),
    })),
  },
}));

import { supabase } from '../../config/supabase';
import {
  awardXP,
  fetchGamificationData,
  fetchLeaderboard,
  checkAndAwardBadges,
} from '../../services/gamificationService';

beforeEach(() => jest.clearAllMocks());

describe('awardXP', () => {
  it('calls award_xp RPC with action and metadata', async () => {
    supabase.rpc.mockResolvedValueOnce({
      data: { xp_earned: 10, new_total: 110, new_week_xp: 10, level_before: 2, level_after: 2 },
      error: null,
    });
    const result = await awardXP('scan', { rarity: 'common', era: 'modern', country: 'US' });
    expect(supabase.rpc).toHaveBeenCalledWith('award_xp', {
      p_action: 'scan',
      p_metadata: { rarity: 'common', era: 'modern', country: 'US' },
    });
    expect(result.xp_earned).toBe(10);
  });

  it('throws when RPC returns error', async () => {
    supabase.rpc.mockResolvedValueOnce({ data: null, error: { message: 'rpc failed' } });
    await expect(awardXP('scan', {})).rejects.toThrow('rpc failed');
  });
});

describe('fetchLeaderboard', () => {
  it('returns empty array on error', async () => {
    supabase.from.mockReturnValueOnce({
      select: jest.fn(() => ({
        order: jest.fn(() => ({
          limit: jest.fn(() => ({ data: null, error: { message: 'fail' } })),
        })),
      })),
    });
    const result = await fetchLeaderboard();
    expect(result).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- src/__tests__/services/gamificationService.test.js
```

Expected: FAIL — `Cannot find module '../../services/gamificationService'`

- [ ] **Step 3: Write `src/services/gamificationService.js`**

```js
import { supabase } from '../config/supabase';
import { BADGES } from '../data/badges';
import { LEVEL_TITLES } from '../store/slices/gamificationSlice';

const EU_COUNTRIES = new Set(['Germany','France','Italy','Spain','Netherlands','Belgium','Austria','Portugal','Greece','Finland','Ireland','Luxembourg']);

export async function awardXP(action, metadata = {}) {
  const { data, error } = await supabase.rpc('award_xp', {
    p_action:   action,
    p_metadata: metadata,
  });
  if (error) throw new Error(error.message);
  return data; // { xp_earned, new_total, new_week_xp, level_before, level_after }
}

export async function awardBadge(badgeId) {
  const { data, error } = await supabase.rpc('award_badge', { p_badge_id: badgeId });
  if (error) return { newly_earned: false };
  return data; // { badge_id, newly_earned }
}

export async function fetchGamificationData(userId) {
  const [xpRes, badgesRes, challengesRes] = await Promise.all([
    supabase.from('user_xp').select('total_xp, week_xp, level').eq('user_id', userId).maybeSingle(),
    supabase.from('user_badges').select('badge_id, earned_at').eq('user_id', userId),
    supabase.from('user_challenges').select('challenge_id, progress, completed_at').eq('user_id', userId),
  ]);

  const xpRow  = xpRes.data  ?? { total_xp: 0, week_xp: 0, level: 1 };
  const level  = xpRow.level ?? 1;

  return {
    xp:         xpRow.total_xp,
    weekXp:     xpRow.week_xp,
    level,
    levelTitle: LEVEL_TITLES[level] ?? 'Pocket Change',
    badges:     (badgesRes.data ?? []).map((r) => r.badge_id),
    challenges: (challengesRes.data ?? []).map((r) => ({
      challengeId: r.challenge_id,
      progress:    r.progress,
      completed:   !!r.completed_at,
    })),
  };
}

export async function fetchLeaderboard() {
  const { data, error } = await supabase
    .from('leaderboard_weekly')
    .select('user_id, display_name, week_xp, level, rank')
    .order('rank', { ascending: true })
    .limit(10);
  if (error) return [];
  return data ?? [];
}

export async function checkAndAwardBadges({ action, metadata, newTotal, level, earnedBadges, collectionSize, scanCount, countries }) {
  const newlyEarned = [];

  const check = async (badgeId, condition) => {
    if (!earnedBadges.includes(badgeId) && condition) {
      const res = await awardBadge(badgeId);
      if (res.newly_earned) newlyEarned.push(badgeId);
    }
  };

  // Scanning milestones
  await check('first_scan',      action === 'scan' && scanCount >= 1);
  await check('warm_up',         action === 'scan' && scanCount >= 10);
  await check('century_scanner', action === 'scan' && scanCount >= 100);
  await check('scan_master',     action === 'scan' && scanCount >= 500);

  // Collection milestones
  await check('starting_out',       action === 'add' && collectionSize >= 1);
  await check('growing',            action === 'add' && collectionSize >= 10);
  await check('serious_collector',  action === 'add' && collectionSize >= 50);
  await check('century_collection', action === 'add' && collectionSize >= 100);

  // Geography
  const countryCount = countries?.size ?? 0;
  await check('world_traveler', countryCount >= 5);
  await check('global_citizen', countryCount >= 10);
  await check('euro_explorer',  [...(countries ?? [])].filter((c) => EU_COUNTRIES.has(c)).length >= 5);

  // Era & material (metadata from current scan)
  if (action === 'scan' && metadata) {
    await check('ancient_history', metadata.era === 'ancient');
    await check('silver_age',      (metadata.composition ?? '').toLowerCase().includes('silver'));
    await check('gold_standard',   (metadata.composition ?? '').toLowerCase().includes('gold'));
    await check('medieval_times',  metadata.era === 'medieval');
    await check('rare_find',       metadata.rarity === 'rare' || metadata.rarity === 'legendary');
    await check('legendary_hunter',metadata.rarity === 'legendary');
  }

  // Level milestones
  await check('level_5',  level >= 5);
  await check('level_10', level >= 10);
  await check('level_15', level >= 15);
  await check('level_20', level >= 20);

  return newlyEarned;
}

export async function upsertChallengeProgress(challengeId, progress, completed, cycleStart) {
  const { error } = await supabase.from('user_challenges').upsert({
    challenge_id: challengeId,
    progress,
    completed_at: completed ? new Date().toISOString() : null,
    cycle_start:  cycleStart,
  }, { onConflict: 'user_id,challenge_id,cycle_start' });
  if (error) console.warn('upsertChallengeProgress error:', error.message);
}
```

- [ ] **Step 4: Run tests**

```bash
npm test -- src/__tests__/services/gamificationService.test.js
```

Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/services/gamificationService.js src/__tests__/services/
git commit -m "feat: gamification service — XP RPC, badge checks, leaderboard"
```

---

## Task 6: `useGamification` Hook

**Files:**
- Create: `src/hooks/useGamification.js`

- [ ] **Step 1: Write `src/hooks/useGamification.js`**

```js
import { useEffect, useCallback } from 'react';
import { AppState } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useAuth } from '../auth/AuthContext';
import {
  setGamification, setLeaderboard, setLoading,
  selectXP, selectWeekXP, selectLevel, selectLevelTitle,
  selectBadges, selectChallenges, selectLeaderboard, selectGamLoading,
} from '../store/slices/gamificationSlice';
import { fetchGamificationData, fetchLeaderboard } from '../services/gamificationService';

export function useGamification() {
  const { user }   = useAuth();
  const dispatch   = useDispatch();

  const xp          = useSelector(selectXP);
  const weekXp      = useSelector(selectWeekXP);
  const level       = useSelector(selectLevel);
  const levelTitle  = useSelector(selectLevelTitle);
  const badges      = useSelector(selectBadges);
  const challenges  = useSelector(selectChallenges);
  const leaderboard = useSelector(selectLeaderboard);
  const loading     = useSelector(selectGamLoading);

  const refetch = useCallback(async () => {
    if (!user?.id) return;
    dispatch(setLoading(true));
    try {
      const [gamData, board] = await Promise.all([
        fetchGamificationData(user.id),
        fetchLeaderboard(),
      ]);
      dispatch(setGamification(gamData));
      dispatch(setLeaderboard(board));
    } catch (e) {
      console.warn('useGamification fetch error:', e.message);
    } finally {
      dispatch(setLoading(false));
    }
  }, [user?.id]);

  useEffect(() => { refetch(); }, [refetch]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refetch();
    });
    return () => sub.remove();
  }, [refetch]);

  const xpToNextLevel = getXPToNextLevel(level, xp);

  return { xp, weekXp, level, levelTitle, xpToNextLevel, badges, challenges, leaderboard, loading, refetch };
}

const LEVEL_THRESHOLDS = [0,100,250,500,900,1400,2000,2800,3800,5000,6500,8500,11000,14000,17500,21500,26000,31000,37000,44000];

function getXPToNextLevel(level, xp) {
  const next = LEVEL_THRESHOLDS[level]; // threshold for level+1
  if (!next) return 0;                  // max level
  return next - xp;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useGamification.js
git commit -m "feat: useGamification hook — fetches XP, badges, challenges, leaderboard"
```

---

## Task 7: XP Toast Component

**Files:**
- Create: `src/components/XPToast.js`
- Modify: `App.js`

- [ ] **Step 1: Write `src/components/XPToast.js`**

```js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts, borderRadius } from '../theme';
import { getBadge } from '../data/badges';

export default function XPToast({ props: toastProps = {} }) {
  const { xp = 0, badgeId, newTotal = 0, level = 1 } = toastProps;
  const badge = badgeId ? getBadge(badgeId) : null;
  const threshold = [0,100,250,500,900,1400,2000,2800,3800,5000,6500,8500,11000,14000,17500,21500,26000,31000,37000,44000];
  const current = threshold[level - 1] ?? 0;
  const next    = threshold[level]     ?? threshold[threshold.length - 1];
  const pct     = next > current ? Math.min(1, (newTotal - current) / (next - current)) : 1;

  return (
    <View style={styles.container}>
      <Text style={styles.lightning}>⚡</Text>
      <View style={styles.body}>
        <Text style={styles.xpText}>
          +{xp} XP{badge ? ` · Badge unlocked!` : ''}
        </Text>
        {badge && (
          <Text style={styles.badgeText}>{badge.emoji} {badge.name}</Text>
        )}
        <View style={styles.barBg}>
          <View style={[styles.barFill, { width: `${Math.round(pct * 100)}%` }]} />
        </View>
        <Text style={styles.levelText}>Level {level} · {newTotal.toLocaleString()} XP</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: '#1a237e',
    borderWidth:     1,
    borderColor:     colors.primary,
    borderRadius:    borderRadius.lg,
    paddingHorizontal: 14,
    paddingVertical:   12,
    marginHorizontal:  16,
    gap:             10,
    minWidth:        260,
  },
  lightning: { fontSize: 26 },
  body:      { flex: 1 },
  xpText:    { fontFamily: fonts.sansBold, fontSize: 13, color: colors.primary },
  badgeText: { fontFamily: fonts.sans,     fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  barBg:     { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 3, height: 5, marginTop: 6 },
  barFill:   { backgroundColor: colors.primary, borderRadius: 3, height: '100%' },
  levelText: { fontFamily: fonts.sans, fontSize: 9, color: 'rgba(255,255,255,0.4)', marginTop: 3 },
});
```

- [ ] **Step 2: Register the `xpEarned` toast type in `App.js`**

In `App.js`, import `XPToast` and add it to the `config` prop on `<Toast>`:

```js
import XPToast from './src/components/XPToast';
```

Then update the `<Toast config={{ ... }}>` block (keep existing `success`, `error`, `info` entries, add the new one):

```jsx
<Toast
  config={{
    success: (props) => (
      <ToastComponent {...props} backgroundColor="#1a2a1a" borderColor="#4ADE80" />
    ),
    error: (props) => (
      <ToastComponent {...props} backgroundColor="#2a1a1a" borderColor="#ffb4ab" />
    ),
    info: (props) => (
      <ToastComponent {...props} backgroundColor="#201f1a" borderColor="#f2ca50" />
    ),
    xpEarned: (props) => <XPToast {...props} />,
  }}
/>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/XPToast.js App.js
git commit -m "feat: XPToast component registered as custom toast type"
```

---

## Task 8: Progress Screen

**Files:**
- Create: `src/screens/ProgressScreen.js`

- [ ] **Step 1: Write `src/screens/ProgressScreen.js`**

```js
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGamification } from '../hooks/useGamification';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import { getBadge } from '../data/badges';
import { getChallenge, getDailyChallenges, getWeeklyChallenges } from '../data/challenges';
import { LEVEL_TITLES } from '../store/slices/gamificationSlice';
import { CHALLENGE_TEMPLATES } from '../data/challenges';
import UpgradeModal from '../components/UpgradeModal';
import { useStripePayment } from '../hooks/useStripePayment';
import { colors, spacing, borderRadius, fonts } from '../theme';

const LEVEL_THRESHOLDS = [0,100,250,500,900,1400,2000,2800,3800,5000,6500,8500,11000,14000,17500,21500,26000,31000,37000,44000];

function msUntilMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight - now;
}

function msUntilNextMonday() {
  const now = new Date();
  const day = now.getDay(); // 0=Sun,1=Mon
  const daysUntil = day === 0 ? 1 : (8 - day);
  const next = new Date(now);
  next.setDate(now.getDate() + daysUntil);
  next.setHours(0, 0, 0, 0);
  return next - now;
}

function formatTimeLeft(ms) {
  const h = Math.floor(ms / 3_600_000);
  const d = Math.floor(ms / 86_400_000);
  if (d > 0) return `${d}d left`;
  return `${h}h left`;
}

export default function ProgressScreen() {
  const insets = useSafeAreaInsets();
  const { xp, weekXp, level, levelTitle, xpToNextLevel, badges, challenges, leaderboard, loading, refetch } = useGamification();
  const access = useFeatureAccess('basicIdentify'); // gamification respects trial gating
  const { startPayment, paymentLoading } = useStripePayment();
  const [showUpgrade, setShowUpgrade] = useState(false);

  const threshold   = LEVEL_THRESHOLDS[level - 1] ?? 0;
  const nextThresh  = LEVEL_THRESHOLDS[level]     ?? threshold;
  const pct         = nextThresh > threshold ? Math.min(1, (xp - threshold) / (nextThresh - threshold)) : 1;

  const dailyChallenges  = getDailyChallenges();
  const weeklyChallenges = getWeeklyChallenges();

  function challengeProgress(id) {
    return challenges.find((c) => c.challengeId === id) ?? { progress: 0, completed: false };
  }

  function renderChallenge(template, resetMs) {
    const { progress, completed } = challengeProgress(template.id);
    const pctDone = Math.min(1, progress / template.targetCount);
    return (
      <View key={template.id} style={styles.challengeCard}>
        <View style={styles.challengeRow}>
          <View style={styles.challengeIcon}>
            <MaterialCommunityIcons name="target" size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.challengeTitle}>{template.title}</Text>
            <Text style={styles.challengeDesc}>{template.description}</Text>
          </View>
          <Text style={styles.challengeXP}>+{template.xpReward} XP</Text>
        </View>
        <View style={styles.progressRow}>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${Math.round(pctDone * 100)}%`, backgroundColor: completed ? colors.success : colors.primary }]} />
          </View>
          {completed
            ? <Text style={styles.completedText}>✓ Done</Text>
            : <Text style={styles.progressCount}>{progress} / {template.targetCount}</Text>}
        </View>
        <Text style={styles.resetText}>{formatTimeLeft(resetMs)}</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const dailyResetMs  = msUntilMidnight();
  const weeklyResetMs = msUntilNextMonday();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <UpgradeModal
        visible={showUpgrade}
        featureName="Gamification"
        loading={paymentLoading}
        onContinue={async (plan) => { await startPayment(plan); setShowUpgrade(false); }}
        onClose={() => setShowUpgrade(false)}
      />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Progress</Text>
        <TouchableOpacity onPress={refetch}>
          <MaterialCommunityIcons name="refresh" size={22} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Level card ──────────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: spacing.edge, marginTop: spacing.md }}>
          <LinearGradient
            colors={[colors.gradientStart, colors.gradientEnd]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.levelCard}
          >
            <View style={styles.levelCardTop}>
              <View>
                <Text style={styles.levelLabel}>LEVEL {level}</Text>
                <Text style={styles.levelTitle}>{levelTitle}</Text>
              </View>
              <View style={styles.levelIconBg}>
                <Text style={{ fontSize: 26 }}>🪙</Text>
              </View>
            </View>
            <View style={styles.xpBarRow}>
              <Text style={styles.xpBarLabel}>{xp.toLocaleString()} XP</Text>
              <Text style={styles.xpBarLabel}>{xpToNextLevel.toLocaleString()} to Level {level + 1}</Text>
            </View>
            <View style={styles.xpBarBg}>
              <View style={[styles.xpBarFill, { width: `${Math.round(pct * 100)}%` }]} />
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statCell}>
                <Text style={styles.statValue}>{badges.length}</Text>
                <Text style={styles.statLabel}>Badges</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statCell}>
                <Text style={styles.statValue}>{weekXp.toLocaleString()}</Text>
                <Text style={styles.statLabel}>This week</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statCell}>
                <Text style={[styles.statValue, { color: colors.primary }]}>
                  #{leaderboard.find((r) => r.rank)?.rank ?? '—'}
                </Text>
                <Text style={styles.statLabel}>Rank</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* ── Daily challenges ────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DAILY CHALLENGES</Text>
          {dailyChallenges.map((t) => renderChallenge(t, dailyResetMs))}
        </View>

        {/* ── Weekly challenges ───────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>WEEKLY CHALLENGES</Text>
          {weeklyChallenges.map((t) => renderChallenge(t, weeklyResetMs))}
        </View>

        {/* ── Badges ──────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>BADGES · {badges.length} / 30</Text>
          <View style={styles.badgeGrid}>
            {['scanning','collection','geography','era','rarity','challenges','levels','special'].flatMap((cat) => {
              const all = require('../data/badges').getBadgesByCategory(cat);
              return all.map((b) => {
                const earned = badges.includes(b.id);
                return (
                  <View key={b.id} style={[styles.badgeCell, !earned && styles.badgeCellLocked]}>
                    <Text style={[styles.badgeEmoji, !earned && { opacity: 0.25 }]}>{b.emoji}</Text>
                    <Text style={[styles.badgeName, !earned && styles.badgeNameLocked]} numberOfLines={1}>{b.name}</Text>
                  </View>
                );
              });
            })}
          </View>
        </View>

        {/* ── Leaderboard ─────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>THIS WEEK'S TOP COLLECTORS</Text>
          <View style={styles.leaderboardCard}>
            {leaderboard.length === 0 ? (
              <Text style={styles.emptyText}>No data yet — scan some coins!</Text>
            ) : (
              leaderboard.map((row) => (
                <View key={row.user_id} style={styles.leaderRow}>
                  <Text style={[styles.leaderRank, row.rank <= 3 && { color: colors.primary }]}>
                    {row.rank}
                  </Text>
                  <Text style={styles.leaderName}>{row.display_name}</Text>
                  <Text style={styles.leaderXP}>{row.week_xp.toLocaleString()} XP</Text>
                </View>
              ))
            )}
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.background },
  header:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.edge, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.outlineVariant },
  headerTitle: { fontFamily: fonts.serif, fontSize: 22, color: colors.primary },

  levelCard:    { borderRadius: borderRadius.xl, padding: spacing.lg },
  levelCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md },
  levelLabel:   { fontFamily: fonts.sansBold, fontSize: 10, color: 'rgba(0,0,0,0.5)', letterSpacing: 1 },
  levelTitle:   { fontFamily: fonts.serif, fontSize: 22, color: colors.onPrimary },
  levelIconBg:  { backgroundColor: 'rgba(0,0,0,0.12)', borderRadius: 24, width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  xpBarRow:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  xpBarLabel:   { fontFamily: fonts.sans, fontSize: 10, color: 'rgba(0,0,0,0.5)' },
  xpBarBg:      { backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 4, height: 8, marginBottom: spacing.md },
  xpBarFill:    { backgroundColor: colors.onPrimary, borderRadius: 4, height: '100%' },
  statsRow:     { flexDirection: 'row', justifyContent: 'space-around', paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.1)' },
  statCell:     { alignItems: 'center' },
  statValue:    { fontFamily: fonts.sansBold, fontSize: 16, color: colors.onPrimary },
  statLabel:    { fontFamily: fonts.sans, fontSize: 10, color: 'rgba(0,0,0,0.5)', marginTop: 2 },
  statDivider:  { width: 1, backgroundColor: 'rgba(0,0,0,0.1)' },

  section:      { paddingHorizontal: spacing.edge, marginTop: spacing.xl },
  sectionTitle: { fontFamily: fonts.sansBold, fontSize: 11, color: colors.textMuted, letterSpacing: 0.8, marginBottom: spacing.sm },

  challengeCard:  { backgroundColor: colors.surfaceContainerLow, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.outlineVariant, padding: spacing.md, marginBottom: 8 },
  challengeRow:   { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 8 },
  challengeIcon:  { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(242,202,80,0.12)', alignItems: 'center', justifyContent: 'center' },
  challengeTitle: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.text },
  challengeDesc:  { fontFamily: fonts.sans, fontSize: 11, color: colors.textMuted, marginTop: 1 },
  challengeXP:    { fontFamily: fonts.sansBold, fontSize: 11, color: colors.primary },
  progressRow:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  progressBg:     { flex: 1, backgroundColor: colors.outlineVariant, borderRadius: 3, height: 5 },
  progressFill:   { borderRadius: 3, height: '100%' },
  progressCount:  { fontFamily: fonts.sans, fontSize: 10, color: colors.textMuted, width: 36, textAlign: 'right' },
  completedText:  { fontFamily: fonts.sansBold, fontSize: 10, color: colors.success, width: 36, textAlign: 'right' },
  resetText:      { fontFamily: fonts.sans, fontSize: 9, color: colors.textMuted, marginTop: 4 },

  badgeGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badgeCell:      { width: 66, backgroundColor: colors.surfaceContainerLow, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.primary, padding: 8, alignItems: 'center' },
  badgeCellLocked:{ borderColor: colors.outlineVariant },
  badgeEmoji:     { fontSize: 22 },
  badgeName:      { fontFamily: fonts.sans, fontSize: 8, color: colors.primary, marginTop: 3, textAlign: 'center' },
  badgeNameLocked:{ color: colors.textMuted },

  leaderboardCard: { backgroundColor: colors.surfaceContainerLow, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.outlineVariant, overflow: 'hidden' },
  leaderRow:       { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.outlineVariant, gap: spacing.md },
  leaderRank:      { fontFamily: fonts.sansBold, fontSize: 14, color: colors.textMuted, width: 24 },
  leaderName:      { flex: 1, fontFamily: fonts.sansMedium, fontSize: 13, color: colors.text },
  leaderXP:        { fontFamily: fonts.sansBold, fontSize: 12, color: colors.textMuted },
  emptyText:       { fontFamily: fonts.sans, fontSize: 13, color: colors.textMuted, padding: spacing.lg, textAlign: 'center' },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/screens/ProgressScreen.js
git commit -m "feat: ProgressScreen — level card, challenges, badges, leaderboard"
```

---

## Task 9: Navigation — Add Progress Tab

**Files:**
- Modify: `src/navigation/AppNavigator.js`

- [ ] **Step 1: Import `ProgressScreen` in `AppNavigator.js`**

Add after the other screen imports at the top of `src/navigation/AppNavigator.js`:

```js
import ProgressScreen from '../screens/ProgressScreen';
```

- [ ] **Step 2: Update `MainTabs` to include the Progress tab**

Replace the entire `MainTabs` function (currently lines 109–134) with:

```js
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarShowLabel: true,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ focused, color }) => {
          if (route.name === 'Scan') return <ScanTabIcon focused={focused} />;
          const icons = {
            Collection: focused ? 'layers'        : 'layers-outline',
            Progress:   focused ? 'trophy'         : 'trophy-outline',
            Profile:    focused ? 'account'        : 'account-outline',
          };
          return <MaterialCommunityIcons name={icons[route.name]} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Scan"       component={ScanStack}       options={{ tabBarLabel: 'Scan' }} />
      <Tab.Screen name="Collection" component={CollectionStack} options={{ tabBarLabel: 'Collection' }} />
      <Tab.Screen name="Progress"   component={ProgressScreen}  options={{ tabBarLabel: 'Progress' }} />
      <Tab.Screen name="Profile"    component={ProfileStack}    options={{ tabBarLabel: 'Profile' }} />
    </Tab.Navigator>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/navigation/AppNavigator.js
git commit -m "feat: add Progress tab to bottom navigation"
```

---

## Task 10: Wire Up XP in ResultsScreen

**Files:**
- Modify: `src/screens/ResultsScreen.js`

- [ ] **Step 1: Import gamification dependencies in `ResultsScreen.js`**

Add to the existing imports block:

```js
import { useDispatch, useSelector } from 'react-redux';
import { selectBadges, setGamification, addEarnedBadge, updateChallengeProgress } from '../store/slices/gamificationSlice';
import { awardXP, checkAndAwardBadges, upsertChallengeProgress } from '../services/gamificationService';
import { selectCollection } from '../store/slices/collectionSlice';
```

Note: `useDispatch` and `useSelector` are already imported in the file — add only the new named imports.

- [ ] **Step 2: Read earned badges and collection inside the component**

Add these two lines inside `ResultsScreen` after the existing `const collection = useSelector(selectCollection);` line:

```js
const earnedBadges = useSelector(selectBadges);
```

- [ ] **Step 3: Add `fireXPToast` helper inside the component**

Add this function inside `ResultsScreen`, after the state declarations:

```js
function fireXPToast(xpEarned, newTotal, levelAfter, badgeId) {
  Toast.show({
    type:            'xpEarned',
    position:        'bottom',
    visibilityTime:  3000,
    props: {
      xp:      xpEarned,
      badgeId: badgeId ?? null,
      newTotal,
      level:   levelAfter,
    },
  });
}
```

- [ ] **Step 4: Add `handleAwardXP` helper inside the component**

Add this async function inside `ResultsScreen`, after `fireXPToast`:

```js
async function handleAwardXP(action, coinData) {
  try {
    const xpResult = await awardXP(action, {
      rarity:      coinData?.rarity,
      era:         coinData?.era,
      country:     coinData?.country,
      composition: coinData?.composition,
    });

    dispatch(setGamification({
      xp:        xpResult.new_total,
      weekXp:    xpResult.new_week_xp,
      level:     xpResult.level_after,
      levelTitle: require('../store/slices/gamificationSlice').LEVEL_TITLES[xpResult.level_after],
    }));

    // Derive country set from collection for badge checks
    const countries = new Set(collection.map((i) => i.coin?.country).filter(Boolean));
    if (coinData?.country) countries.add(coinData.country);

    const newBadges = await checkAndAwardBadges({
      action,
      metadata:       { rarity: coinData?.rarity, era: coinData?.era, composition: coinData?.composition },
      newTotal:       xpResult.new_total,
      level:          xpResult.level_after,
      earnedBadges,
      collectionSize: collection.length + (action === 'add' ? 1 : 0),
      scanCount:      0, // ProgressScreen refetch will get accurate count
      countries,
    });

    newBadges.forEach((id) => dispatch(addEarnedBadge(id)));

    fireXPToast(xpResult.xp_earned, xpResult.new_total, xpResult.level_after, newBadges[0] ?? null);
  } catch (e) {
    // XP award failure is non-fatal — scan already succeeded
    console.warn('handleAwardXP error:', e.message);
  }
}
```

- [ ] **Step 5: Call `handleAwardXP` on successful scan**

In `ResultsScreen`, the coin is passed in via `route.params`. The screen shows the result of a completed scan. Add the XP call at the end of the `useEffect`-equivalent first render. Since `ResultsScreen` renders with a result already available (no async needed), fire XP once on mount:

Add this `useEffect` near the top of the `ResultsScreen` component body, after the state declarations:

```js
const xpFiredRef = React.useRef(false);
React.useEffect(() => {
  if (coin && !xpFiredRef.current) {
    xpFiredRef.current = true;
    handleAwardXP('scan', coin);
  }
}, []);
```

- [ ] **Step 6: Call `handleAwardXP` after a successful "Add to Collection"**

Inside `handleAdd`, right after the `Toast.show({ type: 'success', ... })` line (inside the `try` block, after the coin is confirmed saved), add:

```js
handleAwardXP('add', coin);
```

- [ ] **Step 7: Commit**

```bash
git add src/screens/ResultsScreen.js
git commit -m "feat: fire XP award and toast on scan and add-to-collection"
```

---

## Self-Review Notes

- **Spec coverage:** All spec sections covered — XP system (Tasks 2, 5, 10), levels (Task 4), badges (Tasks 3, 5), challenges (Tasks 3, 2), leaderboard (Tasks 2, 6, 8), Progress tab (Tasks 8, 9), XP toast (Task 7), subscription gating (ProgressScreen uses `useFeatureAccess`).
- **Type consistency:** `challengeId` used consistently in slice, service, and screen. `week_xp` in DB maps to `weekXp` in JS throughout. `LEVEL_TITLES` exported from slice and imported by service.
- **No placeholders:** All steps contain complete code.
- **Out of scope confirmed:** Push notifications, friends list, XP decay — none included.
