# Gamification System — Design Spec
**Date:** 2026-06-02  
**Status:** Approved for implementation

---

## Overview

Add a full progression system to CoinSeek that makes scanning and collecting feel rewarding and competitive. The system has three interlocking layers: XP + levels (always-on progression), badges (milestone rewards), and challenges + leaderboard (active engagement loop). Gamification is visible to all users including those on free trial; expired users see their progress but hit the existing upgrade gate to earn more XP.

---

## Architecture

### New files
| Path | Purpose |
|---|---|
| `src/screens/ProgressScreen.js` | Full hub: level card, challenges, badges, leaderboard |
| `src/components/XPToast.js` | Animated toast shown after XP-earning actions |
| `src/hooks/useGamification.js` | Fetches and subscribes to XP, badges, challenge progress |
| `src/services/gamificationService.js` | All Supabase calls for the gamification system |
| `src/store/slices/gamificationSlice.js` | Redux slice caching XP, level, badges |
| `src/data/badges.js` | Static badge definitions (id, emoji, name, criteria) |
| `src/data/challenges.js` | Static challenge templates (daily + weekly) |

### Modified files
| Path | Change |
|---|---|
| `src/navigation/AppNavigator.js` | Add "Progress" as 4th bottom tab |
| `src/screens/ResultsScreen.js` | Call `awardXP('scan', coinData)` after identification |
| `src/screens/CollectionScreen.js` | Call `awardXP('add', coinData)` when coin is saved |

---

## Database Schema (Supabase)

### Tables

```sql
-- XP and level per user
create table public.user_xp (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  total_xp    int  not null default 0,
  level       int  not null default 1,
  updated_at  timestamptz not null default now()
);

-- Earned badges
create table public.user_badges (
  user_id    uuid references auth.users(id) on delete cascade,
  badge_id   text not null,
  earned_at  timestamptz not null default now(),
  primary key (user_id, badge_id)
);

-- Challenge definitions (seeded, not user-generated)
create table public.challenges (
  id              text primary key,
  type            text not null check (type in ('daily','weekly')),
  title           text not null,
  description     text not null,
  xp_reward       int  not null,
  target_count    int  not null,
  target_criteria jsonb        -- e.g. {"country":"*"} or {"rarity":"rare"}
);

-- Per-user challenge progress, reset each cycle
create table public.user_challenges (
  user_id       uuid references auth.users(id) on delete cascade,
  challenge_id  text references public.challenges(id),
  progress      int  not null default 0,
  completed_at  timestamptz,
  cycle_start   date not null,  -- Monday for weekly, today for daily
  primary key (user_id, challenge_id, cycle_start)
);
```

### RPC: `award_xp`

XP is awarded via a server-side RPC so the client can never write XP directly (prevents cheating). The function increments `total_xp`, recalculates `level`, checks badge criteria, and returns a result object.

```sql
-- Signature (implementation in migration)
create or replace function public.award_xp(
  p_action   text,   -- 'scan' | 'add' | 'daily_challenge' | 'weekly_challenge'
  p_metadata jsonb   -- e.g. {"rarity":"rare","country":"US","era":"ancient"}
)
returns jsonb  -- { xp_earned, new_total, level_before, level_after, badges_unlocked[] }
language plpgsql security definer
```

### RLS

- `user_xp`: users read own row; no direct client writes (RPC only)
- `user_badges`: users read own rows; no direct client writes
- `user_challenges`: users read own rows; no direct client writes
- Leaderboard: read-only view joining `user_xp` with `profiles(display_name)`

---

## XP Values

| Action | XP |
|---|---|
| Scan any coin | +10 |
| Add coin to collection | +20 |
| Scan a rare/ancient coin (bonus, stacks with base scan) | +50 |
| Complete daily challenge | +25 |
| Complete weekly challenge | +100 |

A rare scan earns +10 (base) + +50 (bonus) = **+60 XP total**. Rare bonus applies when the coin's `rarity` field is `'rare'` or `'legendary'`, or `era` is `'ancient'` (from `mockCoins.js` / future AI response).

---

## Levels (20 total)

| Level | Title | XP threshold |
|---|---|---|
| 1 | Pocket Change | 0 |
| 2 | Penny Picker | 100 |
| 3 | Nickel Novice | 250 |
| 4 | Dime Dropper | 500 |
| 5 | Quarter Master | 900 |
| 6 | Dollar Digger | 1,400 |
| 7 | Silver Hoarder | 2,000 |
| 8 | Gold Hunter | 2,800 |
| 9 | Bronze Age | 3,800 |
| 10 | Silver Scholar | 5,000 |
| 11 | Gold Expert | 6,500 |
| 12 | Coin Whisperer | 8,500 |
| 13 | Numismatist | 11,000 |
| 14 | Ancient Seeker | 14,000 |
| 15 | Relic Hunter | 17,500 |
| 16 | Museum Worthy | 21,500 |
| 17 | Vault Keeper | 26,000 |
| 18 | Grand Collector | 31,000 |
| 19 | Legendary Hoarder | 37,000 |
| 20 | Master Numismatist | 44,000 |

---

## Badges (30 total)

### Scanning
| ID | Emoji | Name | Criteria |
|---|---|---|---|
| `first_scan` | 📷 | First Scan | Scan 1 coin |
| `warm_up` | 🔥 | Warm Up | Scan 10 coins |
| `century_scanner` | 💯 | Century Scanner | Scan 100 coins |
| `scan_master` | 🎖️ | Scan Master | Scan 500 coins |

