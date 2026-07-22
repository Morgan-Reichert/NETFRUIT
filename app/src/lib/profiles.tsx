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
}

const KEY = 'netfruit.profiles.v1'
const ACTIVE = 'netfruit.profiles.active'
const ProfilesCtx = createContext<Ctx | null>(null)

// Stable id without Date.now/Math.random (blocked in some contexts): counter + name hash.
let seq = 0
function makeId(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return `p_${h.toString(36)}_${(seq++).toString(36)}`
}

function load(): Profile[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return []
}

export function ProfilesProvider({ children }: { children: ReactNode }) {
  const [profiles, setProfiles] = useState<Profile[]>(load)
  const [activeId, setActiveId] = useState<string | null>(() => {
    try { return localStorage.getItem(ACTIVE) } catch { return null }
  })

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(profiles)) } catch { /* ignore */ }
  }, [profiles])

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
    select: (id) => setActiveId(id),
    switchProfile: () => setActiveId(null),
    add: (name, avatar) => {
      const p: Profile = { id: makeId(name), name: name.trim() || 'Fruit Fan', avatar }
      setProfiles((prev) => [...prev, p])
      return p
    },
    update: (id, patch) => setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p))),
    remove: (id) => {
      setProfiles((prev) => prev.filter((p) => p.id !== id))
      setActiveId((cur) => (cur === id ? null : cur))
    },
  }), [profiles, activeId])

  return <ProfilesCtx.Provider value={value}>{children}</ProfilesCtx.Provider>
}

export function useProfiles() {
  const ctx = useContext(ProfilesCtx)
  if (!ctx) throw new Error('useProfiles must be used within ProfilesProvider')
  return ctx
}
