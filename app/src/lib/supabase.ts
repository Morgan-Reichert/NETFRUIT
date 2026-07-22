import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Vite exposes VITE_-prefixed env vars to the client. The anon key is public
// by design (row-level security protects data), so this is safe to ship.
const env = import.meta.env as Record<string, string | undefined>
const url = env.VITE_SUPABASE_URL
const anonKey = env.VITE_SUPABASE_ANON_KEY

/** null until the Supabase project URL + anon key are configured. */
export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null

export const authEnabled = supabase !== null