### Collection
| ID | Emoji | Name | Criteria |
|---|---|---|---|
| `starting_out` | 🌱 | Starting Out | Add 1 coin to collection |
| `growing_collection` | 📦 | Growing Collection | Add 10 coins |
| `serious_collector` | 🏛️ | Serious Collector | Add 50 coins |
| `century_collection` | 🗄️ | Century Collection | Add 100 coins |

### Geography
| ID | Emoji | Name | Criteria |
|---|---|---|---|
| `world_traveler` | 🌍 | World Traveler | Coins from 5 countries |
| `global_citizen` | 🌐 | Global Citizen | Coins from 10 countries |
| `euro_explorer` | 🇪🇺 | Euro Explorer | Coins from 5 European countries |

### Era & Material
| ID | Emoji | Name | Criteria |
|---|---|---|---|
| `ancient_history` | 🏛️ | Ancient History | Scan a Roman/ancient coin |
| `silver_age` | 🌕 | Silver Age | Scan a silver coin |
| `gold_standard` | 🥇 | Gold Standard | Scan a gold coin |
| `medieval_times` | ⚔️ | Medieval Times | Scan a medieval coin |
| `modern_era` | 🏭 | Modern Era | Scan 10 post-1900 coins |

### Rarity
| ID | Emoji | Name | Criteria |
|---|---|---|---|
| `rare_find` | 💎 | Rare Find | Scan 1 rare coin |
| `legendary_hunter` | 👑 | Legendary Hunter | Scan 1 legendary coin |
| `rarity_seeker` | 🔍 | Rarity Seeker | Scan 5 rare or legendary coins |

### Challenges
| ID | Emoji | Name | Criteria |
|---|---|---|---|
| `challenge_accepted` | 🎯 | Challenge Accepted | Complete first challenge |
| `weekly_warrior` | ⚔️ | Weekly Warrior | Complete 4 weekly challenges |
| `daily_devotion` | 📅 | Daily Devotion | Complete 7 daily challenges |
| `streak_7` | 🔥 | On Fire | 7-day scan streak |

### Levels (milestone unlocks)
| ID | Emoji | Name | Criteria |
|---|---|---|---|
| `level_5` | ⭐ | Rising Star | Reach level 5 |
| `level_10` | 🌟 | Expert Eye | Reach level 10 |
| `level_15` | 💫 | Elite Collector | Reach level 15 |
| `level_20` | 🏆 | Master | Reach level 20 |

---

## Challenges

### Daily (resets midnight local time)
| ID | Title | Goal | XP |
|---|---|---|---|
| `daily_scan` | Daily Scanner | Scan 1 coin | +25 |
| `daily_add` | Quick Collector | Add 1 coin to collection | +25 |

### Weekly (resets Monday 00:00 UTC)
| ID | Title | Goal | XP |
|---|---|---|---|
| `weekly_scan_5` | Active Week | Scan 5 coins | +75 |
| `weekly_countries_3` | World Traveler | Scan coins from 3 different countries | +100 |
| `weekly_add_3` | Collection Builder | Add 3 coins to collection | +100 |
| `weekly_rare` | Rare Finder | Scan 1 rare or legendary coin | +150 |

---

## UI Components

### ProgressScreen layout
1. **Level card** — gradient header with level number, title, XP bar, and 3 stat chips (scans, badges, global rank)
2. **Active Challenges section** — daily + weekly cards with progress bars and time-until-reset
3. **Recent Badges section** — horizontal scroll of earned badges; locked badges shown at reduced opacity
4. **Leaderboard section** — top 3 + the current user's row (weekly XP ranking, resets Monday)

### XPToast component
- Triggered by calling `showXPToast({ xp, badgesUnlocked, newTotal, level })` from results/collection screens
- Implemented as a `react-native-toast-message` custom type (the app already uses this library — no new dependency needed)
- Two variants: plain (`+10 XP` with mini bar update) and badge-unlock (larger card with badge emoji + name)
- Auto-dismisses after 3 seconds

### Navigation change
Add a 4th tab between Collection and Profile:
```
Scan | Collection | Progress | Profile
```
Tab icon: `trophy-outline` (unfocused) / `trophy` (focused), tint color `colors.primary`.

---

## Subscription Gating

Gamification follows the existing `hasSubscription` pattern from `useFeatureAccess`:

- **Trial active** — full access, all features work
- **Trial expired / not subscribed** — Progress tab is visible and shows existing earned data (XP, badges) read-only. Tapping "Claim Challenge Reward" or the leaderboard triggers the existing `UpgradeModal`. New XP is not awarded until upgraded.
- This is consistent with how scan limits already work and requires no new gating infrastructure.

---

## Data Flow

```
User scans coin
  → ResultsScreen receives AI result
  → calls gamificationService.awardXP('scan', { rarity, country, era })
  → Supabase RPC award_xp runs server-side
  → returns { xp_earned, new_total, level_after, badges_unlocked }
  → dispatch(setGamification({ xp, level, badges })) updates Redux
  → showXPToast fires with returned data
  → ProgressScreen (if mounted) re-renders via useGamification hook
```

---

## Out of Scope

- Push notifications for challenge deadlines (can be added later via existing `notificationService`)
- Friends list / follow system (leaderboard is global-only for now)
- Coin trading or marketplace
- XP decay or seasonal resets
