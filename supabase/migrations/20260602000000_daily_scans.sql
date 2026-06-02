-- ─── Daily scan tracking ─────────────────────────────────────────────────────
-- Server-side enforcement of the free-tier daily scan limit (VULN-02). The app
-- counter is advisory only; this table/function is the source of truth so a
-- modified client cannot bypass the limit. Referenced by:
--   • supabase/functions/identify-coin/index.ts  (check_and_increment_daily_scan)
--   • supabase/functions/delete-account/index.ts (GDPR erasure)

-- Free users get this many scans per UTC day. Premium = unlimited.
-- Keep in sync with the "3 scans per day" copy in OnboardingScreen.
-- (Inlined as a literal below; Postgres has no cheap per-DB constant.)

CREATE TABLE IF NOT EXISTS public.daily_scans (
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scan_date  DATE NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  count      INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, scan_date)
);

-- Only edge functions (service role) may read or write this table.
ALTER TABLE public.daily_scans ENABLE ROW LEVEL SECURITY;
-- No RLS policies → anon/authenticated roles are denied; service role bypasses RLS.

-- ─── Atomic check-and-increment ──────────────────────────────────────────────
-- Returns JSON: { allowed: boolean, scans_remaining: integer }
--   • Premium (active subscription) → always allowed, scans_remaining = -1 (∞)
--   • Free → allowed while today's count < limit; increments on success only.
-- SECURITY DEFINER so it can read subscriptions / write daily_scans regardless
-- of the caller's role.
-- Drop first: an earlier hand-run version of this function may exist with a
-- different return type, and CREATE OR REPLACE cannot change a return type
-- (SQLSTATE 42P13). Dropping makes this migration idempotent across environments
-- where the function was applied manually.
DROP FUNCTION IF EXISTS public.check_and_increment_daily_scan(uuid);
CREATE OR REPLACE FUNCTION public.check_and_increment_daily_scan(
  p_user_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit      CONSTANT INTEGER := 3;
  v_today      DATE := (now() AT TIME ZONE 'utc')::date;
  v_is_premium BOOLEAN;
  v_count      INTEGER;
BEGIN
  -- Premium users have an active subscription → unlimited scans.
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.user_id = p_user_id
      AND s.status = 'active'
  ) INTO v_is_premium;

  IF v_is_premium THEN
    RETURN jsonb_build_object('allowed', true, 'scans_remaining', -1);
  END IF;

  -- Free tier: read today's count (default 0 if no row yet).
  SELECT count INTO v_count
  FROM public.daily_scans
  WHERE user_id = p_user_id AND scan_date = v_today;

  v_count := COALESCE(v_count, 0);

  IF v_count >= v_limit THEN
    RETURN jsonb_build_object('allowed', false, 'scans_remaining', 0);
  END IF;

  -- Atomically increment (insert today's row or bump the existing one).
  INSERT INTO public.daily_scans (user_id, scan_date, count)
  VALUES (p_user_id, v_today, 1)
  ON CONFLICT (user_id, scan_date)
  DO UPDATE SET count = daily_scans.count + 1
  RETURNING count INTO v_count;

  RETURN jsonb_build_object('allowed', true, 'scans_remaining', GREATEST(v_limit - v_count, 0));
END;
$$;

-- ─── Cleanup (call via cron / pg_cron) ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.cleanup_daily_scans()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Drop rows older than 7 days — only today's count is ever read.
  DELETE FROM public.daily_scans
  WHERE scan_date < (now() AT TIME ZONE 'utc')::date - INTERVAL '7 days';
END;
$$;
