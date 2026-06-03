/**
 * Shared input validation, payload sanitisation, and CORS helpers.
 * VULN-06: generic errors only — never leak internals
 * VULN-07: CORS restricted to known origins
 */

// ─── Size limits ──────────────────────────────────────────────────────────────
export const LIMITS = {
  AUTH_BODY:      4_096,         // 4 KB  — auth-proxy (email + password + username)
  CHECKOUT_BODY:  2_048,         // 2 KB  — create-checkout
  VERIFY_BODY:    2_048,         // 2 KB  — verify-session
  WEBHOOK_BODY:   524_288,       // 512 KB — stripe-webhook (events can be large)
  IDENTIFY_BODY:  10_485_760,    // 10 MB — identify-coin (two base64 images)
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

// ─── Strict schema enforcement ────────────────────────────────────────────────

/**
 * Returns a 400 response if `data` contains any key not in `allowed`.
 * Call this immediately after safeParseJson to reject unexpected fields before
 * any per-field validation runs. Returning null means all fields are allowed.
 */
export function rejectUnexpectedFields(
  data: Record<string, unknown>,
  allowed: readonly string[],
  req?: Request,
): Response | null {
  const allowedSet = new Set(allowed);
  const unexpected = Object.keys(data).filter((k) => !allowedSet.has(k));
  if (unexpected.length > 0) {
    return badRequest(`Unexpected field(s): ${unexpected.join(', ')}.`, req);
  }
  return null;
}

// ─── HTML escaping ────────────────────────────────────────────────────────────

/**
 * Escapes the five HTML-special characters so user-controlled strings (e.g.
 * email addresses) cannot inject markup into HTML email templates.
 */
export function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// ─── Method enforcement ───────────────────────────────────────────────────────

/**
 * Returns a 405 response if the request method is not POST.
 * Call before any auth or body parsing — OPTIONS is already handled by the
 * caller's preflight block and never reaches this check.
 */
export function requirePost(req: Request, corsHeaders?: Record<string, string>): Response | null {
  if (req.method === 'POST') return null;
  return new Response(
    JSON.stringify({ error: 'Method not allowed.' }),
    {
      status: 405,
      headers: {
        ...(corsHeaders ?? {}),
        'Content-Type': 'application/json',
        Allow: 'POST',
      },
    },
  );
}

// ─── No-body enforcement ──────────────────────────────────────────────────────

/**
 * Returns a 400 response if the request carries any body.
 * Reads the actual bytes — the Content-Length header alone is unreliable on
 * HTTP/2 and can be absent or spoofed.
 * Use for endpoints that take no input (cancel-subscription, delete-account,
 * export-data, send-trial-reminder).
 */
export async function rejectBody(req: Request, corsHeaders?: Record<string, string>): Promise<Response | null> {
  const text = await req.text();
  if (text.length === 0) return null;
  return new Response(
    JSON.stringify({ error: 'This endpoint does not accept a request body.' }),
    {
      status: 400,
      headers: { ...(corsHeaders ?? {}), 'Content-Type': 'application/json' },
    },
  );
}

// ─── Password validation ──────────────────────────────────────────────────────

// 128-char ceiling prevents bcrypt-DoS — bcrypt truncates at 72 bytes but
// some implementations hash the full string before truncating, making very
// long passwords expensive to process.
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 128;

/**
 * Validates a password value against length and complexity rules.
 * Returns a human-readable error string on the first violation, or null if valid.
 * Never logs or echoes the password value.
 */
export function validatePassword(raw: unknown): string | null {
  if (typeof raw !== 'string') return 'password must be a string.';
  if (raw.length < PASSWORD_MIN) return `Password must be at least ${PASSWORD_MIN} characters.`;
  if (raw.length > PASSWORD_MAX) return `Password must be at most ${PASSWORD_MAX} characters.`;
  if (!/[A-Za-z]/.test(raw)) return 'Password must contain at least one letter.';
  if (!/[0-9]/.test(raw)) return 'Password must contain at least one number.';
  return null;
}
