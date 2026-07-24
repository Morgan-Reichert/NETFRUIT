import { useEffect, useState } from 'react'
import { useAuth } from '../lib/auth'
import { amIAdmin } from '../lib/creator'
import AuthModal from '../components/AuthModal'
import Tickets from './Tickets'
import Accounts from './Accounts'

type Tab = 'tickets' | 'accounts'

export default function AdminApp() {
  const { user, loading: authLoading, signOut } = useAuth()
  const [admin, setAdmin] = useState<boolean | null>(null)
  const [tab, setTab] = useState<Tab>('tickets')
  const [authOpen, setAuthOpen] = useState(false)

  useEffect(() => {
    if (!user) { setAdmin(null); return }
    amIAdmin(user.id).then(setAdmin)
  }, [user])

  if (authLoading) return <Center><p className="animate-pulse text-cream/60">…</p></Center>
  if (!user) return (
    <Center>
      <div className="text-center">
        <Brand />
        <p className="mt-3 text-cream/60">Espace réservé à l’administration.</p>
        <button onClick={() => setAuthOpen(true)} className="mt-5 rounded-full bg-fruit-red-bright px-6 py-2.5 font-bold text-white hover:brightness-110">Se connecter</button>
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      </div>
    </Center>
  )
  if (admin === null) return <Center><p className="text-cream/60">Vérification…</p></Center>
  if (!admin) return (
    <Center>
      <div className="text-center">
        <p className="text-cream/70">Accès refusé — tu n’es pas administrateur.</p>
        <a href="/" className="mt-4 inline-block text-sm text-fruit-red-bright hover:underline">← Retour</a>
      </div>
    </Center>
  )

  return (
    <div className="min-h-screen bg-ink-950 text-cream">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-ink-950/90 px-5 py-3 backdrop-blur">
        <Brand small />
        <div className="flex items-center gap-3 text-sm">
          <a href="/studio" className="text-cream/60 hover:text-cream">Studio</a>
          <a href="/" className="text-cream/60 hover:text-cream">Site</a>
          <button onClick={signOut} className="text-cream/60 hover:text-cream">Déconnexion</button>
        </div>
      </header>
      <nav className="flex gap-1 border-b border-white/10 px-5">
        <TabBtn on={tab === 'tickets'} onClick={() => setTab('tickets')}>Tickets</TabBtn>
        <TabBtn on={tab === 'accounts'} onClick={() => setTab('accounts')}>Comptes</TabBtn>
      </nav>
      <main className="mx-auto max-w-5xl px-5 py-6">
        {tab === 'tickets' ? <Tickets /> : <Accounts />}
      </main>
    </div>
  )
}

function TabBtn({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={`shrink-0 border-b-2 px-4 py-3 text-sm font-semibold transition ${on ? 'border-fruit-red-bright text-cream' : 'border-transparent text-cream/50 hover:text-cream'}`}>{children}</button>
}
function Center({ children }: { children: React.ReactNode }) {
  return <div className="grid min-h-screen place-items-center bg-ink-950 p-6 text-cream">{children}</div>
}
function Brand({ small }: { small?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <img src="/brand/netfruit-mini.png" alt="" className={small ? 'h-7 w-auto' : 'h-9 w-auto'} />
      <span className={`font-display font-extrabold ${small ? 'text-lg' : 'text-2xl'}`}>Admin</span>
    </span>
  )
}
