/**
 * Redux middleware that silently syncs collection mutations to Supabase.
 * Fires after the reducer runs so Redux state is always the source of truth.
 *
 * L-03: Mutations are debounced (500 ms) and batched so rapid consecutive
 * actions (e.g. bulk import, double-tap) only produce one Supabase request
 * per item, preventing self-DoS against the database.
 */
import { supabase } from '../../config/supabase';
import { logger } from '../../utils/logger';
import {
  addToCollection,
  removeFromCollection,
  updateCollectionItem,
} from '../slices/collectionSlice';
import { upsertCoin, deleteCoin } from '../../services/collectionService';

// Pending work maps: itemId → { type, userId, item? }
const pendingUpserts = new Map(); // itemId → { userId, item }
const pendingDeletes = new Set(); // itemId

let flushTimer = null;

async function flushPending() {
  flushTimer = null;

  // Snapshot and clear so new actions during the flush don't get lost
  const upserts = new Map(pendingUpserts);
  const deletes = new Set(pendingDeletes);
  pendingUpserts.clear();
  pendingDeletes.clear();

  // Fire all upserts concurrently
  const upsertPromises = [...upserts.values()].map(({ userId, item }) =>
    upsertCoin(userId, item).catch(e => logger.warn('collectionSync upsert failed:', e.message)),
  );

  // Fire all deletes concurrently
  const deletePromises = [...deletes].map(itemId =>
    deleteCoin(itemId).catch(e => logger.warn('collectionSync delete failed:', e.message)),
  );

  await Promise.all([...upsertPromises, ...deletePromises]);
}

function scheduleFlush() {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(flushPending, 500);
}

export function clearSyncState() {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = null;
  pendingUpserts.clear();
  pendingDeletes.clear();
}

export const collectionSyncMiddleware = store => next => action => {
  const result = next(action);

  (async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const userId = session.user.id;
      const state  = store.getState();

      if (addToCollection.match(action)) {
        const item = state.collection.items.find(
          i => i.coin.id === action.payload.coin.id,
        );
        if (item) {
          pendingUpserts.set(item.id, { userId, item });
          scheduleFlush();
        }
      }

      if (updateCollectionItem.match(action)) {
        const item = state.collection.items.find(
          i => i.id === action.payload.id,
        );
        if (item) {
          pendingUpserts.set(item.id, { userId, item });
          scheduleFlush();
        }
      }

      if (removeFromCollection.match(action)) {
        const itemId = action.payload;
        // If there's a pending upsert for this item, cancel it
        pendingUpserts.delete(itemId);
        pendingDeletes.add(itemId);
        scheduleFlush();
      }
    } catch (e) {
      logger.warn('collectionSync middleware error:', e.message);
    }
  })();

  return result;
};
