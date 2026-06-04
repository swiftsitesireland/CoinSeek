import { createSlice } from '@reduxjs/toolkit';
import * as Crypto from 'expo-crypto';

const historySlice = createSlice({
  name: 'history',
  initialState: {
    scans: [],
  },
  reducers: {
    setHistory(state, action) {
      state.scans = action.payload;
    },
    addScan(state, action) {
      const entry = {
        id: Crypto.randomUUID(),
        ...action.payload,
        scannedAt: new Date().toISOString(),
      };
      state.scans = [entry, ...state.scans].slice(0, 50);
    },
    clearHistory(state) {
      state.scans = [];
    },
    removeScan(state, action) {
      state.scans = state.scans.filter((s) => s.id !== action.payload);
    },
  },
});

export const { setHistory, addScan, clearHistory, removeScan } = historySlice.actions;
export default historySlice.reducer;

export const selectHistory = (state) => state.history.scans;
