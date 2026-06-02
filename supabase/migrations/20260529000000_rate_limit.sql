-- ─── Rate limit tracking table ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.rate_limit_log (
  identifier  TEXT        NOT NULL,
  window_key  TEXT        NOT NULL,
  count       INTEGER     NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (identifier, window_key)
);

-- Only edge functions (service role) may read or write this table.
ALTER TABLE public.rate_limit_log ENABLE ROW LEVEL SECURITY;
-- No RLS policies → anon/authenticated roles are denied; service role bypasses RLS.

-- Index for fast lookups (the PK already covers this, but explicit for clarity)
CREATE INDEX IF NOT EXISTS idx_rate_limit_log_lookup
  ON public.rate_limit_log (identifier, window_key);

-- ─── Atomic increment function ───────────────────────────────────────────────
-- Returns the NEW count after incrementing.
-- SECURITY DEFINER so it can write to the table regardless of the caller's role.
CREATE OR REPLACE FUNCTION public.increment_rate_limit(
  p_identifier TEXT,
  p_window_key TEXT
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  INSERT INTO public.rate_limit_log (identifier, window_key, count)
  VALUES (p_identifier, p_window_key, 1)
  ON CONFLICT (identifier, window_key)
  DO UPDATE SET count = rate_limit_log.count + 1
  RETURNING count INTO v_count;

  RETURN v_count;
END;
$$;

-- ─── Cleanup function (call via a cron job or pg_cron if available) ───────────
CREATE OR REPLACE FUNCTION public.cleanup_rate_limit_log()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete entries older than 2 hours (well past any 15-minute window)
  DELETE FROM public.rate_limit_log
  WHERE created_at < now() - INTERVAL '2 hours';
END;
$$;
