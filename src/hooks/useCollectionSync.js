/**
 * Loads the user's coin collection from Supabase when they log in,
 * then merges it with any locally-stored coins so nothing is lost.
 * Call this once inside AppNavigator (or any component inside the Redux Provider).
 */
import { useEffect } from 'react';
import { useDispatch, useStore } from 'react-redux';
import { useAuth } from '../auth/AuthContext';
import { setCollection } from '../store/slices/collectionSlice';
import { fetchUserCoins } from '../services/collectionService';

export function useCollectionSync() {
  const dispatch = useDispatch();
  const store    = useStore();   // M-02: use store.getState() at merge time, not stale selector
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;

    (async () => {
      try {
        const remoteItems = await fetchUserCoins(user.id);

        if (cancelled) return;
        if (remoteItems.length === 0) return;

        const currentLocal = store.getState().collection.items;
        const remoteIds    = new Set(remoteItems.map(i => i.id));
        const localOnly    = currentLocal.filter(i => !remoteIds.has(i.id));
        const merged       = [...remoteItems, ...localOnly];

        dispatch(setCollection(merged));
      } catch (e) {
        if (!cancelled) console.warn('useCollectionSync error:', e.message);
      }
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);
}
