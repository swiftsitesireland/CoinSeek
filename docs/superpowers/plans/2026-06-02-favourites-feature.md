# Favourites Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Wishlist feature with a Favourites feature — a heart toggles a per-coin favourite flag, surfaced via a filter in the Collection screen, and persisted locally.

**Architecture:** Favourites are stored as an array of favourited coin IDs in the existing `collection` Redux slice. A `toggleFavourite` action flips membership; a `favouritesPersistMiddleware` (mirroring `settingsPersistMiddleware`) writes to AsyncStorage on change; `App.js` hydrates on startup. Hearts on the Results screen, collection cards, and details modal all dispatch the same toggle. The Collection screen gains a Favourites filter that shows only favourited coins.

**Tech Stack:** React Native (Expo SDK 54), Redux Toolkit, AsyncStorage, jest-expo, `@expo/vector-icons` (MaterialCommunityIcons).

---

## Notes on the existing code (read before starting)

- **Wishlist was never persisted.** `saveWishlist`/`loadWishlist` in `src/services/storage.js` are dead (no callers), and `addToWishlist` was dispatched only in `ResultsScreen` with no persistence and no XP/badge award. So there is **no migration** to write — there is nothing on disk. (This supersedes the "migration" note in the design spec.)
- **The `wishlist_10` badge is never awarded** — `gamificationService.js` does not reference it. We repoint it to a `favourite` action and matching copy so it stops referencing a removed concept; wiring an actual award is out of scope (it was never wired).
- `src/__tests__/data/badges.test.js` asserts `BADGES.toHaveLength(30)` and that each category has `length > 0`. Keep the badge in the list (length stays 30) and keep its `category: 'collection'`.

---

## File Structure

- **Modify** `src/store/slices/collectionSlice.js` — replace wishlist state/actions/selectors with favourites.
- **Modify** `src/services/storage.js` — replace WISHLIST key + save/load with FAVOURITES.
- **Create** `src/store/middleware/favouritesPersist.js` — persist favourites on change.
- **Modify** `src/store/index.js` — register the new middleware.
- **Modify** `App.js` — hydrate favourites at startup.
- **Modify** `src/screens/ResultsScreen.js` — heart toggles favourite.
- **Modify** `src/components/CoinCard.js` — heart overlay on `GridCoinCard`.
- **Modify** `src/components/CoinDetailsModal.js` — heart in header.
- **Modify** `src/screens/CollectionScreen.js` — Favourites filter chip.
- **Modify** `src/screens/ProfileScreen.js` — remove the COLLECTION section.
- **Modify** `src/navigation/AppNavigator.js` — remove Wishlist route.
- **Delete** `src/screens/WishlistScreen.js`.
- **Modify** `src/data/badges.js` — repoint `wishlist_10` → favourites.
- **Create** `src/__tests__/store/collectionSlice.test.js` — reducer/selector tests.
- **Create** `src/__tests__/services/favouritesStorage.test.js` — storage save/load tests.

Run tests with: `npm test -- <path>` (jest-expo preset).

---

### Task 1: Favourites state in the collection slice

**Files:**
- Modify: `src/store/slices/collectionSlice.js`
- Test: `src/__tests__/store/collectionSlice.test.js` (create)

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/store/collectionSlice.test.js`:

```javascript
import reducer, {
  setFavourites,
  toggleFavourite,
  selectFavourites,
  selectIsFavourite,
  selectFavouriteCount,
} from '../../store/slices/collectionSlice';

const initial = () => reducer(undefined, { type: '@@INIT' });

