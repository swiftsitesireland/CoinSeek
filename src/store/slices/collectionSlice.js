import { createSlice } from '@reduxjs/toolkit';

// React Native (Hermes) has no global `crypto`, so crypto.randomUUID() throws.
// These ids are local-only keys, not security-sensitive, so a timestamp +
// random suffix is sufficient and dependency-free.
const localId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;

const collectionSlice = createSlice({
  name: 'collection',
  initialState: {
    items: [],
    favourites: [], // array of favourited coin IDs
  },
  reducers: {
    setCollection(state, action) {
      state.items = action.payload;
    },
    addToCollection(state, action) {
      const { coin, quantity = 1, condition, purchasePrice, notes, frontImageUri, backImageUri } = action.payload;
      const existing = state.items.find((item) => item.coin.id === coin.id);
      if (existing) {
        existing.quantity += quantity;
        if (frontImageUri) existing.frontImageUri = frontImageUri;
        if (backImageUri) existing.backImageUri = backImageUri;
      } else {
        state.items.push({
          id: localId(),
          coin,
          quantity,
          condition: condition || coin.condition,
          purchasePrice: purchasePrice || coin.estimatedValue.mid,
          notes: notes || '',
          dateAdded: new Date().toISOString(),
          frontImageUri: frontImageUri || null,
          backImageUri: backImageUri || null,
        });
      }
    },
    removeFromCollection(state, action) {
      state.items = state.items.filter((item) => item.id !== action.payload);
    },
    updateCollectionItem(state, action) {
      const index = state.items.findIndex((item) => item.id === action.payload.id);
      if (index !== -1) {
        state.items[index] = { ...state.items[index], ...action.payload };
      }
    },
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
  },
});

export const {
  setCollection,
  addToCollection,
  removeFromCollection,
  updateCollectionItem,
  setFavourites,
  toggleFavourite,
} = collectionSlice.actions;

export default collectionSlice.reducer;

// Selectors
export const selectCollection = (state) => state.collection.items;
export const selectFavourites = (state) => state.collection.favourites;
export const selectCollectionTotal = (state) =>
  state.collection.items.reduce(
    (sum, item) => sum + (item?.coin?.estimatedValue?.mid ?? 0) * (item?.quantity ?? 1),
    0
  );
export const selectIsInCollection = (coinId) => (state) =>
  state.collection.items.some((item) => item.coin.id === coinId);
export const selectIsFavourite = (coinId) => (state) =>
  state.collection.favourites.includes(coinId);
export const selectFavouriteCount = (state) => state.collection.favourites.length;
