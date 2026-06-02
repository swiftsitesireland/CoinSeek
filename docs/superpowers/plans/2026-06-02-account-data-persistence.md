# Account Data Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the coin collection and daily scan count durable and account-bound — server is source of truth, re-fetched on load — so an Expo reload no longer wipes them, exactly as XP already behaves.

**Architecture:** Unify the collection onto a single JSONB-backed `user_coins` table with RLS (one service, `collectionService.js`), add offline-first rehydration with a local-cache fallback, and replace the local-only scan counter with a server-authoritative read (`get_daily_scan_status` RPC) plus the `scansRemaining` the edge function already returns.

**Tech Stack:** React Native / Expo, Redux Toolkit, Supabase (Postgres + RPC + RLS), AsyncStorage, SecureStore, Jest (jest-expo).

**Spec:** `docs/superpowers/specs/2026-06-02-account-data-persistence-design.md`

**Branch:** `feature/account-persistence-impl`

---

## Reconciliation amendment (post-favourites merge, 2026-06-02)

The favourites feature merged to master before implementation and added
`collectionSyncMiddleware` (`src/store/middleware/collectionSync.js`), which already
routes `addToCollection` / `updateCollectionItem` / `removeFromCollection` →
`collectionService.upsertCoin` / `deleteCoin` (JSONB). That middleware is now the
single remote-write path for collection mutations. The plan below is adjusted to
build on it. Where this amendment conflicts with a task body, the amendment wins.

- **Task 1:** `user_coins.id` is **TEXT** (client-generated ids from the slice's
  `localId()`), **not UUID** — a server-generated UUID PK would break the middleware's
  client-id upserts. Drop `gen_random_uuid()`; keep JSONB `coin` + RLS.
- **Task 3:** Do **not** remove `upsertCoin` (middleware depends on it) and do **not**
  add `addCoin` / `flushPendingLocalCoins` / `local_` logic. Keep the existing
  `upsertCoin`, `deleteCoin`, `fetchUserCoins`; only **add** the pure
  `mergeCollections(remote, local)` helper + its test. `itemToRow` keeps `id`.
- **Task 4:** `useCollectionSync` — load cache, fetch remote, `mergeCollections`,
  re-`upsertCoin` any local-only items (cache ids missing from remote), dispatch
  merged, `saveCollection`. (No `local_` flush mapping — ids are stable.)
- **Task 5:** `ResultsScreen.handleAdd` — replace `addCoin`(coinService) + `setCollection`
  with `dispatch(addToCollection(entry))` (middleware upserts JSONB), then
  `saveCollection` from new state; keep XP + success toast; drop the `__syncPending`
  branch and the `addCoin` import. `CollectionScreen` — repoint `deleteCoin` import to
  `collectionService` and replace the `getUserCoins` load with `fetchUserCoins` + cache
  fallback.
- **Tasks 2, 6, 7 (scan count):** unchanged — favourites did not touch them.
- **Task 8:** unchanged — delete `coinService.js` once the two screens stop importing it.

---

## File Structure

| File | Responsibility | Change |
|---|---|---|
| `supabase/migrations/20260602180000_user_coins.sql` | Authoritative `user_coins` table (JSONB `coin`) + RLS | Create |
| `supabase/migrations/20260602190000_scan_status.sql` | Read-only `get_daily_scan_status()` RPC | Create |
| `src/services/collectionService.js` | Single collection persistence path (JSONB) + pure merge helper | Modify |
| `src/hooks/useCollectionSync.js` | Offline-first rehydration at startup | Modify |
| `src/screens/ResultsScreen.js` | Add-to-collection via collectionService | Modify |
| `src/screens/CollectionScreen.js` | Load/delete via collectionService + local fallback | Modify |
| `src/services/coinIdentification.js` | Surface `scansRemaining` from edge response | Modify |
| `src/hooks/useScanLimit.js` | Server-backed count + UTC reset + pure helpers | Modify |
| `src/screens/CameraScreen.js` | Sync scan count from server response | Modify |
| `src/services/coinService.js` | Retire (remove after consumers migrated) | Delete |
| `src/__tests__/services/collectionService.test.js` | Test `mergeCollections` | Create |
| `src/__tests__/hooks/scanLimitHelpers.test.js` | Test `usedFromRemaining`, `msUntilUtcMidnight` | Create |