describe('favourites reducer', () => {
  it('starts with an empty favourites array', () => {
    expect(initial().favourites).toEqual([]);
  });

  it('toggleFavourite adds an id when absent', () => {
    const s = reducer(initial(), toggleFavourite('coin_1'));
    expect(s.favourites).toEqual(['coin_1']);
  });

  it('toggleFavourite removes an id when present', () => {
    let s = reducer(initial(), toggleFavourite('coin_1'));
    s = reducer(s, toggleFavourite('coin_1'));
    expect(s.favourites).toEqual([]);
  });

  it('toggleFavourite never duplicates an id', () => {
    let s = reducer(initial(), toggleFavourite('coin_1'));
    s = reducer(s, toggleFavourite('coin_2'));
    s = reducer(s, toggleFavourite('coin_1')); // removes coin_1
    expect(s.favourites).toEqual(['coin_2']);
  });

  it('setFavourites replaces state and dedupes non-strings', () => {
    const s = reducer(initial(), setFavourites(['a', 'a', 'b', 5, null]));
    expect(s.favourites).toEqual(['a', 'b']);
  });
});

describe('favourites selectors', () => {
  const state = { collection: { items: [], wishlist: undefined, favourites: ['x', 'y'] } };
  it('selectFavourites returns the array', () => {
    expect(selectFavourites(state)).toEqual(['x', 'y']);
  });
  it('selectIsFavourite reflects membership', () => {
    expect(selectIsFavourite('x')(state)).toBe(true);
    expect(selectIsFavourite('z')(state)).toBe(false);
  });
  it('selectFavouriteCount returns the length', () => {
    expect(selectFavouriteCount(state)).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/__tests__/store/collectionSlice.test.js`
Expected: FAIL — `toggleFavourite`/`setFavourites`/selectors are not exported (undefined).

- [ ] **Step 3: Edit the slice**

In `src/store/slices/collectionSlice.js`:

Change `initialState` from:
```javascript
  initialState: {
    items: [],
    wishlist: [],
  },
```
to:
```javascript
  initialState: {
    items: [],
    favourites: [], // array of favourited coin IDs
  },
```

Replace the three wishlist reducers (`setWishlist`, `addToWishlist`, `removeFromWishlist`) with:
```javascript
    setFavourites(state, action) {
      const seen = new Set();
      state.favourites = (Array.isArray(action.payload) ? action.payload : [])
        .filter((id) => typeof id === 'string' && !seen.has(id) && seen.add(id));
    },
    toggleFavourite(state, action) {
      const id = action.payload;
      if (typeof id !== 'string') return;
      const i = state.favourites.indexOf(id);
      if (i === -1) state.favourites.push(id);
      else state.favourites.splice(i, 1);
    },
```

In the `export const { ... } = collectionSlice.actions;` block, replace
`setWishlist, addToWishlist, removeFromWishlist,` with `setFavourites, toggleFavourite,`.

Replace the wishlist selectors:
```javascript
export const selectWishlist = (state) => state.collection.wishlist;
```
and
```javascript
export const selectIsInWishlist = (coinId) => (state) =>
  state.collection.wishlist.some((item) => item.coin.id === coinId);
```
with:
```javascript
export const selectFavourites = (state) => state.collection.favourites;
export const selectIsFavourite = (coinId) => (state) =>
  state.collection.favourites.includes(coinId);
export const selectFavouriteCount = (state) => state.collection.favourites.length;
```

Also remove the now-unused `localId()` import usage? (No — `localId` is still used by `addToCollection`/`addToWishlist`. After removing `addToWishlist`, `localId` is still used by `addToCollection`, so keep it.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/__tests__/store/collectionSlice.test.js`
Expected: PASS (all 8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/store/slices/collectionSlice.js src/__tests__/store/collectionSlice.test.js
git commit -m "feat: add favourites state to collection slice, remove wishlist"
```

---

### Task 2: Favourites persistence in storage

**Files:**
- Modify: `src/services/storage.js`
- Test: `src/__tests__/services/favouritesStorage.test.js` (create)

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/services/favouritesStorage.test.js`:

```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveFavourites, loadFavourites } from '../../services/storage';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

beforeEach(async () => { await AsyncStorage.clear(); });

describe('favourites storage', () => {
  it('returns [] when nothing is stored', async () => {
    expect(await loadFavourites()).toEqual([]);
  });

  it('round-trips an array of ids', async () => {
    await saveFavourites(['a', 'b']);
    expect(await loadFavourites()).toEqual(['a', 'b']);
  });

  it('returns [] for non-array stored data', async () => {
    await AsyncStorage.setItem('@coin_collector/favourites', JSON.stringify({ not: 'array' }));
    expect(await loadFavourites()).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/__tests__/services/favouritesStorage.test.js`
Expected: FAIL — `saveFavourites`/`loadFavourites` not exported.

- [ ] **Step 3: Edit storage.js**

In `src/services/storage.js`, change the `KEYS` object: replace
`  WISHLIST:   '@coin_collector/wishlist',`
with
`  FAVOURITES: '@coin_collector/favourites',`.

Replace the `saveWishlist`/`loadWishlist` functions with:
```javascript
export async function saveFavourites(ids) {
  try {
    await AsyncStorage.setItem(KEYS.FAVOURITES, JSON.stringify(ids));
  } catch (e) {
    console.error('Failed to save favourites:', e);
  }
}

export async function loadFavourites() {
  try {
    const data = await AsyncStorage.getItem(KEYS.FAVOURITES);
    if (!data) return [];
    return safeParseArray(data).filter((id) => typeof id === 'string');
  } catch (e) {
    console.error('Failed to load favourites:', e);
    return [];
  }
}
```

(`clearAllData` uses `Object.values(KEYS)`, so it automatically clears the new key — no change needed.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/__tests__/services/favouritesStorage.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/services/storage.js src/__tests__/services/favouritesStorage.test.js
git commit -m "feat: persist favourites to AsyncStorage, remove dead wishlist storage"
```

---

### Task 3: Persist middleware + store registration + startup hydration

**Files:**
- Create: `src/store/middleware/favouritesPersist.js`
- Modify: `src/store/index.js`
- Modify: `App.js`

- [ ] **Step 1: Create the middleware**

Create `src/store/middleware/favouritesPersist.js`:

```javascript
/**
 * Redux middleware that persists the favourites list to AsyncStorage whenever it
 * changes. Mirrors settingsPersistMiddleware: run the reducer first, then persist
 * the resulting state. Hydrated at startup in App.js via loadFavourites().
 */
import { saveFavourites } from '../../services/storage';

const FAVOURITE_ACTIONS = new Set([
  'collection/toggleFavourite',
  'collection/setFavourites',
]);

export const favouritesPersistMiddleware = store => next => action => {
  const result = next(action);

  if (FAVOURITE_ACTIONS.has(action?.type)) {
    // Fire-and-forget; the storage layer logs its own errors.
    saveFavourites(store.getState().collection.favourites);
  }

  return result;
};
```

- [ ] **Step 2: Register the middleware**

In `src/store/index.js`, add the import after the settings middleware import:
```javascript
import { favouritesPersistMiddleware } from './middleware/favouritesPersist';
```
and update the `.concat(...)` to include it:
```javascript
    getDefaultMiddleware().concat(collectionSyncMiddleware, settingsPersistMiddleware, favouritesPersistMiddleware),
```

- [ ] **Step 3: Hydrate at startup**

In `App.js`, the existing startup `useEffect` (around line 59) loads settings. Update the imports near line 16-17 from:
```javascript
import { setSettings } from './src/store/slices/settingsSlice';
import { loadSettings } from './src/services/storage';
```
to:
```javascript
import { setSettings } from './src/store/slices/settingsSlice';
import { setFavourites } from './src/store/slices/collectionSlice';
import { loadSettings, loadFavourites } from './src/services/storage';
```

Inside the same async function in that `useEffect`, after the `loadSettings` lines, add:
```javascript
      const favIds = await loadFavourites();
      if (favIds.length) store.dispatch(setFavourites(favIds));
```

- [ ] **Step 4: Verify the app boots**

Run: `npm test -- src/__tests__/smoke.test.js`
Expected: PASS (no import/wiring errors). If the smoke test imports the store/App, this catches broken imports.

- [ ] **Step 5: Commit**

```bash
git add src/store/middleware/favouritesPersist.js src/store/index.js App.js
git commit -m "feat: persist + hydrate favourites via middleware and startup load"
```

---

### Task 4: Results screen heart toggles favourite

**Files:**
- Modify: `src/screens/ResultsScreen.js`

- [ ] **Step 1: Update imports**

Change the collectionSlice import (line 11) from:
```javascript
import { selectCollection, setCollection, selectWishlist, selectIsInWishlist, addToWishlist, removeFromWishlist } from '../store/slices/collectionSlice';
```
to:
```javascript
import { selectCollection, setCollection, selectIsFavourite, toggleFavourite } from '../store/slices/collectionSlice';
```

- [ ] **Step 2: Replace the wishlist hooks**

Replace these lines (around 73-75):
```javascript
  const wishlist     = useSelector(selectWishlist);
  ...
  const isInWishlist = useSelector(selectIsInWishlist(result?.coin?.id));
```
with (keep any unrelated selectors between them as-is; remove only the wishlist ones):
```javascript
  const isFavourite  = useSelector(selectIsFavourite(result?.coin?.id));
```

- [ ] **Step 3: Replace the handler**

Replace `handleWishlist` (around lines 202-212) with:
```javascript
  function handleFavourite() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    dispatch(toggleFavourite(coin.id));
    Toast.show({
      type: isFavourite ? 'info' : 'success',
      text1: isFavourite ? 'Removed from Favourites' : 'Added to Favourites',
      text2: coin.name,
    });
  }
```

- [ ] **Step 4: Update the button JSX**

Around lines 491-499, update the heart button to use the new names:
```javascript
        <TouchableOpacity
          style={[styles.favouriteBtn, isFavourite && styles.favouriteBtnActive]}
          onPress={handleFavourite}
        >
          <MaterialCommunityIcons
            name={isFavourite ? 'heart' : 'heart-outline'}
            size={22}
            color={isFavourite ? colors.error : colors.textMuted}
          />
        </TouchableOpacity>
```
And rename the two style keys `wishlistBtn`/`wishlistBtnActive` (around lines 612-619) to `favouriteBtn`/`favouriteBtnActive` (leave their style values unchanged).

- [ ] **Step 5: Verify no stale references**

Run: `npx grep -rn "wishlist\|Wishlist\|isInWishlist" src/screens/ResultsScreen.js` (or use editor search).
Expected: no matches.

- [ ] **Step 6: Commit**

```bash
git add src/screens/ResultsScreen.js
git commit -m "feat: results screen heart toggles favourite"
```

---

### Task 5: Heart overlay on collection grid cards

**Files:**
- Modify: `src/components/CoinCard.js`

- [ ] **Step 1: Add imports**

At the top of `src/components/CoinCard.js`, add to the redux import and dispatch:
```javascript
import { useSelector, useDispatch } from 'react-redux';
```
and add the slice import after the settings import:
```javascript
import { selectIsFavourite, toggleFavourite } from '../store/slices/collectionSlice';
import * as Haptics from 'expo-haptics';
```

- [ ] **Step 2: Wire favourite state into GridCoinCard**

Inside `GridCoinCard` (after `const currency = useSelector(selectCurrency);`), add:
```javascript
  const dispatch = useDispatch();
  const isFavourite = useSelector(selectIsFavourite(coin.id));
  function handleHeart() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    dispatch(toggleFavourite(coin.id));
  }
```

- [ ] **Step 3: Add the heart button to the image area**

Inside the `gridImageWrap` View, after the metal badge `</View>` (around line 72), add:
```javascript
        <TouchableOpacity
          style={styles.heartBtn}
          onPress={handleHeart}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialCommunityIcons
            name={isFavourite ? 'heart' : 'heart-outline'}
            size={16}
            color={isFavourite ? colors.error : '#fff'}
          />
        </TouchableOpacity>
```

- [ ] **Step 4: Add the style**

In the `StyleSheet.create({...})`, inside the grid card section, add:
```javascript
  heartBtn: {
    position: 'absolute', top: spacing.sm, right: spacing.sm,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
```

- [ ] **Step 5: Verify it renders (manual)**

Reload the app, open Collection. Each card shows a heart top-right; tapping it toggles fill without opening the details modal (the heart is a separate TouchableOpacity, so the card's `onPress` does not fire — confirm this on device).

- [ ] **Step 6: Commit**

```bash
git add src/components/CoinCard.js
git commit -m "feat: favourite heart on collection grid cards"
```

---

### Task 6: Heart in the coin details modal header

**Files:**
- Modify: `src/components/CoinDetailsModal.js`

- [ ] **Step 1: Add imports**

Change the redux import (line 9) to:
```javascript
import { useSelector, useDispatch } from 'react-redux';
```
and add after the currency import:
```javascript
import { selectIsFavourite, toggleFavourite } from '../store/slices/collectionSlice';
```

- [ ] **Step 2: Wire favourite state**

After `const currency = useSelector(selectCurrency);` (line 30), add (note: this must be before the `if (!coin) return null;` guard is fine since hooks run unconditionally — place these two lines immediately after the currency selector and BEFORE the early return; use optional chaining for the id):
```javascript
  const dispatch = useDispatch();
  const isFavourite = useSelector(selectIsFavourite(coin?.id));
```

- [ ] **Step 3: Add the heart button to the header**

In the header `View` (after the close button `</TouchableOpacity>` around line 53), add:
```javascript
          <TouchableOpacity
            style={styles.favBtn}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); dispatch(toggleFavourite(coin.id)); }}
          >
            <MaterialCommunityIcons
              name={isFavourite ? 'heart' : 'heart-outline'}
              size={20}
              color={isFavourite ? colors.error : colors.text}
            />
          </TouchableOpacity>
```

- [ ] **Step 4: Add the style**

In `StyleSheet.create`, near the `closeBtn` style, add a mirrored style positioned top-right. Use the same dimensions as `closeBtn`; set `right` instead of `left`:
```javascript
  favBtn: {
    position: 'absolute', top: spacing.md, right: spacing.md, zIndex: 10,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center', justifyContent: 'center',
  },
```
(If `closeBtn` uses different size/offset values, match those instead so the two buttons align.)

- [ ] **Step 5: Verify (manual)**

Open a coin's details from the Collection grid; the header shows a heart top-right that toggles and stays in sync with the card heart.

- [ ] **Step 6: Commit**

```bash
git add src/components/CoinDetailsModal.js
git commit -m "feat: favourite heart in coin details modal"
```

---

### Task 7: Favourites filter in the Collection screen

**Files:**
- Modify: `src/screens/CollectionScreen.js`

- [ ] **Step 1: Add imports**

Add to the collectionSlice import (lines 11-14):
```javascript
import {
  selectCollection, selectCollectionTotal,
  removeFromCollection, setCollection,
  selectFavourites,
} from '../store/slices/collectionSlice';
```

- [ ] **Step 2: Add state + selector**

After `const currency = useSelector(selectCurrency);` (line 89), add:
```javascript
  const favourites = useSelector(selectFavourites);
  const [favouritesOnly, setFavouritesOnly] = useState(false);
```

- [ ] **Step 3: Apply the filter**

In the `filtered` useMemo (lines 126-142), add the favourites filter as the first narrowing step and include the deps:
```javascript
  const filtered = useMemo(() => {
    let r = collection;
    if (favouritesOnly) {
      r = r.filter((i) => favourites.includes(i.coin.id));
    }
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(i =>
        i.coin.name.toLowerCase().includes(q) ||
        i.coin.country.toLowerCase().includes(q) ||
        i.coin.year.toString().includes(q)
      );
    }
    if (activeFilter && SORT_MAP[activeFilter]) {
      r = [...r].sort(SORT_MAP[activeFilter]);
    } else {
      r = [...r].sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
    }
    return r;
  }, [collection, search, activeFilter, favouritesOnly, favourites]);
```

Also update the `useEffect(() => { setShowAll(false); }, [search, activeFilter]);` (line 164) to also reset on favourites toggle:
```javascript
  useEffect(() => { setShowAll(false); }, [search, activeFilter, favouritesOnly]);
```

- [ ] **Step 4: Add the Favourites chip**

In the `chipsRow` View (lines 250-260), add a dedicated favourites chip before the sort chips:
```javascript
      <View style={styles.chipsRow}>
        <TouchableOpacity
          style={[styles.chip, favouritesOnly && styles.chipActive]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setFavouritesOnly(v => !v); }}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name={favouritesOnly ? 'heart' : 'heart-outline'}
            size={13}
            color={favouritesOnly ? colors.onPrimary : colors.textMuted}
          />
          <Text style={[styles.chipText, favouritesOnly && styles.chipTextActive]}>Favourites</Text>
        </TouchableOpacity>
        {FILTER_CHIPS.map(c => (
          <FilterChip
            key={c.id}
            label={c.label}
            icon={c.icon}
            active={activeFilter === c.id}
            onPress={() => toggleFilter(c.id)}
          />
        ))}
      </View>
