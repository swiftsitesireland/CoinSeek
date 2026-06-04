/**
 * Offline-first collection rehydration. On login:
 *   1. Paint the AsyncStorage cache immediately (instant, survives an empty
 *      server response — the bug that made coins vanish on reload).
 *   2. Fetch the authoritative remote list and merge with any local-only coins
 *      (added offline, not yet synced).
 *   3. Re-upsert those local-only coins so they reach the server.
 *   4. Dispatch the merged set and write it back to the cache.
 * Call once inside AppNavigator (inside the Redux Provider).
 */
import { useEffect } from 'react';
import { useDispatch, useStore } from 'react-redux';
import { useAuth } from '../auth/AuthContext';
import { setCollection } from '../store/slices/collectionSlice';
import {
  fetchUserCoins, upsertCoin, mergeCollections,
} from '../services/collectionService';
import { loadCollection, saveCollection } from '../services/storage';
import { logger } from '../utils/logger';

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
        // 2. Fetch the authoritative remote list.
        const remote = await fetchUserCoins(user.id);
        if (cancelled) return;

        // 3. Local-only coins = in cache but not on the server (offline adds).
        const remoteIds = new Set(remote.map((i) => i.id));
        const localOnly = (store.getState().collection.items || [])
          .filter((i) => !remoteIds.has(i.id));

        // Push them up so they stop being local-only next time.
        await Promise.all(
          localOnly.map((item) =>
            upsertCoin(user.id, item).catch(() => { /* retry next sync */ }),
          ),
        );
        if (cancelled) return;

        // 4. Merge, dispatch, refresh cache.
        const merged = mergeCollections(remote, localOnly);
        dispatch(setCollection(merged));
        await saveCollection(merged);
      } catch (e) {
        // Cache already painted in step 1, so nothing is lost on failure.
        if (!cancelled) logger.warn('useCollectionSync error:', e.message);
      }
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);
}
