import { useState } from 'react'
import { useAuth } from '../lib/auth'

const GENRES = ['Romance', 'Comédie', 'Drame', 'Thriller', 'Action', 'Fantastique', 'Horreur', 'Sci-Fi', 'Mystère', 'Feel-good']
type Mode = 'login' | 'signup' | 'forgot'

export default function AuthScreen() {
  const { signIn, signUp, signInWithGoogle, resetPassword } = useAuth()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [birthYear, setBirthYear] = useState('')
  const [genres, setGenres] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const toggleGenre = (g: string) => setGenres((p) => (p.includes(g) ? p.filter((x) => x !== g) : [...p, g]))
  const year = new Date().getFullYear()
  const age = birthYear ? year - parseInt(birthYear, 10) : 0
  const validYear = age >= 4 && age <= 120

  const submit = async () => {
    setMsg(null); setInfo(null); setBusy(true)
    if (mode === 'forgot') {
      const r = await resetPassword(email.trim())
      setBusy(false)
      if (r.error) setMsg(r.error)
      else setInfo('Si un compte existe, un email de réinitialisation vient d’être envoyé.')
      return
    }
    if (mode === 'signup') {
      if (!validYear) { setBusy(false); setMsg('Indique une année de naissance valide.'); return }
      const r = await signUp(email.trim(), password, { birth_year: parseInt(birthYear, 10), fav_genres: genres })
      setBusy(false)
      if (r.error) setMsg(r.error)
      else if (r.needsConfirm) setInfo('Compte créé ! Confirme ton email pour te connecter.')
      // else: onAuthStateChange logs them in automatically
      return
    }
    const r = await signIn(email.trim(), password)
    setBusy(false)
    if (r.error) setMsg('Email ou mot de passe incorrect.')
  }

  return (
    <div className="grid min-h-screen place-items-center bg-ink-950 px-5 py-10 text-cream">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <img src="/brand/netfruit-long.png" alt="NETFRUIT" className="mx-auto h-9 w-auto" />
          <p className="mt-3 text-cream/60">
            {mode === 'login' ? 'Connecte-toi pour regarder' : mode === 'signup' ? 'Crée ton compte NETFRUIT' : 'Réinitialise ton mot de passe'}
          </p>
        </div>

        <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email" className={inp} />
          {mode !== 'forgot' && (
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Mot de passe (min. 6 caractères)" className={inp} />
          )}

          {mode === 'signup' && (
            <>
              <label className="block">
                <span className="mb-1 block text-sm text-cream/70">Ton année de naissance</span>
                <input value={birthYear} onChange={(e) => setBirthYear(e.target.value)} inputMode="numeric" placeholder="Ex : 2000" className={inp} />
                {birthYear && !validYear && <p className="mt-1 text-xs text-fruit-red-bright">Année invalide.</p>}
              </label>
              <div>
                <span className="mb-2 block text-sm text-cream/70">Quels styles de séries t’intéressent ?</span>
                <div className="flex flex-wrap gap-2">
                  {GENRES.map((g) => (
                    <button key={g} type="button" onClick={() => toggleGenre(g)}
                      className={`rounded-full border px-3 py-1.5 text-sm transition ${genres.includes(g) ? 'border-fruit-red-bright bg-fruit-red-bright/15 text-fruit-red-bright' : 'border-white/15 text-cream/60 hover:border-white/40'}`}>
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {msg && <p className="text-sm text-fruit-red-bright">{msg}</p>}
          {info && <p className="text-sm text-lime">{info}</p>}

          <button disabled={busy || !email.trim()} onClick={submit}
            className="w-full rounded-full bg-fruit-red-bright px-6 py-3 font-bold text-white transition enabled:hover:brightness-110 disabled:opacity-50">
            {busy ? '…' : mode === 'login' ? 'Se connecter' : mode === 'signup' ? 'Créer mon compte' : 'Envoyer le lien'}
          </button>

          {mode !== 'forgot' && (
            <>
              <div className="flex items-center gap-3 text-xs text-cream/30"><span className="h-px flex-1 bg-white/10" />ou<span className="h-px flex-1 bg-white/10" /></div>
              <button onClick={() => signInWithGoogle()} className="flex w-full items-center justify-center gap-2 rounded-full border border-white/15 px-6 py-3 font-semibold text-cream hover:border-white/40">
                Continuer avec Google
              </button>
            </>
          )}
        </div>

        <div className="mt-5 text-center text-sm text-cream/60">
          {mode === 'login' && (
            <>
              <button onClick={() => { setMode('forgot'); setMsg(null); setInfo(null) }} className="hover:text-cream">Mot de passe oublié ?</button>
              <p className="mt-2">Pas de compte ? <button onClick={() => { setMode('signup'); setMsg(null); setInfo(null) }} className="font-semibold text-fruit-red-bright hover:underline">Créer un compte</button></p>
            </>
          )}
          {mode === 'signup' && <p>Déjà un compte ? <button onClick={() => { setMode('login'); setMsg(null); setInfo(null) }} className="font-semibold text-fruit-red-bright hover:underline">Se connecter</button></p>}
          {mode === 'forgot' && <button onClick={() => { setMode('login'); setMsg(null); setInfo(null) }} className="hover:text-cream">← Retour à la connexion</button>}
        </div>
      </div>
    </div>
  )
}

const inp = 'w-full rounded-lg border border-white/15 bg-white/5 px-4 py-3 outline-none focus:border-white/40'
