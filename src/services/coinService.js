import { supabase } from '../config/supabase';
import { saveCollection, loadCollection } from './storage';
import { logger } from '../utils/logger';

function toRow(item, userId) {
  const { coin, condition, purchasePrice, notes, dateAdded, frontImageUri } = item;
  return {
    user_id: userId,
    coin_name: coin.name,
    country: coin.country,
    year_minted: coin.year > 0 ? coin.year : null,
    denomination: coin.denomination || null,
    metal_composition: coin.composition || null,
    mint_mark: coin.mintMark || null,
    weight: coin.weight || null,
    rarity_level: coin.rarity || 'common',
    market_value_low: coin.estimatedValue?.low ?? null,
    market_value_mid: coin.estimatedValue?.mid ?? null,
    market_value_high: coin.estimatedValue?.high ?? null,
    condition: condition || coin.condition || null,
    photo_url: frontImageUri || null,
    notes: notes || null,
    acquired_date: dateAdded ? dateAdded.split('T')[0] : null,
    purchase_price: purchasePrice ?? null,
  };
}

function fromRow(row) {
  return {
    id: row.id,
    coin: {
      id: row.id,
      name: row.coin_name,
      country: row.country,
      year: row.year_minted || 0,
      denomination: row.denomination || '',
      composition: row.metal_composition || '',
      mintMark: row.mint_mark || '',
      weight: row.weight || '',
      rarity: row.rarity_level || 'common',
      condition: row.condition || '',
      estimatedValue: {
        low: parseFloat(row.market_value_low) || 0,
        mid: parseFloat(row.market_value_mid) || 0,
        high: parseFloat(row.market_value_high) || 0,
      },
    },
    quantity: 1,
    condition: row.condition || '',
    purchasePrice: parseFloat(row.purchase_price) || 0,
    notes: row.notes || '',
    dateAdded: row.acquired_date
      ? new Date(row.acquired_date).toISOString()
      : row.created_at,
    frontImageUri: row.photo_url || null,
    backImageUri: null,
  };
}

async function flushPendingLocalCoins(userId) {
  const local = await loadCollection();
  const pending = local.filter(i => String(i.id).startsWith('local_'));
  if (!pending.length) return;

  const synced = [];
  for (const item of pending) {
    try {
      const { data, error } = await supabase
        .from('user_coins')
        .insert(toRow(item, userId))
        .select()
        .single();
      if (error) throw error;
      synced.push({ old: item.id, new: fromRow(data) });
    } catch {
      // Leave in local cache — will retry next time
    }
  }

  if (synced.length) {
    // Replace local records with server-assigned IDs in AsyncStorage
    const updated = local.map(i => {
      const match = synced.find(s => s.old === i.id);
      return match ? match.new : i;
    });
    await saveCollection(updated);
  }
}

export async function getUserCoins(userId) {
  try {
    // Flush any pending local coins before fetching the authoritative list
    await flushPendingLocalCoins(userId);

    const { data, error } = await supabase
      .from('user_coins')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(fromRow);
  } catch (e) {
    logger.warn('[coinService] getUserCoins fell back to local cache:', e.message);
    const local = await loadCollection();
    return Object.assign(local, { __fromCache: true });
  }
}

export async function addCoin(item, userId) {
  try {
    const { data, error } = await supabase
      .from('user_coins')
      .insert(toRow(item, userId))
      .select()
      .single();
    if (error) throw error;
    return fromRow(data);
  } catch (e) {
    console.warn('[coinService] addCoin fell back to local record:', e.message);
    // Prefix with local_ so sync middleware skips remote operations on this record.
    // The user should be informed this coin is not yet synced to the cloud.
    const localRecord = {
      id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      ...item,
      dateAdded: item.dateAdded || new Date().toISOString(),
      __syncPending: true,
    };
    return localRecord;
  }
}

export async function deleteCoin(supabaseId) {
  // Skip remote delete for local-only records
  if (String(supabaseId).startsWith('local_')) return;
  try {
    const { error } = await supabase
      .from('user_coins')
      .delete()
      .eq('id', supabaseId);
    if (error) throw error;
  } catch {
    // Silently ignore — Redux state already removes it
  }
}

export async function updateCoin(supabaseId, updates) {
  if (String(supabaseId).startsWith('local_')) return;
  try {
    const { error } = await supabase
      .from('user_coins')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', supabaseId);
    if (error) throw error;
  } catch {
    // Silently ignore
  }
}
