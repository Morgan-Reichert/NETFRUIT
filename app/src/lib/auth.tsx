import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { authEnabled, supabase } from './supabase'

interface AuthCtx {
  user: User | null
  session: Session | null
  loading: boolean
  enabled: boolean
  signUp: (email: string, password: string, meta?: Record<string, unknown>) => Promise<{ error?: string; needsConfirm?: boolean }>
  signIn: (email: string, password: string) => Promise<{ error?: string }>
  signInWithGoogle: () => Promise<{ error?: string }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error?: string }>
  updatePassword: (password: string) => Promise<{ error?: string }>
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(authEnabled)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  const value: AuthCtx = {
    user: session?.user ?? null,
    session,
    loading,
    enabled: authEnabled,
    async signUp(email, password, meta) {
      if (!supabase) return { error: 'Auth not configured yet.' }
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: meta } })
      if (error) return { error: error.message }
      // If email confirmation is on, there is no active session yet.
      return { needsConfirm: !data.session }
    },
    async signIn(email, password) {
      if (!supabase) return { error: 'Auth not configured yet.' }
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      return error ? { error: error.message } : {}
    },
    async signInWithGoogle() {
      if (!supabase) return { error: 'Auth not configured yet.' }
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      })
      return error ? { error: error.message } : {}
    },
    async signOut() {
      await supabase?.auth.signOut()
    },
    async resetPassword(email) {
      if (!supabase) return { error: 'Auth not configured yet.' }
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      return error ? { error: error.message } : {}
    },
    async updatePassword(password) {
      if (!supabase) return { error: 'Auth not configured yet.' }
      const { error } = await supabase.auth.updateUser({ password })
      return error ? { error: error.message } : {}
    },
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
