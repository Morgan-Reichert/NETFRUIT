import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export interface Profile {
  id: string
  name: string
  avatar: string // fruit key → /avatars/<avatar>.png
}

/** The 20 generated fruit avatars available for profiles. */
export const AVATARS = [
  'strawberry', 'blueberry', 'grape', 'orange', 'watermelon', 'lemon', 'cherry', 'peach',
  'banana', 'pineapple', 'kiwi', 'mango', 'coconut', 'apple', 'avocado', 'dragonfruit',
  'pear', 'raspberry', 'pomegranate', 'lime',
]
export const avatarUrl = (a: string) => `/avatars/${a}.png`

interface Ctx {
  profiles: Profile[]
  activeId: string | null
  active: Profile | null
  select: (id: string) => void
  switchProfile: () => void
  add: (name: string, avatar: string) => Profile
  update: (id: string, patch: Partial<Omit<Profile, 'id'>>) => void
  remove: (id: string) => void
  /** Ids of profiles deleted on this account — tombstones, so deletes sync. */
  deleted: string[]
  /** Merge a cloud-loaded list + tombstones into the local state. */
  hydrate: (incoming: Profile[], incomingDeleted?: string[]) => void
}

/** Union by id: keep every local profile, add/refresh with any from the cloud. */
export function mergeProfiles(local: Profile[], incoming: Profile[]): Profile[] {
  const byId = new Map(local.map((p) => [p.id, p]))
  for (const p of incoming) byId.set(p.id, { ...byId.get(p.id), ...p })
  return [...byId.values()]
}

const KEY = 'netfruit.profiles.v1'
const DEL = 'netfruit.profiles.deleted.v1'
const ACTIVE = 'netfruit.profiles.active'
const ProfilesCtx = createContext<Ctx | null>(null)

const union = (a: string[], b: string[]) => [...new Set([...a, ...b])]

// Stable id without Date.now/Math.random (blocked in some contexts): counter + name hash.
let seq = 0
function makeId(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return `p_${h.toString(36)}_${(seq++).toString(36)}`
}

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return fallback
}

export function ProfilesProvider({ children }: { children: ReactNode }) {
  const [profiles, setProfiles] = useState<Profile[]>(() => loadJSON<Profile[]>(KEY, []))
  const [deleted, setDeleted] = useState<string[]>(() => loadJSON<string[]>(DEL, []))
  const [activeId, setActiveId] = useState<string | null>(() => {
    try { return localStorage.getItem(ACTIVE) } catch { return null }
  })

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(profiles)) } catch { /* ignore */ }
  }, [profiles])

  useEffect(() => {
    try { localStorage.setItem(DEL, JSON.stringify(deleted)) } catch { /* ignore */ }
  }, [deleted])

  useEffect(() => {
    try {
      if (activeId) localStorage.setItem(ACTIVE, activeId)
      else localStorage.removeItem(ACTIVE)
    } catch { /* ignore */ }
  }, [activeId])

  const value = useMemo<Ctx>(() => ({
    profiles,
    activeId,
    active: profiles.find((p) => p.id === activeId) ?? null,
    deleted,
    select: (id) => setActiveId(id),
    switchProfile: () => setActiveId(null),
    add: (name, avatar) => {
      const p: Profile = { id: makeId(name), name: name.trim() || 'Fruit Fan', avatar }
      setProfiles((prev) => [...prev, p])
      // Un-tombstone in the unlikely event this id was previously deleted.
      setDeleted((prev) => prev.filter((d) => d !== p.id))
      return p
    },
    update: (id, patch) => setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p))),
    remove: (id) => {
      setProfiles((prev) => prev.filter((p) => p.id !== id))
      setDeleted((prev) => (prev.includes(id) ? prev : [...prev, id]))
      setActiveId((cur) => (cur === id ? null : cur))
    },
    hydrate: (incoming, incomingDeleted = []) => {
      const del = union(deleted, incomingDeleted)
      setDeleted(del)
      // Union the lists, then drop anything tombstoned on any device.
      setProfiles((prev) => mergeProfiles(prev, incoming).filter((p) => !del.includes(p.id)))
      // If the profile active on THIS device was deleted elsewhere, bounce to the picker.
      setActiveId((cur) => (cur && del.includes(cur) ? null : cur))
    },
  }), [profiles, activeId, deleted])

  return <ProfilesCtx.Provider value={value}>{children}</ProfilesCtx.Provider>
}

export function useProfiles() {
  const ctx = useContext(ProfilesCtx)
  if (!ctx) throw new Error('useProfiles must be used within ProfilesProvider')
  return ctx
}
