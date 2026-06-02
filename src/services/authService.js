import { supabase } from '../config/supabase';
import { getAppCheckHeaders } from './appCheckService';

/**
 * All authentication is routed through the auth-proxy Edge Function.
 * Every request carries an App Check token so the server can verify it
 * originates from an unmodified CoinSeek binary (production builds only).
 */

// Extracts the actual error message from a FunctionsHttpError.
// supabase-js puts the edge function response body in error.context,
// which may be a parsed object or a JSON string depending on the version.
async function extractFunctionError(error, fallback) {
  try {
    const ctx = error.context;
    if (ctx && typeof ctx === 'object' && ctx.error) return ctx.error;
    if (typeof ctx === 'string') {
      const parsed = JSON.parse(ctx);
      if (parsed?.error) return parsed.error;
    }
    if (typeof ctx?.json === 'function') {
      const body = await ctx.json();
      if (body?.error) return body.error;
    }
  } catch {}
  return error.message || fallback;
}

export async function signIn(email, password) {
  const appCheckHeaders = await getAppCheckHeaders();
  const { data, error } = await supabase.functions.invoke('auth-proxy', {
    body: { action: 'signin', email, password },
    headers: appCheckHeaders,
  });

  // Network / edge function error (includes 429 rate-limit responses)
  if (error) throw new Error(await extractFunctionError(error, 'Sign in failed'));

  // Application-level error returned in the JSON body
  if (data?.error) throw new Error(data.error);

  // Use the tokens returned by the proxy to establish a local session
  const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
    access_token:  data.access_token,
    refresh_token: data.refresh_token,
  });
  if (sessionError) throw sessionError;

  return sessionData;
}

export async function signUp(email, password, username) {
  const appCheckHeaders = await getAppCheckHeaders();
  const { data, error } = await supabase.functions.invoke('auth-proxy', {
    body: { action: 'signup', email, password, username },
    headers: appCheckHeaders,
  });

  if (error) throw new Error(await extractFunctionError(error, 'Sign up failed'));
  if (data?.error) throw new Error(data.error);

  return data;
}

export async function signOut() {
  const { clearSyncState } = await import('../store/middleware/collectionSync');
  clearSyncState();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function resetPassword(email) {
  const appCheckHeaders = await getAppCheckHeaders();
  const { data, error } = await supabase.functions.invoke('auth-proxy', {
    body: { action: 'reset', email },
    headers: appCheckHeaders,
  });

  if (error) throw new Error(await extractFunctionError(error, 'Password reset failed'));
  if (data?.error) throw new Error(data.error);
}

export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, email')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

const SUPABASE_STORAGE_HOST = process.env.EXPO_PUBLIC_SUPABASE_URL
  ? new URL(process.env.EXPO_PUBLIC_SUPABASE_URL).hostname
  : null;

function isSafeAvatarUrl(url) {
  if (!url) return true; // null/undefined = clear avatar, always allowed
  try {
    const parsed = new URL(url);
    // Must be HTTPS and must point to this project's Supabase storage
    return parsed.protocol === 'https:' && parsed.hostname === SUPABASE_STORAGE_HOST;
  } catch {
    return false;
  }
}

export async function updateProfile(userId, updates) {
  const ALLOWED_FIELDS = ['username', 'display_name', 'avatar_url'];
  const safe = Object.fromEntries(
    Object.entries(updates).filter(([k]) => ALLOWED_FIELDS.includes(k))
  );

  if ('avatar_url' in safe && !isSafeAvatarUrl(safe.avatar_url)) {
    throw new Error('Invalid avatar URL — must be a Supabase storage URL');
  }

  const { error } = await supabase
    .from('profiles')
    .update({ ...safe, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) throw error;
}