```

- [ ] **Step 5: Add an empty state for the filter**

In the `FlatList`'s `ListEmptyComponent` (lines 322-328), branch on `favouritesOnly`:
```javascript
        ListEmptyComponent={
          favouritesOnly ? (
            <View style={styles.empty}>
              <MaterialCommunityIcons name="heart-outline" size={64} color={colors.outlineVariant} />
              <Text style={styles.emptyTitle}>No favourites yet</Text>
              <Text style={styles.emptySub}>Tap the heart on a coin to add it here</Text>
            </View>
          ) : (
            <View style={styles.empty}>
              <MaterialCommunityIcons name="layers-outline" size={64} color={colors.outlineVariant} />
              <Text style={styles.emptyTitle}>No coins yet</Text>
              <Text style={styles.emptySub}>Scan a coin to add it to your collection</Text>
            </View>
          )
        }
```

- [ ] **Step 6: Verify (manual)**

Reload, open Collection. Tapping "Favourites" shows only favourited coins; tapping again shows all. With no favourites, the heart empty state appears.

- [ ] **Step 7: Commit**

```bash
git add src/screens/CollectionScreen.js
git commit -m "feat: favourites filter chip in collection screen"
```

---

### Task 8: Remove the Collection section from Profile

**Files:**
- Modify: `src/screens/ProfileScreen.js`

- [ ] **Step 1: Delete the section**

Remove the entire `<Section title="COLLECTION"> ... </Section>` block (lines ~226-245), including the My Collection, Portfolio Value, and Wishlist `MenuRow`s.

- [ ] **Step 2: Remove now-unused references**

Check the top of `ProfileScreen.js` for imports/selectors used *only* by the removed section (e.g. `collection`, `totalValue`, `selectCollectionTotal`, `formatCurrency` if unused elsewhere). Remove any that are now unused. Keep anything still referenced by other sections (e.g. scan counts).

Run: editor search for `collection`, `totalValue`, `formatCurrency` in `ProfileScreen.js` to confirm whether they're still used before deleting their imports.

- [ ] **Step 3: Verify (manual + lint)**

Run: `npm test -- src/__tests__/smoke.test.js`
Expected: PASS (no unresolved references). Reload the app → Profile no longer shows the Collection section; remaining sections render.

- [ ] **Step 4: Commit**

```bash
git add src/screens/ProfileScreen.js
git commit -m "feat: remove collection section from profile screen"
```

---

### Task 9: Delete Wishlist screen, route, and repoint badge

**Files:**
- Delete: `src/screens/WishlistScreen.js`
- Modify: `src/navigation/AppNavigator.js`
- Modify: `src/data/badges.js`

- [ ] **Step 1: Remove the route**

In `src/navigation/AppNavigator.js`, delete the import (line 21):
```javascript
import WishlistScreen              from '../screens/WishlistScreen';
```
and the route (line 89):
```javascript
      <S.Screen name="Wishlist"        component={WishlistScreen} />
