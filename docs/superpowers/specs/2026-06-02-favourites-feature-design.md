# Favourites Feature — Design

**Date:** 2026-06-02
**Status:** Approved
**Replaces:** Wishlist feature

## Summary

Replace the existing Wishlist feature with a Favourites feature. A favourite is a
flag on a coin, toggled by a heart button. Favourites are surfaced through the
Collection screen (via a filter), not a separate screen. The Collection section
is removed from the Profile page.

## Decisions (from brainstorming)

1. **Favourites model:** flag on coins (a set of favourited coin IDs), not a
   separate parallel list. Favourites live inside the collection.
2. **Collection Favourites button:** a **filter** — when active, show only
   favourited coins; tap again to clear. Distinct from the Year/Country/Metal
   sort chips.
3. **Heart placement:** Scan Results screen, Collection coin cards, and the Coin
   details modal — all three.
4. **Results heart behavior (option A):** the heart is a pure flag. Hearting a
   coin on the Results screen marks it favourite but does NOT auto-add it to the
   collection. It appears under the Collection Favourites filter once the coin is
   in the collection.

## Data Model

In `src/store/slices/collectionSlice.js`:

- Replace `wishlist: []` with `favourites: []` — an array of favourited coin IDs
  (strings). A plain array (used as a set, deduped on insert) keeps Redux state
  serializable.
- **Actions:**
  - `setFavourites(ids)` — hydrate from storage.
  - `toggleFavourite(coinId)` — add if absent, remove if present.
- **Remove:** `setWishlist`, `addToWishlist`, `removeFromWishlist`.
- **Selectors:**
  - `selectFavourites(state)` → array of IDs.
  - `selectIsFavourite(coinId)(state)` → boolean.
  - `selectFavouriteCount(state)` → number (for badges/labels if needed).
- **Remove:** `selectWishlist`, `selectIsInWishlist`.

## Persistence

In `src/services/storage.js`:

- Rename key `WISHLIST: '@coin_collector/wishlist'` → `FAVOURITES: '@coin_collector/favourites'`.
- Add `saveFavourites(ids)` / `loadFavourites()` (store/return an array of IDs).
- Remove `saveWishlist` / `loadWishlist`.
- **One-time migration on load:** if `FAVOURITES` is empty but the old
  `WISHLIST` key has data, map its `item.coin.id` values into the favourites ID
  array, persist under `FAVOURITES`, and remove the old key. Prevents data loss
  for existing users.

Favourites are loaded into Redux wherever the collection is hydrated (e.g. app
bootstrap or Collection screen mount) via `setFavourites(await loadFavourites())`,
and re-persisted whenever `toggleFavourite` runs.

## Components & Screens

### Results screen (`src/screens/ResultsScreen.js`)
- Rename `handleWishlist` → `handleFavourite`; dispatch `toggleFavourite(coin.id)`.
- Use `selectIsFavourite(coin.id)` for filled/outline heart state.
- Toasts: "Added to Favourites" / "Removed from Favourites".
- Rename `wishlistBtn`/`wishlistBtnActive` styles to `favouriteBtn`/`favouriteBtnActive`
  (visual styling unchanged).

### Collection coin card (`src/components/CoinCard.js`, `GridCoinCard`)
- Add a small heart button overlaid on the card (top corner). Toggles
  `toggleFavourite(item.coin.id)`; reflects `selectIsFavourite`.
- Stop press propagation so tapping the heart does not open the details modal.

### Coin details modal (`src/components/CoinDetailsModal.js`)
- Add a heart toggle in the modal header. Same toggle + state selector.

### Collection screen (`src/screens/CollectionScreen.js`)
- Add a `Favourites` filter chip (heart icon). Track separately from
  `activeFilter` (the sort chips) since it filters rather than sorts — e.g. a
  `favouritesOnly` boolean.
- When `favouritesOnly` is true, filter `collection` to items whose
  `coin.id` is in `favourites`, before applying search/sort.
- Empty state when the filter is on but no favourites match: a heart icon with
  "No favourites yet — tap the heart on a coin to add it."

### Profile screen (`src/screens/ProfileScreen.js`)
- Remove the entire `<Section title="COLLECTION">` block (My Collection,
  Portfolio Value, and Wishlist rows). Collection remains reachable via the
  bottom-tab navigator.

## Cleanup

- Delete `src/screens/WishlistScreen.js`.
- Remove the `Wishlist` screen import and `<S.Screen name="Wishlist" .../>` route
  in `src/navigation/AppNavigator.js`.
- `src/data/badges.js`: the `wishlist_10` badge currently keys off a `wishlist`
  action. Repoint it to a `favourite` action ("Favourite 10 coins") or remove it.
  Decision: **repoint** to keep the badge count meaningful. Confirm the
  award/criteria wiring elsewhere uses the same action string.

## Data Flow

1. User hearts a coin (Results / card / modal) → `dispatch(toggleFavourite(id))`
   → reducer updates `favourites` → middleware/handler persists via
   `saveFavourites`.
2. Collection screen reads `favourites`; when `favouritesOnly` is on, intersects
   `collection` items with the favourites set for display.
3. On app/collection load, `loadFavourites()` (with wishlist migration) hydrates
   Redux via `setFavourites`.

## Error Handling

- Storage read/write failures are swallowed (consistent with existing
  `storage.js` patterns) — favourites are non-critical local UI state. A failed
  persist still updates in-memory Redux for the session.
- `toggleFavourite` is idempotent and guards against duplicate IDs.

## Testing

- Reducer unit tests: `toggleFavourite` adds then removes; `setFavourites`
  hydrates; no duplicate IDs.
- Selector tests: `selectIsFavourite` true/false; `selectFavouriteCount`.
- Storage migration test: old wishlist data maps to favourite IDs and the old
  key is cleared.
- Manual: heart from each of the 3 surfaces reflects consistently; Collection
  Favourites filter shows only favourited coins; Profile no longer shows the
  Collection section; app builds with WishlistScreen removed.

## Out of Scope (YAGNI)

- Server-side persistence of favourites (kept local, like the previous wishlist).
- A dedicated Favourites screen.
- Favouriting coins that are not the result of a scan/collection (no external
  catalog browse).
