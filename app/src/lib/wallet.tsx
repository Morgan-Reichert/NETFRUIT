import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Series } from '../data/series'
import { useAuth } from './auth'
import { supabase } from './supabase'

export type UnlockStatus = 'UNLOCKED' | 'ALREADY' | 'PREMIUM' | 'INSUFFICIENT' | 'NEEDS_PREMIUM' | 'NOTFOUND' | 'ERROR' | 'NO_AUTH'

interface WalletCtx {
  balance: number
  isPremium: boolean
  entitled: Set<string>      // series DB ids the viewer owns
  ready: boolean
  refresh: () => Promise<void>
  addTokens: (n: number) => Promise<void>
  setPremium: (on: boolean) => Promise<void>
  unlock: (seriesDbId: string) => Promise<UnlockStatus>
}

const Ctx = createContext<WalletCtx | null>(null)

/** True when a series requires an unlock the viewer doesn't yet have. */
export function isLocked(series: Series | null, w: Pick<WalletCtx, 'entitled' | 'isPremium'>): boolean {
  if (!series || !series.dbId) return false
  const mon = series.monetization ?? 'free'
  if (mon === 'free') return false
  if (w.entitled.has(series.dbId)) return false
  if (mon === 'subscription' && w.isPremium) return false
  return true
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [balance, setBalance] = useState(0)
  const [isPremium, setIsPremium] = useState(false)
  const [entitled, setEntitled] = useState<Set<string>>(new Set())
  const [ready, setReady] = useState(false)

  const refresh = async () => {
    if (!supabase || !user) { setBalance(0); setIsPremium(false); setEntitled(new Set()); setReady(true); return }
    try {
      const { data: w } = await supabase.rpc('ensure_wallet')
      const row = Array.isArray(w) ? w[0] : w
      if (row) { setBalance(row.tokens_balance ?? 0); setIsPremium(!!row.is_premium) }
      const { data: ents } = await supabase.from('entitlements').select('series_id')
      setEntitled(new Set((ents ?? []).map((e: { series_id: string }) => e.series_id)))
    } catch { /* monetization.sql not applied yet — degrade to free */ }
    setReady(true)
  }
  useEffect(() => { refresh() /* eslint-disable-next-line */ }, [user])

  const addTokens = async (n: number) => {
    if (!supabase || !user) return
    const { data } = await supabase.rpc('add_tokens', { n })
    const row = Array.isArray(data) ? data[0] : data
    if (row) setBalance(row.tokens_balance ?? balance)
  }
  const setPremium = async (on: boolean) => {
    if (!supabase || !user) return
    const { data } = await supabase.rpc('set_premium', { on_: on })
    const row = Array.isArray(data) ? data[0] : data
    if (row) setIsPremium(!!row.is_premium)
  }
  const unlock = async (seriesDbId: string): Promise<UnlockStatus> => {
    if (!supabase || !user) return 'NO_AUTH'
    const { data, error } = await supabase.rpc('unlock_series', { sid: seriesDbId })
    if (error) return 'ERROR'
    const status = data as UnlockStatus
    if (status === 'UNLOCKED' || status === 'PREMIUM' || status === 'ALREADY') {
      setEntitled((prev) => new Set(prev).add(seriesDbId))
      await refresh()
    }
    return status
  }

  return (
    <Ctx.Provider value={{ balance, isPremium, entitled, ready, refresh, addTokens, setPremium, unlock }}>
      {children}
    </Ctx.Provider>
  )
}

export function useWallet() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useWallet must be used within WalletProvider')
  return ctx
}
