// Pure scan-limit helpers — no React/Redux/Supabase imports, so they are
// trivially unit-testable in isolation (jest can import this without pulling in
// the untransformed react-redux ESM bundle).

export const MAX_FREE_SCANS = 3;

/** Remaining scans → scans used, clamped to [0, limit]. Premium = -1 → 0. */
export function usedFromRemaining(limit, remaining) {
  if (remaining < 0) return 0; // premium / unlimited
  return Math.max(0, limit - remaining);
}

/** Milliseconds from `now` until the next UTC midnight (server reset boundary). */
export function msUntilUtcMidnight(now) {
  const next = new Date(now);
  next.setUTCHours(24, 0, 0, 0);
  return next - now;
}

/** Today's date as a UTC YYYY-MM-DD key (matches the server's scan_date). */
export function utcDateKey() {
  return new Date().toISOString().slice(0, 10);
}
