-- ─── Coin collection ─────────────────────────────────────────────────────────
-- Authoritative definition of user_coins. The table was previously hand-created
-- with no migration, and two client services disagreed on its schema (flat
-- columns vs a JSONB `coin`). We standardize on JSONB so the FULL coin object —
-- including description/obverse/reverse/designer/series/tags — round-trips.
--
-- `id` is TEXT, not uuid: ids are generated client-side by the Redux collection
-- slice (localId()) and the collectionSyncMiddleware upserts rows keyed on them.
-- A server-generated uuid PK would break that client-id upsert path.
--
-- Clean cutover: existing dev rows are not migrated.

CREATE TABLE IF NOT EXISTS public.user_coins (
  id              TEXT PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coin            JSONB NOT NULL,
  quantity        INTEGER NOT NULL DEFAULT 1,
  condition       TEXT,
  purchase_price  NUMERIC,
  notes           TEXT DEFAULT '',
  date_added      TIMESTAMPTZ NOT NULL DEFAULT now(),
  front_image_uri TEXT,
  back_image_uri  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Idempotent column adds in case a divergent hand-made table already exists.
ALTER TABLE public.user_coins ADD COLUMN IF NOT EXISTS coin            JSONB;
ALTER TABLE public.user_coins ADD COLUMN IF NOT EXISTS quantity        INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.user_coins ADD COLUMN IF NOT EXISTS condition       TEXT;
ALTER TABLE public.user_coins ADD COLUMN IF NOT EXISTS purchase_price  NUMERIC;
ALTER TABLE public.user_coins ADD COLUMN IF NOT EXISTS notes           TEXT DEFAULT '';
ALTER TABLE public.user_coins ADD COLUMN IF NOT EXISTS date_added      TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.user_coins ADD COLUMN IF NOT EXISTS front_image_uri TEXT;
ALTER TABLE public.user_coins ADD COLUMN IF NOT EXISTS back_image_uri  TEXT;
ALTER TABLE public.user_coins ADD COLUMN IF NOT EXISTS created_at      TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.user_coins ADD COLUMN IF NOT EXISTS updated_at      TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS user_coins_user_date_idx
  ON public.user_coins (user_id, date_added DESC);

-- ─── RLS: each user CRUDs only their own coins ───────────────────────────────
ALTER TABLE public.user_coins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_coins_select ON public.user_coins;
CREATE POLICY user_coins_select ON public.user_coins
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS user_coins_insert ON public.user_coins;
CREATE POLICY user_coins_insert ON public.user_coins
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS user_coins_update ON public.user_coins;
CREATE POLICY user_coins_update ON public.user_coins
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS user_coins_delete ON public.user_coins;
CREATE POLICY user_coins_delete ON public.user_coins
  FOR DELETE USING (auth.uid() = user_id);
