import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react'

export interface WatchRecord {
  progress: number // 0..1
  updatedAt: number // event counter (monotonic, avoids Date in render)
  ep?: number // last episode watched (for resume)
  time?: number // seconds into that episode (for resume)
}

export interface UserState {
  watched: Record<string, WatchRecord>
  liked: Record<string, true>
  disliked: Record<string, true>
  myList: Record<string, true>
  clock: number // monotonic counter used as a lightweight timestamp
}

const EMPTY: UserState = {
  watched: {},
  liked: {},
  disliked: {},
  myList: {},
  clock: 0,
}

type Action =
  | { type: 'watch'; id: string; progress?: number }
  | { type: 'progress'; id: string; progress: number; ep: number; time: number }
  | { type: 'like'; id: string }
  | { type: 'dislike'; id: string }
  | { type: 'toggleList'; id: string }
  | { type: 'hydrate'; state: UserState }
  | { type: 'reset' }

function reducer(state: UserState, action: Action): UserState {
  const clock = state.clock + 1
  switch (action.type) {
    case 'watch': {
      const prev = state.watched[action.id]
      const progress = action.progress ?? Math.min(1, (prev?.progress ?? 0) + 0.15)
      return {
        ...state,
        clock,
        watched: { ...state.watched, [action.id]: { ...state.watched[action.id], progress, updatedAt: clock } },
      }
    }
    case 'progress': {
      return {
        ...state,
        clock,
        watched: {
          ...state.watched,
          [action.id]: { progress: action.progress, ep: action.ep, time: action.time, updatedAt: clock },
        },
      }
    }
    case 'like': {
      const liked = { ...state.liked }
      const disliked = { ...state.disliked }
      if (liked[action.id]) delete liked[action.id]
      else {
        liked[action.id] = true
        delete disliked[action.id]
      }
      return { ...state, clock, liked, disliked }
    }
    case 'dislike': {
      const disliked = { ...state.disliked }
      const liked = { ...state.liked }
      if (disliked[action.id]) delete disliked[action.id]
      else {
        disliked[action.id] = true
        delete liked[action.id]
      }
      return { ...state, clock, liked, disliked }
    }
    case 'toggleList': {
      const myList = { ...state.myList }
      if (myList[action.id]) delete myList[action.id]
      else myList[action.id] = true
      return { ...state, clock, myList }
    }
    case 'hydrate':
      return { ...EMPTY, ...action.state, clock }
    case 'reset':
      return { ...EMPTY }
    default:
      return state
  }
}

const keyFor = (profileId: string) => `netfruit.user.v1.${profileId}`

function load(profileId: string): UserState {
  try {
    const raw = localStorage.getItem(keyFor(profileId))
    if (raw) return { ...EMPTY, ...JSON.parse(raw) }
  } catch {
    /* ignore */
  }
  return EMPTY
}

interface Ctx {
  state: UserState
  watch: (id: string, progress?: number) => void
  saveProgress: (id: string, p: { progress: number; ep: number; time: number }) => void
  like: (id: string) => void
  dislike: (id: string) => void
  toggleList: (id: string) => void
  hydrate: (state: UserState) => void
  reset: () => void
}

const UserCtx = createContext<Ctx | null>(null)

export function UserProvider({ children, profileId = 'default' }: { children: ReactNode; profileId?: string }) {
  const [state, dispatch] = useReducer(reducer, profileId, load)

  useEffect(() => {
    try {
      localStorage.setItem(keyFor(profileId), JSON.stringify(state))
    } catch {
      /* ignore */
    }
  }, [state, profileId])

  const value = useMemo<Ctx>(
    () => ({
      state,
      watch: (id, progress) => dispatch({ type: 'watch', id, progress }),
      saveProgress: (id, p) => dispatch({ type: 'progress', id, ...p }),
      like: (id) => dispatch({ type: 'like', id }),
      dislike: (id) => dispatch({ type: 'dislike', id }),
      toggleList: (id) => dispatch({ type: 'toggleList', id }),
      hydrate: (s) => dispatch({ type: 'hydrate', state: s }),
      reset: () => dispatch({ type: 'reset' }),
    }),
    [state],
  )

  return <UserCtx.Provider value={value}>{children}</UserCtx.Provider>
}

export function useUser() {
  const ctx = useContext(UserCtx)
  if (!ctx) throw new Error('useUser must be used within UserProvider')
  return ctx
}