---

## Task 1: Migration — `user_coins` table + RLS

**Files:**
- Create: `supabase/migrations/20260602180000_user_coins.sql`

- [ ] **Step 1: Write the migration**

```sql
-- ─── Coin collection ─────────────────────────────────────────────────────────
-- Authoritative definition of user_coins. The table was previously hand-created
-- with no migration, and two client services disagreed on its schema (flat
-- columns vs a JSONB `coin`). We standardize on JSONB so the FULL coin object —
-- including description/obverse/reverse/designer/series/tags — round-trips.
-- Clean cutover: existing dev rows are not migrated.

CREATE TABLE IF NOT EXISTS public.user_coins (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coin            JSONB NOT NULL,
  quantity        INTEGER NOT NULL DEFAULT 1,
  condition       TEXT,
  purchase_price  NUMERIC,
  notes           TEXT DEFAULT '',
  date_added      TIMESTAMPTZ NOT NULL DEFAULT now(),
  front_image_uri TEXT,
  back_image_uri  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Idempotent column adds in case a divergent hand-made table already exists.
ALTER TABLE public.user_coins ADD COLUMN IF NOT EXISTS coin            JSONB;
ALTER TABLE public.user_coins ADD COLUMN IF NOT EXISTS quantity        INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.user_coins ADD COLUMN IF NOT EXISTS condition       TEXT;
ALTER TABLE public.user_coins ADD COLUMN IF NOT EXISTS purchase_price  NUMERIC;
ALTER TABLE public.user_coins ADD COLUMN IF NOT EXISTS notes           TEXT DEFAULT '';
ALTER TABLE public.user_coins ADD COLUMN IF NOT EXISTS date_added      TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.user_coins ADD COLUMN IF NOT EXISTS front_image_uri TEXT;
ALTER TABLE public.user_coins ADD COLUMN IF NOT EXISTS back_image_uri  TEXT;
ALTER TABLE public.user_coins ADD COLUMN IF NOT EXISTS created_at      TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.user_coins ADD COLUMN IF NOT EXISTS updated_at      TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS user_coins_user_date_idx
  ON public.user_coins (user_id, date_added DESC);

-- ─── RLS: each user CRUDs only their own coins ───────────────────────────────
ALTER TABLE public.user_coins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_coins_select ON public.user_coins;
CREATE POLICY user_coins_select ON public.user_coins
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS user_coins_insert ON public.user_coins;
CREATE POLICY user_coins_insert ON public.user_coins
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS user_coins_update ON public.user_coins;
CREATE POLICY user_coins_update ON public.user_coins
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS user_coins_delete ON public.user_coins;
CREATE POLICY user_coins_delete ON public.user_coins
  FOR DELETE USING (auth.uid() = user_id);
```

- [ ] **Step 2: Apply the migration**

Run: `supabase db push` (or paste into the Supabase SQL editor).
Expected: no errors; `user_coins` exists with RLS enabled and 4 policies.

- [ ] **Step 3: Verify schema and RLS**

Run in SQL editor:
```sql
SELECT column_name FROM information_schema.columns WHERE table_name = 'user_coins' ORDER BY column_name;
SELECT polname FROM pg_policy WHERE polrelid = 'public.user_coins'::regclass;
```
Expected: columns include `coin`, `date_added`, `front_image_uri`; policies list the 4 `user_coins_*`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260602180000_user_coins.sql
git commit -m "feat: add authoritative user_coins migration with JSONB coin and RLS"
```

---

## Task 2: Migration — `get_daily_scan_status()` RPC

**Files:**
- Create: `supabase/migrations/20260602190000_scan_status.sql`

- [ ] **Step 1: Write the migration**

```sql
-- ─── Read-only daily scan status ─────────────────────────────────────────────
-- Lets the CLIENT read its authoritative remaining-scan count on load (like XP),
-- WITHOUT consuming a scan. The daily_scans table is service-role only, so this
-- SECURITY DEFINER function is the safe, narrow read path. Uses auth.uid() so a
-- caller can only ever see their own count. Limit (3) matches MAX_FREE_SCANS and
-- check_and_increment_daily_scan.
CREATE OR REPLACE FUNCTION public.get_daily_scan_status()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit      CONSTANT INTEGER := 3;
  v_today      DATE := (now() AT TIME ZONE 'utc')::date;
  v_uid        UUID := auth.uid();
  v_is_premium BOOLEAN;
  v_count      INTEGER;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.user_id = v_uid AND s.status = 'active'
  ) INTO v_is_premium;

  IF v_is_premium THEN
    RETURN jsonb_build_object(
      'is_premium', true, 'scans_used', 0,
      'scans_remaining', -1, 'scan_limit', v_limit);
  END IF;

  SELECT count INTO v_count
  FROM public.daily_scans
  WHERE user_id = v_uid AND scan_date = v_today;

  v_count := COALESCE(v_count, 0);

  RETURN jsonb_build_object(
    'is_premium', false,
    'scans_used', v_count,
    'scans_remaining', GREATEST(v_limit - v_count, 0),
    'scan_limit', v_limit);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_daily_scan_status() TO authenticated;
