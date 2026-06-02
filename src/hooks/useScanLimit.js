import { useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useDispatch, useSelector } from 'react-redux';
import { selectIsPremium, setScansUsedToday } from '../store/slices/settingsSlice';

// Stored in SecureStore (not AsyncStorage) so it survives "Clear All Data"
// which only wipes AsyncStorage. The server-side check_and_increment_daily_scan
// RPC is the authoritative guard — this local counter only drives the UI.
// On reinstall the local counter resets to 0, but the server still enforces
// the limit, so users will see "scans remaining" reset visually but be blocked
// by the server after 3 scans regardless.
const SCAN_KEY = '@coinseek_scan_data';
export const MAX_FREE_SCANS = 3;

export function useScanLimit() {
  const dispatch  = useDispatch();
  const isPremium = useSelector(selectIsPremium);

  const [scansUsed, setScansUsed] = useState(0);
  const [loaded,    setLoaded]    = useState(false);

  const today = new Date().toDateString();

  // Load persisted count on mount; reset if it's a new day
  useEffect(() => {
    async function load() {
      try {
        const raw  = await SecureStore.getItemAsync(SCAN_KEY);
        const data = raw ? JSON.parse(raw) : null;
        if (data?.date === today) {
          setScansUsed(data.count);
          dispatch(setScansUsedToday(data.count));
        } else {
          setScansUsed(0);
          dispatch(setScansUsedToday(0));
          await SecureStore.setItemAsync(SCAN_KEY, JSON.stringify({ date: today, count: 0 }));
        }
      } catch (_) {}
      setLoaded(true);
    }
    load();
  }, []);

  async function incrementScan() {
    if (isPremium) return; // premium users have no limit
    const next = scansUsed + 1;
    setScansUsed(next);
    dispatch(setScansUsedToday(next));
    try {
      await SecureStore.setItemAsync(SCAN_KEY, JSON.stringify({ date: today, count: next }));
    } catch (_) {}
  }

  const scansRemaining = isPremium
    ? Infinity
    : Math.max(0, MAX_FREE_SCANS - scansUsed);

  const limitReached = !isPremium && scansUsed >= MAX_FREE_SCANS;

  // Time until midnight reset
  const now       = new Date();
  const midnight  = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const msLeft    = midnight - now;
  const hLeft     = Math.floor(msLeft / 3_600_000);
  const mLeft     = Math.floor((msLeft % 3_600_000) / 60_000);
  const resetLabel = hLeft > 0 ? `${hLeft}h ${mLeft}m` : `${mLeft}m`;

  return {
    scansUsed,
    scansRemaining,
    limitReached,
    maxScans: MAX_FREE_SCANS,
    incrementScan,
    loaded,
    resetLabel,
    isPremium,
  };
}
