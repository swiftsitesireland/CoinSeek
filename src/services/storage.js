import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  COLLECTION: '@coin_collector/collection',
  HISTORY:    '@coin_collector/history',
  WISHLIST:   '@coin_collector/wishlist',
  SETTINGS:   '@coin_collector/settings',
};

// M-03: validate parsed JSON before trusting it — prevents injected data
// on rooted/ADB-accessible devices from crashing or poisoning Redux state.
function safeParseArray(raw) {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeParseObject(raw) {
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function isValidCollectionItem(item) {
  return (
    item &&
    typeof item === 'object' &&
    typeof item.id === 'string' &&
    item.coin &&
    typeof item.coin.name === 'string' &&
    typeof item.quantity === 'number'
  );
}

export async function saveCollection(collection) {
  try {
    await AsyncStorage.setItem(KEYS.COLLECTION, JSON.stringify(collection));
  } catch (e) {
    console.error('Failed to save collection:', e);
  }
}

export async function loadCollection() {
  try {
    const data = await AsyncStorage.getItem(KEYS.COLLECTION);
    if (!data) return [];
    const parsed = safeParseArray(data);
    return parsed.filter(isValidCollectionItem); // strip any malformed items
  } catch (e) {
    console.error('Failed to load collection:', e);
    return [];
  }
}

export async function saveHistory(history) {
  try {
    await AsyncStorage.setItem(KEYS.HISTORY, JSON.stringify(history));
  } catch (e) {
    console.error('Failed to save history:', e);
  }
}

export async function loadHistory() {
  try {
    const data = await AsyncStorage.getItem(KEYS.HISTORY);
    return data ? safeParseArray(data) : [];
  } catch (e) {
    console.error('Failed to load history:', e);
    return [];
  }
}

export async function saveWishlist(wishlist) {
  try {
    await AsyncStorage.setItem(KEYS.WISHLIST, JSON.stringify(wishlist));
  } catch (e) {
    console.error('Failed to save wishlist:', e);
  }
}

export async function loadWishlist() {
  try {
    const data = await AsyncStorage.getItem(KEYS.WISHLIST);
    return data ? safeParseArray(data) : [];
  } catch (e) {
    console.error('Failed to load wishlist:', e);
    return [];
  }
}

export async function saveSettings(settings) {
  try {
    await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

export async function loadSettings() {
  try {
    const data = await AsyncStorage.getItem(KEYS.SETTINGS);
    return data ? safeParseObject(data) : null;
  } catch (e) {
    console.error('Failed to load settings:', e);
    return null;
  }
}

export async function clearAllData() {
  try {
    await AsyncStorage.multiRemove(Object.values(KEYS));
  } catch (e) {
    console.error('Failed to clear data:', e);
  }
}
