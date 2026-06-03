# Remove Coin from Collection — Design Spec
**Date:** 2026-06-03  
**Status:** Approved

---

## Overview

Add a meatball menu (⋮) to every coin card in the collection grid and inside the coin detail modal. Tapping ⋮ opens a small popover with a "Delete Coin" option. Tapping "Delete Coin" shows a confirmation Alert; confirming removes the coin from Redux state, Supabase, and the local cache.

All backend plumbing already exists (`removeFromCollection` Redux action, `deleteCoin` service, `handleRemove` in `CollectionScreen`). This spec covers the missing UI layer only.

---

## UX Flow

```
User taps ⋮
  → PopoverMenu appears near tap point
  → User taps "Delete Coin"
  → Alert.alert("Remove Coin", "Are you sure?", [Cancel, Remove])
  → User confirms
  → deleteCoin(item.id)          ← Supabase delete
  → dispatch(removeFromCollection(item.id))  ← Redux
  → saveCollection(remaining)    ← local cache
  → Toast "Removed · <coin name>"
  → PopoverMenu closes
```

Tapping outside the popover (backdrop) dismisses it with no action.

---

## Components

### 1. `src/components/PopoverMenu.js` *(new)*

**Purpose:** Reusable absolutely-positioned dropdown menu.

**Props:**
| Prop | Type | Description |
|---|---|---|
| `visible` | `bool` | Controls render |
| `onClose` | `func` | Called on backdrop tap or item press |
| `anchor` | `{ x: number, y: number }` | Screen coordinates of the ⋮ button (from `ref.measure`) |
| `items` | `Array<{ label, icon, color?, onPress }>` | Menu items to render |

**Rendering:**
- Full-screen `Modal` with `transparent` and `animationType="fade"`
- Transparent `TouchableOpacity` backdrop fills the screen; tap calls `onClose`
- Menu card: `surfaceContainerLow` background, `borderRadius.md`, shadow, min-width 180, positioned using `anchor` (offsets to stay on-screen)
- Each item: horizontal row of `icon` (16px) + `label` text, `colors.error` tint for destructive actions
- Hairline separator between items when more than one

**Positioning logic:** place the card below-left of `anchor`. If it would overflow the right edge (`anchor.x + cardWidth > screenWidth`), right-align it instead.

---

### 2. `src/components/CoinCard.js` — `GridCoinCard` *(modified)*

**Change:** Replace the existing `onInfoPress` ⓘ button in the card's info footer with a ⋮ button.

**New prop:** `onMenuPress(position: { x, y })` — optional. When provided the ⋮ button renders; when absent the footer right-slot is empty.

**Implementation:** Attach a `ref` to the ⋮ `TouchableOpacity`. On press call `ref.current.measure((fx, fy, w, h, px, py) => onMenuPress({ x: px, y: py + h }))` to pass screen-absolute coordinates upward. The card owns no popover state.

The existing `onInfoPress` prop is removed (tapping the card already opens the detail view, making ⓘ redundant).

---

### 3. `src/screens/CollectionScreen.js` *(modified)*

**New state:**
```js
const [menuTarget, setMenuTarget] = useState(null); // collection item
const [menuAnchor, setMenuAnchor] = useState(null); // { x, y }
```

**`renderGridItem` update:** pass `onMenuPress` to `GridCoinCard`:
```js
onMenuPress={(pos) => {
  setMenuAnchor(pos);
  setMenuTarget(item);
}}
```

**`PopoverMenu` instance** added to the return tree (outside `FlatList`, alongside `CoinDetailsModal`):
```jsx
<PopoverMenu
  visible={!!menuTarget && !!menuAnchor}
  onClose={() => { setMenuTarget(null); setMenuAnchor(null); }}
  anchor={menuAnchor ?? { x: 0, y: 0 }}
  items={[{
    label: 'Delete Coin',
    icon: 'trash-can-outline',
    color: colors.error,
    onPress: () => {
      const target = menuTarget;
      setMenuTarget(null);
      setMenuAnchor(null);
      handleRemove(target);
    },
  }]}
/>
```

The existing `handleRemove` function is unchanged — it already fires the Alert, calls `deleteCoin`, dispatches, saves, and shows a Toast.

---

### 4. `src/components/CoinDetailsModal.js` *(modified)*

**New prop:** `onRemove` — optional `func`. Rendered only when `isInCollection && onRemove`.

**Header change:** Add a ⋮ `TouchableOpacity` to the right of the existing ✕ close button. The close button shifts slightly left to accommodate it (both are `position: absolute, top`; close at `right: spacing.lg`, ⋮ at `right: spacing.lg + 44`).

**Local state:** `const [menuVisible, setMenuVisible] = useState(false)`. The popover state lives inside the modal; no anchor needed because the ⋮ button is always in the same fixed position — the menu card is placed at a fixed offset from top-right.

**Items:**
```js
[{
  label: 'Delete Coin',
  icon: 'trash-can-outline',
  color: colors.error,
  onPress: () => {
    setMenuVisible(false);
    onRemove(); // caller closes modal then fires handleRemove
  },
}]
```

**`CollectionScreen` wires it:**
```jsx
<CoinDetailsModal
  ...
  onRemove={() => {
    setSelectedCoin(null);       // close modal first
    handleRemove(selectedCoin);  // then fire Alert
  }}
/>
```

---

## Files Changed

| File | Change |
|---|---|
| `src/components/PopoverMenu.js` | **New** — shared popover menu component |
| `src/components/CoinCard.js` | Replace ⓘ with ⋮; add `onMenuPress` prop; remove `onInfoPress` |
| `src/screens/CollectionScreen.js` | Add menu state; wire `onMenuPress` + `PopoverMenu`; wire `onRemove` on modal |
| `src/components/CoinDetailsModal.js` | Add ⋮ button + `onRemove` prop + local `menuVisible` state |

**No changes to:** `collectionSlice.js`, `collectionService.js`, `storage.js` — all backend logic already exists.

---

## Error Handling

- If `deleteCoin` throws, the existing `handleRemove` catch block shows a Toast error and does **not** dispatch `removeFromCollection` — the coin stays in the list.
- If the user is offline, `deleteCoin` may fail silently (Supabase will log a warning); the item stays in the local cache and will re-appear on next sync. Acceptable for v1 — offline queue is out of scope.

---

## Out of Scope

- Batch / multi-select delete
- Undo / undo Toast action
- Swipe-to-delete gesture
- Additional menu items (edit, share, etc.)
