import { useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useDispatch, useSelector } from 'react-redux';
import { supabase } from '../config/supabase';
import { selectIsPremium, setScansUsedToday } from '../store/slices/settingsSlice';
import {
  MAX_FREE_SCANS, usedFromRemaining, msUntilUtcMidnight, utcDateKey,
} from './scanLimitHelpers';

// SecureStore is now only an OFFLINE CACHE. The server (get_daily_scan_status /
// the identify-coin response) is the source of truth, fetched on mount like XP.
const SCAN_KEY = '@coinseek_scan_data';

// Re-exported for consumers (e.g. ScanLimitModal) that import it from this hook.
export { MAX_FREE_SCANS, usedFromRemaining, msUntilUtcMidnight };

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
      await SecureStore.setItemAsync(SCAN_KEY, JSON.stringify({ date: utcDateKey(), count: used }));
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
          const raw   = await SecureStore.getItemAsync(SCAN_KEY);
          const cache = raw ? JSON.parse(raw) : null;
          if (!cancelled) applyUsed(cache?.date === utcDateKey() ? cache.count : 0);
        } catch (_) { if (!cancelled) applyUsed(0); }
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