```

- [ ] **Step 2: Apply the migration**

Run: `supabase db push` (or SQL editor).
Expected: function created, execute granted.

- [ ] **Step 3: Verify as an authenticated user**

In the SQL editor (or via the app once wired): `SELECT public.get_daily_scan_status();` while authenticated.
Expected: JSON like `{"is_premium":false,"scans_used":0,"scans_remaining":3,"scan_limit":3}`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260602190000_scan_status.sql
git commit -m "feat: add read-only get_daily_scan_status RPC for client scan count"
```

---

## Task 3: collectionService — JSONB add/fetch/flush + pure merge helper

**Files:**
- Modify: `src/services/collectionService.js`
- Test: `src/__tests__/services/collectionService.test.js`

- [ ] **Step 1: Write the failing test for `mergeCollections`**

Create `src/__tests__/services/collectionService.test.js`:
```js
import { mergeCollections } from '../../services/collectionService';

describe('mergeCollections', () => {
  it('returns remote when there are no local-only items', () => {
    const remote = [{ id: 'a' }, { id: 'b' }];
    const local  = [{ id: 'a' }];
    expect(mergeCollections(remote, local)).toEqual(remote);
  });

  it('appends local-only (sync-pending) items not present remotely', () => {
    const remote = [{ id: 'a' }];
    const local  = [{ id: 'a' }, { id: 'local_123', __syncPending: true }];
    expect(mergeCollections(remote, local)).toEqual([
      { id: 'a' },
      { id: 'local_123', __syncPending: true },
    ]);
  });

  it('returns local when remote is empty', () => {
    const local = [{ id: 'local_1' }, { id: 'x' }];
    expect(mergeCollections([], local)).toEqual(local);
  });

  it('tolerates non-array inputs', () => {
    expect(mergeCollections(null, undefined)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- collectionService`
Expected: FAIL — `mergeCollections is not a function`.

- [ ] **Step 3: Rewrite `collectionService.js`**

Replace the entire file contents with:
```js
import { supabase } from '../config/supabase';

/** Convert a Supabase row → Redux collection item shape */
function rowToItem(row) {
  return {
    id:            row.id,
    coin:          row.coin,
    quantity:      row.quantity ?? 1,
    condition:     row.condition ?? '',
    purchasePrice: row.purchase_price ?? 0,
    notes:         row.notes ?? '',
    dateAdded:     row.date_added,
    frontImageUri: row.front_image_uri ?? null,
    backImageUri:  row.back_image_uri  ?? null,
  };
}

/** Redux item → row WITHOUT id (server generates it on insert) */
function itemToInsertRow(userId, item) {
  return {
    user_id:         userId,
    coin:            item.coin,
    quantity:        item.quantity ?? 1,
    condition:       item.condition ?? null,
    purchase_price:  item.purchasePrice ?? null,
    notes:           item.notes ?? '',
    date_added:      item.dateAdded ?? new Date().toISOString(),
    front_image_uri: item.frontImageUri ?? null,
    back_image_uri:  item.backImageUri  ?? null,
  };
}

const isLocalId = (id) => String(id).startsWith('local_');
const localId   = () => `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

