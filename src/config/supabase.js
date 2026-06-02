import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

// Supabase keys that exceed SecureStore's 2 048-byte limit need chunking.
const SecureStoreAdapter = {
  async getItem(key) {
    const chunks = [];
    let i = 0;
    while (true) {
      const chunk = await SecureStore.getItemAsync(`${key}.${i}`);
      if (chunk === null) break;
      chunks.push(chunk);
      i++;
    }
    return chunks.length ? chunks.join('') : null;
  },

  async setItem(key, value) {
    const SIZE = 1800; // stay under the 2 048-byte iOS limit
    await this.removeItem(key);
    for (let i = 0; i < Math.ceil(value.length / SIZE); i++) {
      await SecureStore.setItemAsync(`${key}.${i}`, value.slice(i * SIZE, (i + 1) * SIZE));
    }
  },

  async removeItem(key) {
    let i = 0;
    while (true) {
      const existing = await SecureStore.getItemAsync(`${key}.${i}`);
      if (existing === null) break;
      await SecureStore.deleteItemAsync(`${key}.${i}`);
      i++;
    }
  },
};

const supabaseUrl     = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: SecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
