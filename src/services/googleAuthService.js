import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '../config/supabase';

// Ensure any lingering auth browser session is closed before we open a new one.
WebBrowser.maybeCompleteAuthSession();

/**
 * Opens Google's OAuth consent page in an in-app browser, waits for the user
 * to complete sign-in, then exchanges the auth code for a Supabase session.
 *
 * Works with the custom scheme (coinseek://) so the domain doesn't need to
 * be live yet. AuthContext picks up the new session via onAuthStateChange.
 *
 * Returns:
 *   { success: true, isNewUser: boolean }  — signed in
 *   { success: false }                     — user cancelled or error thrown
 */
export async function signInWithGoogle() {
  // coinseek://auth-callback — matches the allowlist entry in Supabase dashboard
  const redirectTo = Linking.createURL('/auth-callback');

  // Ask Supabase for the Google OAuth URL.
  // skipBrowserRedirect: true — we open the browser ourselves so we can
  // intercept the deep-link return with openAuthSessionAsync.
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) throw new Error(error.message);
  if (!data?.url) throw new Error('No OAuth URL returned from Supabase');

  // Open the Google sign-in page. openAuthSessionAsync automatically
  // closes the browser and returns when it detects the redirectTo prefix.
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  if (result.type !== 'success' || !result.url) {
    // User closed the browser or cancelled — not an error
    return { success: false };
  }

  // Exchange the auth code in the callback URL for a real session.
  // supabase is configured with detectSessionInUrl: false, so we do this manually.
  const { data: sessionData, error: sessionError } =
    await supabase.auth.exchangeCodeForSession(result.url);

  if (sessionError) throw new Error(sessionError.message);

  // Detect new vs returning user.
  // Supabase sets created_at === last_sign_in_at on first ever login.
  const user = sessionData?.session?.user;
  const isNewUser = user
    ? Math.abs(
        new Date(user.created_at).getTime() -
        new Date(user.last_sign_in_at).getTime(),
      ) < 10_000
    : false;

  // New Google users still need to choose a plan, just like email sign-ups.
  if (isNewUser) {
    await SecureStore.setItemAsync('coinseek_needs_plan_selection', 'true');
  }

  return { success: true, isNewUser };
}
