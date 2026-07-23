import { useEffect, useRef } from 'react'
import { useAuth } from './auth'
import { useProfiles, type Profile } from './profiles'
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

/**
 * Cross-device sync of the account's "Who's watching" profiles list.
 *
 * The list lives in Supabase auth `user_metadata` (no table/migration needed,
 * and it rides along with the session on every device). On sign-in we merge the
 * cloud list into whatever exists locally; on change we debounce-push it back.
 * Must be mounted ABOVE the profile picker (it has to run before a profile is
 * selected — a brand-new device has no local profile yet).
 */
export function useProfilesSync() {
  const { user } = useAuth()
  const { profiles, deleted, hydrate } = useProfiles()
  const loadedFor = useRef<string | null>(null)
  const timer = useRef<number | null>(null)

  // Load + merge the cloud list (and tombstones) once per signed-in account.
  useEffect(() => {
    if (!supabase || !user) {
      loadedFor.current = null
      return
    }
    if (loadedFor.current === user.id) return
    const cloud = user.user_metadata?.profiles
    const cloudDeleted = user.user_metadata?.profilesDeleted
    if ((Array.isArray(cloud) && cloud.length) || (Array.isArray(cloudDeleted) && cloudDeleted.length)) {
      hydrate((cloud ?? []) as Profile[], (cloudDeleted ?? []) as string[])
    }
    loadedFor.current = user.id
  }, [user, hydrate])

  // Push the local list + tombstones up whenever they diverge from the cloud.
  useEffect(() => {
    if (!supabase || !user || loadedFor.current !== user.id) return
    const cloudProfiles = JSON.stringify(user.user_metadata?.profiles ?? [])
    const cloudDeleted = JSON.stringify(user.user_metadata?.profilesDeleted ?? [])
    if (JSON.stringify(profiles) === cloudProfiles && JSON.stringify(deleted) === cloudDeleted) return
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      supabase!.auth.updateUser({ data: { profiles, profilesDeleted: deleted } }).then(() => {})
    }, 900)
    return () => { if (timer.current) window.clearTimeout(timer.current) }
  }, [profiles, deleted, user])
}
