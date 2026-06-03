import { createClient } from '@supabase/supabase-js'

// Lazily create the client so it is only instantiated at request time,
// not at build time when env vars may be absent.
export function getSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL!
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(supabaseUrl, supabaseKey)
}
