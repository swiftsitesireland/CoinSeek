import React, { createContext, useContext, useEffect, useState } from 'react';
import { Linking } from 'react-native';
import { supabase } from '../config/supabase';

const AuthContext = createContext(null);

// Only accept the verified HTTPS Universal Link / App Link.
// Custom schemes (coinseek://) can be registered by any app on Android and
// are therefore unsafe for carrying auth tokens.
const ALLOWED_CALLBACK_PREFIXES = [
  'https://coinseek.app/auth/callback',   // Android App Links / iOS Universal Links
];

function isAuthCallback(url) {
  if (!url) return false;
  try {
    return ALLOWED_CALLBACK_PREFIXES.some(prefix => url.startsWith(prefix));
  } catch {
    return false;
  }
}

// In-memory nonce — set before launching OAuth, cleared after use.
// Prevents replayed or injected callback URLs from being accepted.
let _pendingNonce = null;

export function setPendingAuthNonce(nonce) { _pendingNonce = nonce; }

function extractTokens(url) {
  const fragment = url.split('#')[1] ?? '';
  const query    = url.split('?')[1]?.split('#')[0] ?? '';
  const params   = Object.fromEntries(
    new URLSearchParams(fragment || query),
  );
  return params.access_token && params.refresh_token ? params : null;
}

async function handleAuthUrl(url) {
  if (!isAuthCallback(url)) return;

  // Reject if no nonce was set — means the callback arrived unexpectedly
  if (!_pendingNonce) return;
  _pendingNonce = null; // consume immediately so it can't be reused

  const tokens = extractTokens(url);
  if (tokens) {
    await supabase.auth.setSession({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    });
  }
}

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    Linking.getInitialURL().then(handleAuthUrl);
    const linkSub = Linking.addEventListener('url', ({ url }) => handleAuthUrl(url));

    return () => {
      subscription.unsubscribe();
      linkSub.remove();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading, isAuthenticated: !!session }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