```

- [ ] **Step 2: Delete the screen file**

```bash
git rm src/screens/WishlistScreen.js
```

- [ ] **Step 3: Repoint the badge**

In `src/data/badges.js`, find the `wishlist_10` entry:
```javascript
  { id: 'wishlist_10',       emoji: '💫', name: 'Dream Collector',    description: 'Add 10 coins to wishlist',     category: 'collection', criteria: { action: 'wishlist',   count: 10 } },
```
Replace with:
```javascript
  { id: 'favourite_10',      emoji: '💫', name: 'Curator',            description: 'Favourite 10 coins',           category: 'collection', criteria: { action: 'favourite', count: 10 } },
```
(Keep `category: 'collection'` so `badges.test.js` category counts are unchanged; the list length stays 30.)

- [ ] **Step 4: Verify**

Run: `npm test -- src/__tests__/data/badges.test.js`
Expected: PASS (length 30, category counts unchanged).

Run: editor search across `src/` for `Wishlist`, `wishlist`, `addToWishlist`, `selectWishlist`, `loadWishlist`, `saveWishlist`.
Expected: no matches anywhere in `src/`.

- [ ] **Step 5: Commit**

```bash
git add src/navigation/AppNavigator.js src/data/badges.js
git rm src/screens/WishlistScreen.js
git commit -m "chore: remove wishlist screen/route, repoint badge to favourites"
```

---

### Task 10: Full test run + manual verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: PASS (existing suites + the 2 new test files).

- [ ] **Step 2: Manual smoke on device (reload Expo)**

Verify each:
- Scan a coin → on Results, tap heart → "Added to Favourites"; heart fills.
- Add that coin to collection → open Collection → its card shows a filled heart.
- Toggle a card heart off → it un-fills; toggling the details-modal heart stays in sync.
- Tap the Collection "Favourites" chip → only favourited coins show; tap again → all show.
- Kill and reopen the app → favourites persist (filled hearts remain).
- Profile screen → no Collection section.
- App has no Wishlist screen anywhere.

- [ ] **Step 3: Final commit (if any manual tweaks were needed)**

```bash
git add -A
git commit -m "test: verify favourites feature end-to-end"
```

---

## Self-Review (completed by plan author)

- **Spec coverage:** flag model (Task 1), filter-only behavior (Task 7), heart in all 3 places (Tasks 4-6), profile section removal (Task 8), wishlist cleanup + badge (Task 9), persistence (Tasks 2-3). The spec's "migration" item is intentionally dropped — verified wishlist was never persisted (no callers of save/loadWishlist), so there is no data to migrate.
- **Placeholder scan:** no TBD/TODO; every code step includes concrete code.
- **Type consistency:** `toggleFavourite(coinId: string)`, `setFavourites(ids: string[])`, `selectIsFavourite(coinId)(state)`, `selectFavourites(state)`, `selectFavouriteCount(state)`, `favourites: string[]`, storage `saveFavourites(ids)`/`loadFavourites()`, action types `collection/toggleFavourite` & `collection/setFavourites` — consistent across Tasks 1-7.