/**
 * Merge server rows with any local-only (sync-pending) items so offline adds
 * are never dropped. Pure + side-effect free for testability.
 */
export function mergeCollections(remote, local) {
  const r = Array.isArray(remote) ? remote : [];
  const l = Array.isArray(local)  ? local  : [];
  const remoteIds = new Set(r.map((i) => i.id));
  const localOnly = l.filter((i) => !remoteIds.has(i.id));
  return [...r, ...localOnly];
}

/** Fetch all coins for a user. Returns [] on error (caller falls back to cache). */
export async function fetchUserCoins(userId) {
  const { data, error } = await supabase
    .from('user_coins')
    .select('*')
    .eq('user_id', userId)
    .order('date_added', { ascending: false });

  if (error) {
    console.warn('fetchUserCoins error:', error.message);
    return [];
  }
  return (data ?? []).map(rowToItem);
}

/**
 * Insert a new coin. On success returns the server row (real uuid id).
 * On failure returns a local_ record flagged __syncPending so the UI keeps it
 * and a later flush re-tries the insert.
 */
export async function addCoin(userId, item) {
  try {
    const { data, error } = await supabase
      .from('user_coins')
      .insert(itemToInsertRow(userId, item))
      .select()
      .single();
    if (error) throw error;
    return rowToItem(data);
  } catch (e) {
    console.warn('addCoin fell back to local record:', e.message);
    return {
      id: localId(),
      ...item,
      dateAdded: item.dateAdded || new Date().toISOString(),
      __syncPending: true,
    };
  }
}

/** Delete a coin. Skips the remote call for local-only records. */
export async function deleteCoin(itemId) {
  if (isLocalId(itemId)) return;
  const { error } = await supabase.from('user_coins').delete().eq('id', itemId);
  if (error) console.warn('deleteCoin error:', error.message);
}

/**
 * Insert any local_-prefixed pending items for this user. Returns a mapping
 * [{ old, new }] of local id → server item so callers can swap ids in Redux
 * and the AsyncStorage cache.
 */
export async function flushPendingLocalCoins(userId, items) {
  const pending = (items ?? []).filter((i) => isLocalId(i.id));
  const synced = [];
  for (const item of pending) {
    try {
      const { data, error } = await supabase
        .from('user_coins')
        .insert(itemToInsertRow(userId, item))
        .select()
        .single();
      if (error) throw error;
      synced.push({ old: item.id, new: rowToItem(data) });
    } catch {
      // leave pending — retry next sync
    }
  }
  return synced;
}

