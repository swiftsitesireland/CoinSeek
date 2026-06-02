# Account Data Persistence — Design

**Date:** 2026-06-02
**Status:** Approved (pending spec review)

## Problem

On an Expo reload, data that should be tied to the account disappears:

- **Collection coins vanish** and their estimated values go blank.
- **Daily scan count resets** to 3/3 even when scans were just used.
- **XP survives** — because it is the only thing read back from the server on load.

The Redux store is in-memory and is wiped on every reload. Durable state must come from the server (the source of truth) and be re-fetched on load, exactly as XP already does.

### Root causes

1. **Two conflicting schemas for `user_coins`.** No migration defines the table (it was hand-created). The two service files map it differently:
   - `coinService.js` (writes when a user taps "Add to Collection"): flat columns — `coin_name`, `country`, `market_value_mid`, `acquired_date`, `photo_url`, …
   - `collectionService.js` (reads at startup via `useCollectionSync`): a single JSONB `coin` column, ordered by `date_added`, with `front_image_uri` / `back_image_uri`.

   Coins are written one way and read the other way, so the startup read returns nothing usable → empty collection. The flat schema also cannot store `description`, `obverse`, `reverse`, `designer`, `series`, `tags`, so detail sections stay blank even when a coin loads.

2. **Likely missing RLS policies.** The client queries `user_coins` directly with its user JWT. Without row-level-security policies granting each user access to their own rows, every direct read returns empty regardless of schema.

3. **Rehydration has no local fallback.** `useCollectionSync` returns early when the server responds empty and never reads the AsyncStorage cache. `CollectionScreen`'s loader only falls back to local storage inside a `catch` (a thrown error), not on a successful-but-empty response.

4. **Scan count is a local-only counter.** `useScanLimit` keeps its own SecureStore counter. The server already enforces the limit (`daily_scans` table) and the `identify-coin` function returns the authoritative `scansRemaining` on every scan, but the client discards it. The client also computes the day boundary in **local** time while the server resets at **UTC** midnight.

## Goals

- Collection and scan count persist across reloads, reinstalls, and devices — account-bound, like XP.
- A coin's full detail (about/design/identification) survives a round-trip to the server.
- One collection persistence path, not two conflicting ones.

## Non-goals

- Preserving existing `user_coins` rows. Confirmed dev/test data — clean cutover, wipe is acceptable.
- Real-time multi-device sync / conflict resolution beyond the existing merge-on-load.
- Changing the gamification (XP) path — it already works correctly and is the reference model.

## Design

### A. Migration: define `user_coins` authoritatively

New migration `supabase/migrations/<ts>_user_coins.sql`. Standardize on the **JSONB `coin`** schema (matches `collectionService.js`) because it stores the entire coin object, preserving the rich detail fields.

Columns:

| column | type | notes |
|---|---|---|
| `id` | uuid PK default `gen_random_uuid()` | server-assigned |
| `user_id` | uuid NOT NULL → `auth.users(id)` ON DELETE CASCADE | |
| `coin` | jsonb NOT NULL | full coin object |
| `quantity` | int NOT NULL default 1 | |
| `condition` | text | |
| `purchase_price` | numeric | |
| `notes` | text default '' | |
| `date_added` | timestamptz NOT NULL default now() | sort key |
| `front_image_uri` | text | |
| `back_image_uri` | text | |
| `created_at` | timestamptz default now() | |
| `updated_at` | timestamptz default now() | |

- Idempotent: `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` for each column, so it is safe whether or not a hand-made table exists. (Clean cutover: no data migration from old flat columns.)
- Index on `(user_id, date_added DESC)`.
- Enable RLS with four policies scoped to `auth.uid() = user_id`: SELECT, INSERT (WITH CHECK), UPDATE, DELETE.

### B. Migration: read-only scan-status RPC

New migration `supabase/migrations/<ts>_scan_status.sql`:

