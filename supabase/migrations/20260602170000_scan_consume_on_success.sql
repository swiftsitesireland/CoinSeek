-- ─── Consume scans only on a successful identification ───────────────────────
-- Previously identify-coin called check_and_increment_daily_scan BEFORE the
-- Gemini call, so any downstream failure (e.g. a retired model returning 404)
-- still burned the user's daily quota. Split the logic:
--   • check_daily_scan_limit  — read-only, run before Gemini
--   • consume_daily_scan      — increments, run only after a valid result
-- This keeps the server as the authoritative limit while ensuring failed scans
-- are never charged. Both remain SECURITY DEFINER so the edge function (service
-- role) can read subscriptions / write daily_scans.

-- Read-only: does the user have a scan available? Does NOT mutate anything.
CREATE OR REPLACE FUNCTION public.check_daily_scan_limit(
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
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.user_id = p_user_id AND s.status = 'active'
  ) INTO v_is_premium;

  IF v_is_premium THEN
    RETURN jsonb_build_object('allowed', true, 'scans_remaining', -1);
  END IF;

  SELECT count INTO v_count
  FROM public.daily_scans
  WHERE user_id = p_user_id AND scan_date = v_today;

  v_count := COALESCE(v_count, 0);

  RETURN jsonb_build_object(
    'allowed', v_count < v_limit,
    'scans_remaining', GREATEST(v_limit - v_count, 0)
  );
END;
$$;

-- Consume one scan. Called only after a successful identification. Still guards
-- the limit (defensive against races / direct calls) and returns the remaining
-- count for the day.
CREATE OR REPLACE FUNCTION public.consume_daily_scan(
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
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.user_id = p_user_id AND s.status = 'active'
  ) INTO v_is_premium;

  IF v_is_premium THEN
    RETURN jsonb_build_object('allowed', true, 'scans_remaining', -1);
  END IF;

  SELECT count INTO v_count
  FROM public.daily_scans
  WHERE user_id = p_user_id AND scan_date = v_today;

  v_count := COALESCE(v_count, 0);

  IF v_count >= v_limit THEN
    RETURN jsonb_build_object('allowed', false, 'scans_remaining', 0);
  END IF;

  INSERT INTO public.daily_scans (user_id, scan_date, count)
  VALUES (p_user_id, v_today, 1)
  ON CONFLICT (user_id, scan_date)
  DO UPDATE SET count = daily_scans.count + 1
  RETURNING count INTO v_count;

  RETURN jsonb_build_object(
    'allowed', true,
    'scans_remaining', GREATEST(v_limit - v_count, 0)
  );
END;
$$;
