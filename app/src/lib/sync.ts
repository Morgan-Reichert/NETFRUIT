import { useEffect, useRef } from 'react'
import { useAuth } from './auth'
import { useUser, type UserState } from './store'
import { supabase } from './supabase'

/**
 * Two-way sync of the user's likes/watches/basket with Supabase.
 * On sign-in we load the saved profile (merging in whatever was done while
 * logged out); on every change we debounce-upsert it back. No-ops when auth
 * isn't configured or nobody is signed in — localStorage keeps working.
 *
 * Requires a `profiles` table:
 *   create table profiles (
 *     id uuid primary key references auth.users on delete cascade,
 *     data jsonb, updated_at timestamptz default now()
 *   );
 *   alter table profiles enable row level security;
 *   create policy "own profile" on profiles
 *     for all using (auth.uid() = id) with check (auth.uid() = id);
 */
export function useCloudSync() {
  const { user } = useAuth()
  const { state, hydrate } = useUser()
  const loadedFor = useRef<string | null>(null)
  const timer = useRef<number | null>(null)

  // Load on sign-in
  useEffect(() => {
    if (!supabase || !user) {
      loadedFor.current = null
      return
    }
    if (loadedFor.current === user.id) return
    let cancelled = false
    ;(async () => {
      const { data } = await supabase!.from('profiles').select('data').eq('id', user.id).maybeSingle()
      if (cancelled) return
      if (data?.data) hydrate(data.data as UserState)
      loadedFor.current = user.id
    })()
    return () => { cancelled = true }
  }, [user, hydrate])

  // Save on change (debounced)
  useEffect(() => {
    if (!supabase || !user || loadedFor.current !== user.id) return
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      supabase!.from('profiles').upsert({ id: user.id, data: state }).then(() => {})
    }, 900)
    return () => { if (timer.current) window.clearTimeout(timer.current) }
  }, [state, user])
}
