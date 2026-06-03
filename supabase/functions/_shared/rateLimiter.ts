import { SupabaseClient } from 'npm:@supabase/supabase-js@2';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
}

/**
 * Returns the key for the current sliding window.
 * e.g. for windowMinutes=15: each key covers a 15-minute block since Unix epoch.
 */
function getWindowKey(windowMinutes: number): string {
  const windowMs = windowMinutes * 60_000;
  return String(Math.floor(Date.now() / windowMs));
}

/**
 * Seconds until the current window expires.
 */
function getResetInSeconds(windowMinutes: number): number {
  const windowMs = windowMinutes * 60_000;
  const windowIndex = Math.floor(Date.now() / windowMs);
  return Math.ceil(((windowIndex + 1) * windowMs - Date.now()) / 1000);
}

/**
 * Atomically increments the counter for `identifier` in the current window
 * and returns whether the request is within the allowed limit.
 *
 * Uses the `increment_rate_limit` Postgres function (SECURITY DEFINER)
 * so it works even with RLS enabled on rate_limit_log.
 *
 * If the DB call fails for any reason, the request is ALLOWED (fail-open)
 * so a DB hiccup doesn't lock out all users.
 */
export async function checkRateLimit(
  adminClient: SupabaseClient,
  identifier: string,
  maxRequests: number,
  windowMinutes: number,
): Promise<RateLimitResult> {
  const windowKey     = getWindowKey(windowMinutes);
  const resetInSeconds = getResetInSeconds(windowMinutes);

  const { data: count, error } = await adminClient.rpc('increment_rate_limit', {
    p_identifier: identifier,
    p_window_key: windowKey,
  });

  if (error) {
    console.error('[rate-limit] RPC error:', error.message);
    // VULN-05: fail CLOSED (deny) — a DB outage must not become a rate-limit bypass.
    // Intentionally returns allowed:false even though this blocks legitimate traffic;
    // accepting a brief outage is safer than allowing unbounded requests.
    return { allowed: false, remaining: 0, resetInSeconds };
  }

  const currentCount = count as number;
  const remaining    = Math.max(0, maxRequests - currentCount);

  return {
    allowed: currentCount <= maxRequests,
    remaining,
    resetInSeconds,
  };
}

/**
 * Standard 429 response with a Retry-After header.
 *
 * Pass the request-scoped `corsHeaders` (from buildCorsHeaders(req)) so the
 * 429 honours the same strict origin whitelist as every other response.
 * Omitting corsHeaders falls back to Access-Control-Allow-Origin: * only as a
 * last resort (e.g. unit tests without a Request object).
 */
export function rateLimitResponse(
  resetInSeconds: number,
  corsHeaders?: Record<string, string>,
): Response {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Retry-After': String(resetInSeconds),
    // Use caller-supplied CORS headers (scoped to the request's origin) when
    // available; fall back to wildcard only when there is no request context.
    ...(corsHeaders ?? {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    }),
  };
  return new Response(
    JSON.stringify({ error: 'Too many requests — please try again later.' }),
    { status: 429, headers },
  );
}
