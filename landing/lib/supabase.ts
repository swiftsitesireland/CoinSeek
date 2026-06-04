import { createClient } from '@supabase/supabase-js'

// Uses the anon key — the waitlist table must have an RLS INSERT policy:
//
//   ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
//   CREATE POLICY "public_insert_waitlist"
//     ON waitlist FOR INSERT TO anon WITH CHECK (true);
//
// Run the above in the Supabase SQL editor, then rotate/delete the
// service role key that was previously used here.

export function getSupabase() {
  const url = process.env.SUPABASE_URL!
  const key = process.env.SUPABASE_ANON_KEY!
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY env vars')
  return createClient(url, key)
}
