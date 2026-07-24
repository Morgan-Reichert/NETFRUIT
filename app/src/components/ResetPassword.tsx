import { useState } from 'react'
import { useAuth } from '../lib/auth'

/** Landing page for the password-reset email link (redirectTo /reset-password).
 *  Supabase puts a recovery session in the URL, so updateUser({password}) works. */
export default function ResetPassword() {
  const { updatePassword } = useAuth()
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const submit = async () => {
    if (password.length < 6) { setMsg('6 caractères minimum.'); return }
    setBusy(true); setMsg(null)
    const r = await updatePassword(password)
    setBusy(false)
    if (r.error) setMsg(r.error)
    else setDone(true)
  }

  return (
    <div className="grid min-h-screen place-items-center bg-ink-950 px-5 text-cream">
      <div className="w-full max-w-sm text-center">
        <img src="/brand/netfruit-long.png" alt="NETFRUIT" className="mx-auto mb-8 h-8 w-auto" />
        {done ? (
          <div>
            <h1 className="font-display text-2xl font-extrabold">Mot de passe mis à jour ✓</h1>
            <a href="/" className="mt-5 inline-block rounded-full bg-fruit-red-bright px-6 py-2.5 font-bold text-white hover:brightness-110">Continuer</a>
          </div>
        ) : (
          <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-left">
            <h1 className="font-display text-xl font-bold">Nouveau mot de passe</h1>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Nouveau mot de passe" className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-3 outline-none focus:border-white/40" />
            {msg && <p className="text-sm text-fruit-red-bright">{msg}</p>}
            <button disabled={busy} onClick={submit} className="w-full rounded-full bg-fruit-red-bright px-6 py-3 font-bold text-white enabled:hover:brightness-110 disabled:opacity-50">
              {busy ? '…' : 'Enregistrer'}
            </button>
            <a href="/" className="block text-center text-sm text-cream/50 hover:text-cream">Annuler</a>
          </div>
        )}
      </div>
    </div>
  )
}
