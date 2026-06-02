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
    // VULN-05: fail CLOSED (deny) so a DB outage cannot be used to bypass rate limits
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
 * Standard 429 response body with a Retry-After header.
 */
export function rateLimitResponse(resetInSeconds: number): Response {
  return new Response(
    JSON.stringify({ error: 'Too many requests — please try again later.' }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(resetInSeconds),
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    },
  );
}
