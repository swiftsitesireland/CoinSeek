import { createSlice } from '@reduxjs/toolkit';

const collectionSlice = createSlice({
  name: 'collection',
  initialState: {
    items: [],
    wishlist: [],
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
          id: crypto.randomUUID(),
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
    setWishlist(state, action) {
      state.wishlist = action.payload;
    },
    addToWishlist(state, action) {
      const coin = action.payload;
      if (!state.wishlist.find((item) => item.coin.id === coin.id)) {
        state.wishlist.push({
          id: crypto.randomUUID(),
          coin,
          dateAdded: new Date().toISOString(),
        });
      }
    },
    removeFromWishlist(state, action) {
      state.wishlist = state.wishlist.filter((item) => item.id !== action.payload);
    },
  },
});

export const {
  setCollection,
  addToCollection,
  removeFromCollection,
  updateCollectionItem,
  setWishlist,
  addToWishlist,
  removeFromWishlist,
} = collectionSlice.actions;

export default collectionSlice.reducer;

// Selectors
export const selectCollection = (state) => state.collection.items;
export const selectWishlist = (state) => state.collection.wishlist;
export const selectCollectionTotal = (state) =>
  state.collection.items.reduce(
    (sum, item) => sum + (item?.coin?.estimatedValue?.mid ?? 0) * (item?.quantity ?? 1),
    0
  );
export const selectIsInCollection = (coinId) => (state) =>
  state.collection.items.some((item) => item.coin.id === coinId);
export const selectIsInWishlist = (coinId) => (state) =>
  state.collection.wishlist.some((item) => item.coin.id === coinId);