/** Delete ALL coins for a user (logout / account deletion). */
export async function deleteAllUserCoins(userId) {
  const { error } = await supabase.from('user_coins').delete().eq('user_id', userId);
  if (error) console.warn('deleteAllUserCoins error:', error.message);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- collectionService`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/services/collectionService.js src/__tests__/services/collectionService.test.js
git commit -m "feat: unify collection persistence on JSONB collectionService with merge helper"
```

---

## Task 4: useCollectionSync — offline-first rehydration

**Files:**
- Modify: `src/hooks/useCollectionSync.js`

- [ ] **Step 1: Rewrite the hook**

Replace the file contents with:
```js
/**
 * Offline-first collection rehydration. On login:
 *   1. Paint the AsyncStorage cache immediately (instant, survives empty server).
 *   2. Fetch remote, flush any sync-pending local_ coins, merge, dispatch.
 *   3. Write the merged set back to the cache.
 * Call once inside AppNavigator (inside the Redux Provider).
 */
import { useEffect } from 'react';
import { useDispatch, useStore } from 'react-redux';
import { useAuth } from '../auth/AuthContext';
import { setCollection } from '../store/slices/collectionSlice';
import {
  fetchUserCoins, flushPendingLocalCoins, mergeCollections,
} from '../services/collectionService';
import { loadCollection, saveCollection } from '../services/storage';

export function useCollectionSync() {
  const dispatch = useDispatch();
  const store    = useStore();
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    (async () => {
      // 1. Instant paint from local cache.
      const cached = await loadCollection();
      if (cancelled) return;
      if (cached.length) dispatch(setCollection(cached));

      try {
        // 2. Flush sync-pending local coins, then fetch the authoritative list.
        const localNow = store.getState().collection.items;
        const synced   = await flushPendingLocalCoins(user.id, localNow);
        const remote   = await fetchUserCoins(user.id);
        if (cancelled) return;

        // Local items that are still pending (failed to flush this round).
        const syncedOld = new Set(synced.map((s) => s.old));
        const stillPending = store.getState().collection.items.filter(
          (i) => String(i.id).startsWith('local_') && !syncedOld.has(i.id),
        );

        const merged = mergeCollections(remote, stillPending);
        dispatch(setCollection(merged));
        await saveCollection(merged);
      } catch (e) {
        if (!cancelled) console.warn('useCollectionSync error:', e.message);
        // Cache already painted in step 1, so nothing is lost on failure.
      }
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);
}
```

- [ ] **Step 2: Verify the test suite still passes**

Run: `npm test`
Expected: PASS (no regressions; collectionService tests green).

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useCollectionSync.js
git commit -m "feat: offline-first collection rehydration with local cache fallback"
```

---

## Task 5: ResultsScreen + CollectionScreen — use collectionService

**Files:**
- Modify: `src/screens/ResultsScreen.js`
- Modify: `src/screens/CollectionScreen.js`

- [ ] **Step 1: Update ResultsScreen import**

In `src/screens/ResultsScreen.js`, change:
```js
import { addCoin } from '../services/coinService';
```
to:
```js
import { addCoin } from '../services/collectionService';
```

- [ ] **Step 2: Update the addCoin call signature in ResultsScreen**

`collectionService.addCoin` takes `(userId, item)` (not `(item, userId)`). In `handleAdd`, change:
```js
      const saved = await addCoin(entry, user.id);
```
to:
```js
      const saved = await addCoin(user.id, entry);
```
(Leave the surrounding `dispatch(setCollection(updatedCollection))`, `saveCollection`, and `__syncPending` toast logic unchanged — the returned shape is compatible.)

- [ ] **Step 3: Update CollectionScreen imports**

In `src/screens/CollectionScreen.js`, change:
```js
import { deleteCoin, getUserCoins } from '../services/coinService';
```
to:
```js
import { deleteCoin, fetchUserCoins } from '../services/collectionService';
```

- [ ] **Step 4: Update CollectionScreen load to fall back to cache on empty**

Replace the mount `useEffect` load function:
```js
  useEffect(() => {
    async function load() {
      try {
        if (!user?.id) return;
        const coins = await getUserCoins(user.id);
        if (coins.length > 0) dispatch(setCollection(coins));
      } catch {
        const local = await loadCollection();
        if (local.length > 0) dispatch(setCollection(local));
      }
    }
    load();
  }, []);
```
with:
```js
  useEffect(() => {
    async function load() {
      if (!user?.id) return;
      const coins = await fetchUserCoins(user.id);
      if (coins.length > 0) {
        dispatch(setCollection(coins));
        await saveCollection(coins);
      } else {
        // Empty/failed server read — keep whatever the local cache holds.
        const local = await loadCollection();
        if (local.length > 0) dispatch(setCollection(local));
      }
    }
    load();
  }, []);
```

- [ ] **Step 5: Run the app and verify add → reload persists**

Run: `npm start`, open in Expo Go, sign in, scan a coin, Add to Collection, then reload (shake → Reload).
Expected: the coin is still in Collection after reload, with About/Design/Identification populated in its details modal.

- [ ] **Step 6: Commit**

```bash
git add src/screens/ResultsScreen.js src/screens/CollectionScreen.js
git commit -m "feat: route collection add/load/delete through unified collectionService"
```

---

## Task 6: coinIdentification — surface `scansRemaining`

**Files:**
- Modify: `src/services/coinIdentification.js`

- [ ] **Step 1: Return scansRemaining from identifyCoin**

In `src/services/coinIdentification.js`, inside `identifyCoin`, the edge response is `data`. Change the returned object to include `scansRemaining`:
```js
    return {
      coin,
      confidence: validated.confidence || 85,
      scansRemaining: typeof data.scansRemaining === 'number' ? data.scansRemaining : null,
      analysisDetails: {
        edgeDetection: 'Coin outline analyzed by Gemini Vision',
        surfaceAnalysis: `Condition estimated: ${coin.condition}`,
        inscriptionMatch: `${coin.name} identified`,
        metalDetection: (coin.composition || '').split(',')[0],
        sizeEstimate: coin.diameter || 'unknown',
      },
      alternativeMatches: [],
    };
```

- [ ] **Step 2: Verify the test suite still passes**

Run: `npm test`
Expected: PASS (no regressions).

- [ ] **Step 3: Commit**

```bash
git add src/services/coinIdentification.js
git commit -m "feat: surface server scansRemaining from identifyCoin response"
```

---

## Task 7: useScanLimit — server-backed count + UTC reset + pure helpers

**Files:**
- Modify: `src/hooks/useScanLimit.js`
- Modify: `src/screens/CameraScreen.js`
- Test: `src/__tests__/hooks/scanLimitHelpers.test.js`

- [ ] **Step 1: Write the failing test for the pure helpers**

Create `src/__tests__/hooks/scanLimitHelpers.test.js`:
```js
import { usedFromRemaining, msUntilUtcMidnight } from '../../hooks/useScanLimit';

describe('usedFromRemaining', () => {
  it('converts remaining to used against the limit', () => {
    expect(usedFromRemaining(3, 2)).toBe(1);
    expect(usedFromRemaining(3, 0)).toBe(3);
    expect(usedFromRemaining(3, 3)).toBe(0);
  });
  it('treats premium (-1 remaining) as 0 used', () => {
    expect(usedFromRemaining(3, -1)).toBe(0);
  });
  it('never returns negative', () => {
    expect(usedFromRemaining(3, 5)).toBe(0);
  });
});

describe('msUntilUtcMidnight', () => {
  it('computes ms to the next UTC midnight', () => {
    const now = new Date('2026-06-02T23:00:00.000Z');
    expect(msUntilUtcMidnight(now)).toBe(60 * 60 * 1000);
  });
  it('is a full day just after UTC midnight', () => {
    const now = new Date('2026-06-02T00:00:00.000Z');
    expect(msUntilUtcMidnight(now)).toBe(24 * 60 * 60 * 1000);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- scanLimitHelpers`
Expected: FAIL — `usedFromRemaining is not a function`.

- [ ] **Step 3: Rewrite `useScanLimit.js`**

Replace the file contents with:
```js
import { useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useDispatch, useSelector } from 'react-redux';
import { supabase } from '../config/supabase';
import { selectIsPremium, setScansUsedToday } from '../store/slices/settingsSlice';

// SecureStore is now only an OFFLINE CACHE. The server (get_daily_scan_status /
// the identify-coin response) is the source of truth, fetched on mount like XP.
const SCAN_KEY = '@coinseek_scan_data';
export const MAX_FREE_SCANS = 3;

/** Pure: remaining scans → scans used, clamped to [0, limit]. Premium = -1 → 0. */
export function usedFromRemaining(limit, remaining) {
  if (remaining < 0) return 0; // premium / unlimited
  return Math.max(0, limit - remaining);
}

/** Pure: milliseconds from `now` until the next UTC midnight (server reset). */
export function msUntilUtcMidnight(now) {
  const next = new Date(now);
  next.setUTCHours(24, 0, 0, 0);
  return next - now;
}

export function useScanLimit() {
  const dispatch  = useDispatch();
  const isPremium = useSelector(selectIsPremium);

  const [scansUsed, setScansUsed] = useState(0);
  const [loaded,    setLoaded]    = useState(false);

  function applyUsed(used) {
    setScansUsed(used);
    dispatch(setScansUsedToday(used));
  }

  async function cacheUsed(used) {
    try {
      const today = new Date().toISOString().slice(0, 10); // UTC date
      await SecureStore.setItemAsync(SCAN_KEY, JSON.stringify({ date: today, count: used }));
    } catch (_) {}
  }

  // On mount: ask the server (authoritative), fall back to the cache offline.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const { data, error } = await supabase.rpc('get_daily_scan_status');
        if (error) throw error;
        if (cancelled) return;
        const used = usedFromRemaining(
          data?.scan_limit ?? MAX_FREE_SCANS,
          data?.scans_remaining ?? MAX_FREE_SCANS,
        );
        applyUsed(used);
        await cacheUsed(used);
      } catch (_) {
        // Offline: trust today's cached value, else 0.
        try {
          const raw  = await SecureStore.getItemAsync(SCAN_KEY);
          const cache = raw ? JSON.parse(raw) : null;
          const today = new Date().toISOString().slice(0, 10);
          applyUsed(cache?.date === today ? cache.count : 0);
        } catch (_) { applyUsed(0); }
      }
      if (!cancelled) setLoaded(true);
    }
    load();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Reflect the server's post-scan remaining count (from identifyCoin). */
  async function syncScansRemaining(remaining) {
    if (isPremium || remaining == null) return;
    const used = usedFromRemaining(MAX_FREE_SCANS, remaining);
    applyUsed(used);
    await cacheUsed(used);
  }

  const scansRemaining = isPremium
    ? Infinity
    : Math.max(0, MAX_FREE_SCANS - scansUsed);

  const limitReached = !isPremium && scansUsed >= MAX_FREE_SCANS;

  const msLeft = msUntilUtcMidnight(new Date());
  const hLeft  = Math.floor(msLeft / 3_600_000);
  const mLeft  = Math.floor((msLeft % 3_600_000) / 60_000);
  const resetLabel = hLeft > 0 ? `${hLeft}h ${mLeft}m` : `${mLeft}m`;

  return {
    scansUsed,
    scansRemaining,
    limitReached,
    maxScans: MAX_FREE_SCANS,
    syncScansRemaining,
    loaded,
    resetLabel,
    isPremium,
  };
}
```

- [ ] **Step 4: Run the helper test to verify it passes**

Run: `npm test -- scanLimitHelpers`
Expected: PASS (5 assertions across 2 describes).

- [ ] **Step 5: Wire CameraScreen to the new setter**

In `src/screens/CameraScreen.js`, the destructure of `useScanLimit()` currently includes `incrementScan`. Replace `incrementScan` with `syncScansRemaining`:
```js
  const {
    scansUsed, scansRemaining, limitReached,
    maxScans, syncScansRemaining, resetLabel, isPremium,
  } = useScanLimit();
```
Then in `analyzePhotos`, replace the post-identify increment:
```js
      const result = await identifyCoin(frontUri, backUri);
      // Consume the scan only after a successful API response so a network
      // error or server failure does not silently burn the user's free scan.
      await incrementScan();
```
with:
```js
      const result = await identifyCoin(frontUri, backUri);
      // Reflect the server's authoritative remaining count (set by the edge
      // function) instead of a blind local increment.
      await syncScansRemaining(result.scansRemaining);
```

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: PASS (all suites green).

- [ ] **Step 7: Manually verify scan persistence**

Run: `npm start`, open in Expo Go, use all 3 scans, then reload.
Expected: counter shows "Limit reached" / 0 remaining after reload (not 3/3). Countdown reflects time to UTC midnight.

- [ ] **Step 8: Commit**

```bash
git add src/hooks/useScanLimit.js src/screens/CameraScreen.js src/__tests__/hooks/scanLimitHelpers.test.js
git commit -m "feat: server-backed scan count with UTC reset and pure helpers"
```

---

## Task 8: Retire `coinService.js`

**Files:**
- Delete: `src/services/coinService.js`

- [ ] **Step 1: Confirm no remaining imports**

Run: `git grep -n "services/coinService" -- src`
Expected: no matches (Task 5 moved the only two consumers).

- [ ] **Step 2: Delete the file**

```bash
git rm src/services/coinService.js
```

- [ ] **Step 3: Run the full suite**

Run: `npm test`
Expected: PASS — no import errors.

- [ ] **Step 4: Commit**

```bash
git commit -m "refactor: remove obsolete flat-schema coinService"
```

---

## Final verification

- [ ] `npm test` — all suites pass.
- [ ] Both migrations applied to Supabase; `get_daily_scan_status()` returns valid JSON; `user_coins` has RLS + 4 policies.
- [ ] Add a coin → reload Expo Go → coin persists with full detail.
- [ ] Use 3 scans → reload → still 0 remaining, server-blocked on the 4th.
- [ ] Airplane mode: add a coin (becomes local_), re-enable network, reopen → coin gets a server id and persists.
- [ ] XP still loads as before (unchanged path — regression check).
