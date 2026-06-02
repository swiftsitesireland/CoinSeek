/**
 * App Attestation — verifies every request comes from an unmodified
 * CoinSeek binary, not a bot or reverse-engineered client.
 *
 * Uses expo-app-integrity (Expo's native wrapper):
 *   iOS     → Apple App Attest  (hardware-backed, real device only)
 *   Android → Google Play Integrity
 *   Dev     → Returns null token; server allows through in non-enforced mode
 *
 * No Firebase. No extra accounts. Just Apple + Google natively via Expo.
 *
 * ─── SETUP (one-time, the week before App Store submission) ───────────────────
 *
 * 1. Upgrade expo-app-integrity once it supports your SDK version:
 *      npx expo install expo-app-integrity
 *    (Currently requires expo-secure-store@~12 — watch for an SDK 54 release)
 *
 * 2. iOS — enable App Attest in your Apple Developer portal:
 *    Certificates, Identifiers & Profiles → your App ID → Capabilities → App Attest ✓
 *
 * 3. Android — enable Play Integrity API in Google Cloud Console:
 *    APIs & Services → Enable APIs → "Play Integrity API" ✓
 *
 * 4. Add your server key to Supabase Edge Function secrets:
 *      ENFORCE_APP_CHECK=true
 *
 * 5. Build with EAS (required — Expo Go does not support attestation):
 *      eas build --profile production
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

let attestationModule = null;
let initialised = false;

/**
 * Initialise App Attestation at app startup.
 * Silently skips if expo-app-integrity is not yet installed or
 * if running in Expo Go (where native attestation is unavailable).
 */
export async function initAppCheck() {
  if (initialised) return;
  initialised = true;

  try {
    attestationModule = await import('expo-app-integrity');
    console.log('[AppCheck] expo-app-integrity loaded');
  } catch {
    // expo-app-integrity not installed yet — expected during development.
    // Everything continues to work; attestation is enforced server-side
    // only when ENFORCE_APP_CHECK=true is set on the edge function.
    console.log('[AppCheck] expo-app-integrity not available (Expo Go / not installed)');
  }
}

/**
 * Returns the current attestation token, or null if unavailable.
 */
export async function getAppCheckToken() {
  if (!attestationModule) return null;
  try {
    const token = await attestationModule.getAttestationToken();
    return token ?? null;
  } catch {
    return null;
  }
}

/**
 * Returns headers to attach to every auth-proxy / sensitive edge function call.
 * The header is simply omitted when attestation is unavailable (dev mode).
 */
export async function getAppCheckHeaders() {
  const token = await getAppCheckToken();
  if (!token) return {};
  return { 'X-App-Attest': token };
}
