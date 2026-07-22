import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { useAuth } from '../lib/auth'
import { CloseIcon } from './icons'

export default function AuthModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { signIn, signUp, signInWithGoogle, enabled } = useAuth()
  const [mode, setMode] = useState<'in' | 'up'>('up')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'err' | 'ok'; text: string } | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    const res = mode === 'up' ? await signUp(email, password) : await signIn(email, password)
    setBusy(false)
    if (res.error) setMsg({ kind: 'err', text: res.error })
    else if ('needsConfirm' in res && res.needsConfirm)
      setMsg({ kind: 'ok', text: 'Check your inbox to confirm your email, then sign in.' })
    else onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[120] grid place-items-center bg-black/75 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="relative w-full max-w-md overflow-hidden rounded-2xl bg-ink-900 p-7 shadow-2xl ring-1 ring-white/10"
            initial={{ opacity: 0, y: 30, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }} transition={{ type: 'spring', damping: 26, stiffness: 260 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 text-cream/60 transition hover:text-cream">
              <CloseIcon size={20} />
            </button>

            <img src="/brand/netfruit-long.png" alt="NETFRUIT" className="mb-5 h-7 w-auto brightness-125 saturate-150 drop-shadow-[0_0_14px_rgba(255,39,64,0.45)]" />
            <h2 className="font-display text-2xl font-extrabold text-cream">
              {mode === 'up' ? 'Create your account' : 'Welcome back'}
            </h2>
            <p className="mt-1 text-sm text-cream/60">
              {mode === 'up' ? 'Join NETFRUIT to save your basket and pick up where you left off.' : 'Sign in to your NETFRUIT account.'}
            </p>

            {!enabled && (
              <p className="mt-4 rounded-lg border border-orange/30 bg-orange/10 px-3 py-2 text-xs text-orange">
                Auth isn't wired up yet — add your Supabase keys to <code>.env</code> (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).
              </p>
            )}

            <form onSubmit={submit} className="mt-5 space-y-3">
              <input
                type="email" required placeholder="Email" value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-cream placeholder-cream/40 outline-none transition focus:border-fruit-red-bright"
              />
              <input
                type="password" required minLength={6} placeholder="Password (min. 6 characters)" value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-cream placeholder-cream/40 outline-none transition focus:border-fruit-red-bright"
              />
              {msg && (
                <p className={`text-sm ${msg.kind === 'err' ? 'text-strawberry' : 'text-lime'}`}>{msg.text}</p>
              )}
              <button
                type="submit" disabled={busy || !enabled}
                className="w-full rounded-full bg-fruit-red-bright py-2.5 font-bold text-white transition hover:brightness-110 disabled:opacity-50"
              >
                {busy ? 'Please wait…' : mode === 'up' ? 'Sign up' : 'Sign in'}
              </button>
            </form>

            <div className="my-4 flex items-center gap-3 text-xs text-cream/40">
              <span className="h-px flex-1 bg-white/10" /> or <span className="h-px flex-1 bg-white/10" />
            </div>
            <button
              onClick={() => signInWithGoogle()} disabled={!enabled}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-white/15 py-2.5 font-semibold text-cream transition hover:border-white/40 disabled:opacity-50"
            >
              <GoogleGlyph /> Continue with Google
            </button>

            <p className="mt-5 text-center text-sm text-cream/60">
              {mode === 'up' ? 'Already have an account?' : "New to NETFRUIT?"}{' '}
              <button
                onClick={() => { setMode(mode === 'up' ? 'in' : 'up'); setMsg(null) }}
                className="font-semibold text-cream underline-offset-2 hover:underline"
              >
                {mode === 'up' ? 'Sign in' : 'Create one'}
              </button>
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  )
}
