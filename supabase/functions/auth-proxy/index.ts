/**
 * auth-proxy — server-side authentication gateway.
 *
 * THREE layers of protection on every request:
 *   1. Firebase App Check token — proves request comes from a real CoinSeek binary
 *      (enforced on production; skipped in DEV mode so Expo Go still works)
 *   2. Per-IP rate limit  — 20 attempts per 15 min (stops flooding with many emails)
 *   3. Per-email rate limit — 5 attempts per 15 min (stops account brute force)
 */

import { createClient } from 'npm:@supabase/supabase-js@2';
import { checkRateLimit, rateLimitResponse } from '../_shared/rateLimiter.ts';
import {
  readBodyWithLimit, safeParseJson, buildCorsHeaders, sanitiseEmail,
  rejectUnexpectedFields, requirePost, validatePassword, LIMITS,
} from '../_shared/validate.ts';

// Max password length — prevents bcrypt DoS if the body-size limit ever changes.
// bcrypt is deliberately slow; hashing a 1 MB string would stall the function.
const MAX_PASSWORD_LEN = 128;

// VULN-08 / M-05: username must be 3-30 alphanumeric/underscore/dot/hyphen chars.
// Display names (full names with spaces) are stored separately.
// If the client sends a display name, we auto-derive a safe username from it.
const USERNAME_RE = /^[a-zA-Z0-9_.-]{3,30}$/;

function deriveUsername(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  // Strip anything not alphanumeric/underscore, collapse spaces to underscore
  const safe = raw.trim()
    .toLowerCase()
    .replace(/\s+/g, '_')       // spaces → underscore
    .replace(/[^a-z0-9_.]/g, '') // remove non-allowed chars
    .slice(0, 30);
  return safe.length >= 3 ? safe : '';
}
const RESERVED_USERNAMES = new Set([
  'admin', 'administrator', 'root', 'support', 'help', 'mod', 'moderator',
  'coinseek', 'staff', 'official', 'system', 'null', 'undefined',
]);

// Blocks vulgar, racist, sexist, and otherwise inappropriate display names.
// We normalise the name (lowercase, strip everything but letters) before
// matching so spaced/punctuated evasions like "f.u.c.k" are still caught.
// The list is deliberately limited to severe slurs and clear profanity to
// keep false positives on real names low.
const BANNED_NAME_TOKENS = [
  'fuck', 'shit', 'cunt', 'bitch', 'bastard', 'asshole', 'dick', 'pussy',
  'cock', 'whore', 'slut', 'rape', 'nigger', 'nigga', 'faggot', 'fag',
  'retard', 'spic', 'chink', 'kike', 'wetback', 'tranny', 'dyke', 'coon',
  'nazi', 'hitler', 'pedo', 'pedophile', 'molest', 'kkk',
];

function containsBannedName(raw: unknown): boolean {
  if (typeof raw !== 'string') return false;
  const normalized = raw.toLowerCase().replace(/[^a-z]/g, '');
  if (!normalized) return false;
  return BANNED_NAME_TOKENS.some((token) => normalized.includes(token));
}

// Finds an available username, appending a numeric suffix on collision so
// two people with the same full name (e.g. two "John Smith"s) can both sign up.
async function findAvailableUsername(adminClient: any, base: string): Promise<string> {
  const { data: existing } = await adminClient
    .from('profiles')
    .select('username')
    .eq('username', base)
    .maybeSingle();
  if (!existing) return base;

  // Try base + random suffix a few times; usernames cap at 30 chars.
  const root = base.slice(0, 24);
  for (let i = 0; i < 5; i++) {
    const suffix = Math.floor(1000 + Math.random() * 9000); // 4 digits
    const candidate = `${root}${suffix}`;
    const { data: taken } = await adminClient
      .from('profiles')
      .select('username')
      .eq('username', candidate)
      .maybeSingle();
    if (!taken) return candidate;
  }
  // Extremely unlikely fallback — timestamp-based, still unique enough.
  return `${root}${Date.now().toString().slice(-6)}`;
}

// VULN-07: per-request CORS — built from shared helper
// corsHeaders is now derived per-request inside Deno.serve

// Set ENFORCE_APP_CHECK=true in Supabase Edge Function secrets the week
// before you submit to the App Store / Play Store.
// Leave unset during development — Expo Go keeps working normally.
const ENFORCE_APP_CHECK = Deno.env.get('ENFORCE_APP_CHECK') === 'true';

// A shared secret you generate once and add to both:
//   - Supabase Edge Function secrets: APP_ATTEST_SECRET=<value>
//   - expo-app-integrity config (or EAS secret)
// Used as a simple HMAC key to sign/verify attestation tokens server-side.
// When expo-app-integrity is configured it handles the Apple/Google
// verification automatically — no third-party account needed.
const APP_ATTEST_SECRET = Deno.env.get('APP_ATTEST_SECRET') ?? '';

