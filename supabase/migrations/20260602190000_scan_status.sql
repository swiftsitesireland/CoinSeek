-- ─── Read-only daily scan status ─────────────────────────────────────────────
-- Lets the CLIENT read its authoritative remaining-scan count on load (like XP),
-- WITHOUT consuming a scan. The daily_scans table is service-role only, so this
-- SECURITY DEFINER function is the safe, narrow read path. Uses auth.uid() so a
-- caller can only ever see their own count. Limit (3) matches MAX_FREE_SCANS and
-- check_and_increment_daily_scan.
CREATE OR REPLACE FUNCTION public.get_daily_scan_status()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit      CONSTANT INTEGER := 3;
  v_today      DATE := (now() AT TIME ZONE 'utc')::date;
  v_uid        UUID := auth.uid();
  v_is_premium BOOLEAN;
  v_count      INTEGER;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.user_id = v_uid AND s.status = 'active'
  ) INTO v_is_premium;

  IF v_is_premium THEN
    RETURN jsonb_build_object(
      'is_premium', true, 'scans_used', 0,
      'scans_remaining', -1, 'scan_limit', v_limit);
  END IF;

  SELECT count INTO v_count
  FROM public.daily_scans
  WHERE user_id = v_uid AND scan_date = v_today;

  v_count := COALESCE(v_count, 0);

  RETURN jsonb_build_object(
    'is_premium', false,
    'scans_used', v_count,
    'scans_remaining', GREATEST(v_limit - v_count, 0),
    'scan_limit', v_limit);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_daily_scan_status() TO authenticated;
