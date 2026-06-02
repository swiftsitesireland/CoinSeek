/**
 * Shared input validation, payload sanitisation, and CORS helpers.
 * VULN-06: generic errors only — never leak internals
 * VULN-07: CORS restricted to known origins
 */

// ─── Size limits ──────────────────────────────────────────────────────────────
export const LIMITS = {
  CHECKOUT_BODY:  2_048,        // 2 KB  — create-checkout
  VERIFY_BODY:    2_048,        // 2 KB  — verify-session
  WEBHOOK_BODY:   524_288,      // 512 KB — stripe-webhook (events can be large)
};

// ─── CORS helpers ─────────────────────────────────────────────────────────────
// M-01: localhost origins only allowed outside production
const IS_PROD = Deno.env.get('ENVIRONMENT') === 'production';

const ALLOWED_ORIGINS = new Set([
  'https://coinseek.app',
  'https://www.coinseek.app',
  // Only permitted in development — removed automatically in production
  ...(!IS_PROD ? ['http://localhost:8081', 'http://localhost:19006'] : []),
]);

/**
 * VULN-07: Returns CORS headers restricted to known origins.
 * Unknown origins still get a response but without Allow-Origin,
 * so browsers block the preflight.
 */
export function buildCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? '';
  const allowed = ALLOWED_ORIGINS.has(origin) ? origin : '';
  // L-03: no Content-Type here — set it per-response, not on CORS/OPTIONS headers
  return {
    'Access-Control-Allow-Origin':  allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-app-attest',
  };
}

// ─── Error response helpers ───────────────────────────────────────────────────

function jsonHeaders(req?: Request): Record<string, string> {
  return {
    ...(req ? buildCorsHeaders(req) : {}),
    'Content-Type': 'application/json',
  };
}

export function badRequest(message: string, req?: Request): Response {
  return new Response(JSON.stringify({ error: message }), { status: 400, headers: jsonHeaders(req) });
}

export function payloadTooLarge(req?: Request): Response {
  return new Response(JSON.stringify({ error: 'Payload too large.' }), { status: 413, headers: jsonHeaders(req) });
}

/** VULN-06: Never leaks internal error details to the client. */
export function internalError(req?: Request): Response {
  return new Response(
    JSON.stringify({ error: 'An unexpected error occurred. Please try again.' }),
    { status: 500, headers: jsonHeaders(req) },
  );
}

// ─── Body size guard ──────────────────────────────────────────────────────────
/**
 * Reads the raw body and rejects if it exceeds maxBytes.
 * Pass req so that error responses carry the correct CORS headers (M-02).
 */
export async function readBodyWithLimit(
  req: Request,
  maxBytes: number,
): Promise<{ body: string; error?: Response }> {
  // Fast-path: check Content-Length header first
  const contentLength = req.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > maxBytes) {
    return { body: '', error: payloadTooLarge(req) };
  }

  const body = await req.text();
  if (new TextEncoder().encode(body).length > maxBytes) {
    return { body: '', error: payloadTooLarge(req) };
  }

  return { body };
}

/**
 * Safely parse JSON, returning an error Response if the body is malformed.
 * Pass req so that error responses carry the correct CORS headers (M-02).
 */
export function safeParseJson(
  raw: string,
  req?: Request,
): { data: Record<string, unknown>; error?: Response } {
  try {
    const data = JSON.parse(raw);
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      return { data: {}, error: badRequest('Request body must be a JSON object.', req) };
    }
    return { data: data as Record<string, unknown> };
  } catch {
    return { data: {}, error: badRequest('Invalid JSON in request body.', req) };
  }
}

// ─── Field validators ─────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,253}\.[^\s@]{2,63}$/;

/** Returns sanitised + normalised email string or null. Never throws.
 *  M-03: strips Gmail-style + tags (user+tag@gmail.com → user@gmail.com)
 *  so attackers cannot create unlimited trial accounts from one real inbox.
 */
export function sanitiseEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim().toLowerCase().slice(0, 320);
  if (!EMAIL_RE.test(trimmed)) return null;
  const [local, domain] = trimmed.split('@');
  const normLocal = local.split('+')[0]; // strip + tag
  return `${normLocal}@${domain}`;
}

/** Plan must be exactly 'monthly' or 'yearly'. Defaults to 'yearly'. */
export function sanitisePlan(raw: unknown): 'monthly' | 'yearly' {
  if (raw === 'monthly') return 'monthly';
  return 'yearly';
}

/**
 * Stripe checkout session IDs look like: cs_live_... or cs_test_...
 * Max real-world length is ~200 chars; we allow up to 500 to be safe.
 */
const SESSION_ID_RE = /^cs_(live|test)_[a-zA-Z0-9]{20,400}$/;

export function sanitiseSessionId(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return SESSION_ID_RE.test(trimmed) ? trimmed : null;
}