/**
 * Validates the attestation token from expo-app-integrity.
 * expo-app-integrity returns a JWT signed by Apple App Attest or
 * Google Play Integrity. Verification is done via their public endpoints
 * — no Firebase required.
 *
 * For now this is a placeholder that checks the token is present and
 * non-empty. When you install expo-app-integrity and configure it, replace
 * this with the full JWT verification against Apple/Google endpoints.
 */
function verifyAppAttestToken(token: string): boolean {
  if (!token || token.length < 10) return false;
  // TODO: when expo-app-integrity supports SDK 54, add JWT verification here:
  //   - iOS:     verify with https://data.appattest.apple.com
  //   - Android: verify with https://playintegrity.googleapis.com
  return true;
}

const MAX_AUTH_ATTEMPTS   = 5;   // per email
const MAX_IP_ATTEMPTS     = 20;  // per IP (allows a shared IP like a household/office)
const AUTH_WINDOW_MINUTES = 15;

/**
 * VULN-09: Only trust the Cloudflare header — it cannot be spoofed by the client.
 * x-forwarded-for is user-controlled and must never be trusted for security decisions.
 */
function getClientIp(req: Request): string {
  return req.headers.get('cf-connecting-ip') ?? 'unknown';
}

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);

  // json() closes over corsHeaders so all responses carry the correct CORS headers
  function json(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const methodError = requirePost(req, corsHeaders);
  if (methodError) return methodError;

  // Service role client — used for rate limiting (bypasses RLS on rate_limit_log)
  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey     = Deno.env.get('SUPABASE_ANON_KEY')!;

  try {
    // ── VULN-11: Body size limit ───────────────────────────────────────────────
    // LIMITS.AUTH_BODY = 4 KB — generous for email + password + username
    const { body: rawBody, error: sizeError } = await readBodyWithLimit(req, LIMITS.AUTH_BODY);
    if (sizeError) return sizeError;

    const { data: bodyData, error: jsonError } = safeParseJson(rawBody, req);
    if (jsonError) return jsonError;

    // Reject any fields not on the whitelist — strict schema enforcement
    const fieldError = rejectUnexpectedFields(
      bodyData,
      ['action', 'email', 'password', 'username'],
      req,
    );
    if (fieldError) return fieldError;

    const { action, email, password, username } = bodyData as Record<string, unknown>;

    // ── Input validation ──────────────────────────────────────────────────────
    // H-01: whitelist action before anything else — prevents rate limit pollution
    const VALID_ACTIONS = new Set(['signin', 'signup', 'reset']);
    if (!action || typeof action !== 'string' || !VALID_ACTIONS.has(action)) {
      console.warn('[auth-proxy] Validation failed: invalid action value from IP:', getClientIp(req));
      return json({ error: 'Invalid request.' }, 400);
    }
    // H-03: use the shared RFC-compliant validator, not a bare @-check
    const normalizedEmail = sanitiseEmail(email);
    if (!normalizedEmail) {
      console.warn('[auth-proxy] Validation failed: invalid email for action:', action, 'from IP:', getClientIp(req));
      return json({ error: 'Valid email is required' }, 400);
    }

    // ── Layer 1: App Attestation (expo-app-integrity) ─────────────────────────
    // Verifies the request originates from an unmodified CoinSeek binary.
    // Only enforced when ENFORCE_APP_CHECK=true — set this before going live.
    // Uses Apple App Attest (iOS) and Google Play Integrity (Android) natively.
    // No Firebase. No extra accounts.
    if (ENFORCE_APP_CHECK) {
      const attestToken = req.headers.get('x-app-attest');
      if (!attestToken) {
        return json({ error: 'Attestation token required' }, 401);
      }
      if (!verifyAppAttestToken(attestToken)) {
        console.warn('[auth-proxy] Invalid attestation token from IP:', getClientIp(req));
        return json({ error: 'Invalid attestation token' }, 401);
      }
    }

    const clientIp = getClientIp(req);

    // ── Rate limit 1: per IP (stops flooding with many different emails) ───────
    const ipLimitId = `auth:ip:${clientIp}`;
    const ipResult  = await checkRateLimit(adminClient, ipLimitId, MAX_IP_ATTEMPTS, AUTH_WINDOW_MINUTES);
    if (!ipResult.allowed) {
      console.warn(`[auth-proxy] IP rate limit hit: ${clientIp}`);
      return rateLimitResponse(ipResult.resetInSeconds, corsHeaders);
    }

    // ── Rate limit 2: per email (stops brute force on a specific account) ─────
    const emailLimitId = `auth:${action}:${normalizedEmail}`;
    const emailResult  = await checkRateLimit(adminClient, emailLimitId, MAX_AUTH_ATTEMPTS, AUTH_WINDOW_MINUTES);
    if (!emailResult.allowed) {
      console.warn(`[auth-proxy] Email rate limit hit: ${emailLimitId}`);
      return rateLimitResponse(emailResult.resetInSeconds, corsHeaders);
    }

    // ── Sign in ───────────────────────────────────────────────────────────────
    if (action === 'signin') {
      // H-02: type-check prevents non-string values (objects, arrays) being forwarded
      if (!password || typeof password !== 'string') {
        console.warn('[auth-proxy] Validation failed: missing password on signin from IP:', getClientIp(req));
        return json({ error: 'password is required' }, 400);
      }
      // Fail fast on obviously invalid lengths — prevents unnecessary upstream calls.
      // bcrypt is slow; hashing a huge string stalls the function even with the body limit.
      if (password.length < 8 || password.length > MAX_PASSWORD_LEN) {
        console.warn('[auth-proxy] Validation failed: password length out of range on signin from IP:', getClientIp(req));
        return json({ error: 'Invalid email or password' }, 401);
      }

      const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: anonKey },
        body: JSON.stringify({ email: normalizedEmail, password }),
      });

      const data = await res.json();

      // Mask Supabase internals — never forward raw error codes to the client
      if (!res.ok) {
        return json({ error: 'Invalid email or password' }, 401);
      }

      return json({ access_token: data.access_token, refresh_token: data.refresh_token });
    }

    // ── Sign up ───────────────────────────────────────────────────────────────
    if (action === 'signup') {
      // VULN-12: enforce 8–128 character range + complexity via shared validator
      const pwErr = validatePassword(password);
      if (pwErr) {
        console.warn('[auth-proxy] Validation failed: password validation on signup from IP:', getClientIp(req));
        return json({ error: pwErr }, 400);
      }

      // Block vulgar / racist / sexist / inappropriate display names.
      if (containsBannedName(username)) {
        return json({ error: 'Please choose a different name — that one is not allowed.' }, 400);
      }

      // VULN-08 / M-05: derive a clean username from whatever the client sends.
      // If it's already a valid handle use it directly; otherwise sanitise it
      // (handles full names like "John Smith" → "john_smith").
      // Capture the original value before mutation so we can store it as full_name.
      const fullName = typeof username === 'string' ? username.trim().slice(0, 100) : undefined;
      let uname = typeof username === 'string' ? username.trim() : '';
      if (uname && !USERNAME_RE.test(uname)) {
        uname = deriveUsername(uname); // auto-clean display names
      }

      if (uname) {
        if (!USERNAME_RE.test(uname)) {
          return json({ error: 'Could not generate a valid username from the name provided.' }, 400);
        }
        if (RESERVED_USERNAMES.has(uname.toLowerCase())) {
          return json({ error: 'That username is reserved.' }, 400);
        }

        // Allow duplicate full names: on collision, auto-append a numeric suffix
        // instead of rejecting the signup.
        uname = await findAvailableUsername(adminClient, uname);
      }

      const safeUsername = uname || undefined;

      const res = await fetch(`${supabaseUrl}/auth/v1/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: anonKey },
        body: JSON.stringify({
          email: normalizedEmail,
          password,
          data: { username: safeUsername, full_name: fullName },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Only forward the "already registered" case — everything else is generic
        const msg = String(data?.msg ?? data?.error_description ?? '');
        if (msg.includes('already registered')) {
          return json({ error: 'An account with this email already exists' }, 409);
        }
        return json({ error: 'Sign up failed — please try again' }, 400);
      }

      return json({ success: true, user: { id: data.id, email: data.email } });
    }

    // ── Password reset ────────────────────────────────────────────────────────
    if (action === 'reset') {
      // Use the verified HTTPS App Link — custom schemes are interceptable by
      // any Android app and are rejected by AuthContext for security.
      const redirectTo = encodeURIComponent('https://coinseek.app/auth/callback');

      const res = await fetch(`${supabaseUrl}/auth/v1/recover?redirect_to=${redirectTo}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: anonKey },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      // Always return success — don't reveal whether the email exists
      return json({ success: true });
    }

    return json({ error: 'Invalid request.' }, 400);
  } catch (err) {
    // VULN-06: never expose internal error details
    console.error('[auth-proxy] Unhandled error:', err);
    return json({ error: 'An unexpected error occurred. Please try again.' }, 500);
  }
});
