import { supabase } from '../config/supabase';

/** Convert a Supabase row → Redux collection item shape */
function rowToItem(row) {
  return {
    id:            row.id,
    coin:          row.coin,
    quantity:      row.quantity,
    condition:     row.condition,
    purchasePrice: row.purchase_price,
    notes:         row.notes ?? '',
    dateAdded:     row.date_added,
    frontImageUri: row.front_image_uri ?? null,
    backImageUri:  row.back_image_uri  ?? null,
  };
}

/** Convert a Redux collection item → Supabase row shape */
function itemToRow(userId, item) {
  return {
    id:              item.id,
    user_id:         userId,
    coin:            item.coin,
    quantity:        item.quantity,
    condition:       item.condition  ?? null,
    purchase_price:  item.purchasePrice ?? null,
    notes:           item.notes      ?? '',
    date_added:      item.dateAdded  ?? new Date().toISOString(),
    front_image_uri: item.frontImageUri ?? null,
    back_image_uri:  item.backImageUri  ?? null,
    updated_at:      new Date().toISOString(),
  };
}

/**
 * Merge server rows with any local-only items (coins added while offline that
 * haven't synced yet) so a successful-but-empty server read never drops them.
 * Ids are stable client ids, so an item missing from `remote` is local-only.
 * Pure + side-effect free for testability.
 */
export function mergeCollections(remote, local) {
  const r = Array.isArray(remote) ? remote : [];
  const l = Array.isArray(local)  ? local  : [];
  const remoteIds = new Set(r.map((i) => i.id));
  const localOnly = l.filter((i) => !remoteIds.has(i.id));
  return [...r, ...localOnly];
}

/** Fetch all coins for a user. Returns [] on error (graceful fallback). */
export async function fetchUserCoins(userId) {
  const { data, error } = await supabase
    .from('user_coins')
    .select('*')
    .eq('user_id', userId)
    .order('date_added', { ascending: false });

  if (error) {
    console.warn('fetchUserCoins error:', error.message);
    return [];
  }
  return (data ?? []).map(rowToItem);
}

/** Upsert a single collection item. Safe to call after add or update. */
export async function upsertCoin(userId, item) {
  const { error } = await supabase
    .from('user_coins')
    .upsert(itemToRow(userId, item), { onConflict: 'id' });
  if (error) console.warn('upsertCoin error:', error.message);
}

/** Delete a single collection item by its local id. */
export async function deleteCoin(itemId) {
  const { error } = await supabase
    .from('user_coins')
    .delete()
    .eq('id', itemId);
  if (error) console.warn('deleteCoin error:', error.message);
}

/** Delete ALL coins for a user (called on logout / account deletion). */
export async function deleteAllUserCoins(userId) {
  const { error } = await supabase
    .from('user_coins')
    .delete()
    .eq('user_id', userId);
  if (error) console.warn('deleteAllUserCoins error:', error.message);
}