```sql
CREATE OR REPLACE FUNCTION public.get_daily_scan_status()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_limit CONSTANT INTEGER := 3;
  v_today DATE := (now() AT TIME ZONE 'utc')::date;
  v_uid UUID := auth.uid();
  v_is_premium BOOLEAN;
  v_count INTEGER;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT EXISTS (SELECT 1 FROM public.subscriptions s
                 WHERE s.user_id = v_uid AND s.status = 'active') INTO v_is_premium;
  IF v_is_premium THEN
    RETURN jsonb_build_object('is_premium', true, 'scans_used', 0,
                              'scans_remaining', -1, 'scan_limit', v_limit);
  END IF;
  SELECT count INTO v_count FROM public.daily_scans
   WHERE user_id = v_uid AND scan_date = v_today;
  v_count := COALESCE(v_count, 0);
  RETURN jsonb_build_object('is_premium', false, 'scans_used', v_count,
    'scans_remaining', GREATEST(v_limit - v_count, 0), 'scan_limit', v_limit);
END; $$;
GRANT EXECUTE ON FUNCTION public.get_daily_scan_status() TO authenticated;
```

Read-only (never increments), uses `auth.uid()` so a caller can only see their own count. `v_limit = 3` matches `MAX_FREE_SCANS` and the existing server functions.

### C. One collection service

`collectionService.js` (JSONB) becomes the single path. Update consumers:

- `ResultsScreen.handleAdd`: build the item, call `upsertCoin(user.id, item)` (offline → keep `local_` id + `__syncPending`), dispatch, `saveCollection` to cache.
- `CollectionScreen` load: use `fetchUserCoins`; on empty/error fall back to `loadCollection()` cache.
- `useCollectionSync`: see D.

Retire the conflicting `coinService.js` mappings. `addCoin`/`getUserCoins`/`deleteCoin`/`updateCoin` callers move to `collectionService` equivalents (`upsertCoin`, `fetchUserCoins`, `deleteCoin`, `upsertCoin`). Keep `local_`-prefixed pending IDs; a flush step upserts them and swaps in server IDs.

### D. Offline-first rehydration (`useCollectionSync`)

On `user.id` available:

1. Dispatch the AsyncStorage cache immediately (`loadCollection`) for instant paint.
2. Fetch remote (`fetchUserCoins`).
3. Merge: remote rows + local-only items whose ids are not in remote (i.e. `local_` pending). Flush pending upserts.
4. Dispatch merged; `saveCollection(merged)` to refresh the cache.

A successful-but-empty server response no longer blanks the screen — the cache already populated step 1, and an empty remote just means nothing to merge.

### E. Server-backed scan count (`useScanLimit`)

- On mount: `supabase.rpc('get_daily_scan_status')`. Set `scansUsed = scans_used` (premium → unlimited). Cache to SecureStore as offline fallback; if the RPC fails, fall back to the cached value.
- After a scan: `identifyCoin` returns `scansRemaining`; `CameraScreen` passes it to a `syncScansRemaining(n)` setter that sets `scansUsed = scan_limit - n` and updates the cache. Replaces the blind local `incrementScan`.
- Reset countdown (`resetLabel`): compute time until **UTC** midnight to match the server.

`identifyCoin` (`coinIdentification.js`) is updated to return `scansRemaining` from the edge-function response (currently discarded).

## Data flow after change

- **Scan:** edge function consumes scan + returns `scansRemaining` → client reflects it. Reload → `get_daily_scan_status()` returns the true remaining. ✅
- **Add coin:** `upsertCoin` writes full JSONB to `user_coins` (RLS-guarded). Reload → `fetchUserCoins` reads it back with all detail fields intact. ✅
- **Offline:** cache paints instantly; pending `local_` coins flush on next sync. ✅

## Testing

- Add a coin → reload → coin still present with About/Design/Identification populated.
- Use all 3 scans → reload → still shows 0 remaining (not 3/3); blocked by server.
- Premium account → unlimited shown after reload.
- Airplane mode: add coin (local_), re-enable network, reopen → coin syncs and gets a server id.
- Unit test `get_daily_scan_status` count math (0, partial, at-limit, premium).

## Risks

- **RPC names vs existing functions:** the new `get_daily_scan_status` is independent of `check_/consume_daily_scan`; no collision.
- **Hand-made table drift:** idempotent `ADD COLUMN IF NOT EXISTS` tolerates an existing table; clean cutover means old flat-column data is abandoned (accepted).
- **RLS lockout:** if policies are wrong, reads return empty. Mitigated by explicit per-operation policies and a manual verification step after applying the migration.
