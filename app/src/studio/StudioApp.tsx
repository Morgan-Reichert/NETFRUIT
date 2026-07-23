import { useEffect, useState } from 'react'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import AuthModal from '../components/AuthModal'
import { FrownIcon, HourglassIcon, MegaphoneIcon } from '../components/icons'
import {
  amIAdmin, getMyCreator, isApprovedCreator, listMySeries, promoteSeries, type Creator, type DbSeries,
} from '../lib/creator'
import Onboarding from './Onboarding'
import SeriesEditor from './SeriesEditor'
import Moderation from './Moderation'
import Dashboard from './Dashboard'
import Earnings from './Earnings'

type View = { name: 'dashboard' } | { name: 'series' } | { name: 'editor'; id?: string } | { name: 'revenue' } | { name: 'moderation' }

const STATUS_STYLE: Record<string, string> = {
  draft: 'bg-white/10 text-cream/70',
  pending: 'bg-amber-400/15 text-amber-300',
  published: 'bg-lime/15 text-lime',
  rejected: 'bg-fruit-red-bright/15 text-fruit-red-bright',
}
const STATUS_LABEL: Record<string, string> = {
  draft: 'Brouillon', pending: 'En modération', published: 'Publié', rejected: 'Rejeté',
}

export default function StudioApp() {
  const { user, loading: authLoading, signOut } = useAuth()
  const [creator, setCreator] = useState<Creator | null>(null)
  const [admin, setAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [authOpen, setAuthOpen] = useState(false)
  const [view, setView] = useState<View>({ name: 'dashboard' })
  const [series, setSeries] = useState<DbSeries[]>([])
  const [promoteForS, setPromoteFor] = useState<DbSeries | null>(null)

  const refreshCreator = async () => {
    if (!user) { setCreator(null); setLoading(false); return }
    setLoading(true)
    const [c, isAdmin] = await Promise.all([getMyCreator(user.id), amIAdmin(user.id)])
    setCreator(c); setAdmin(isAdmin); setLoading(false)
  }
  useEffect(() => { refreshCreator() }, [user])

  // Keep the auth token fresh while in the Studio so writes never fail as anon.
  useEffect(() => {
    if (!user || !supabase) return
    supabase.auth.getSession().then(({ data }) => {
      const s = data.session
      if (s?.expires_at && s.expires_at * 1000 < Date.now() + 120_000) {
        supabase!.auth.refreshSession().then(({ error }) => { if (error) supabase!.auth.signOut() })
      }
    })
  }, [user])

  const refreshSeries = async () => { if (creator) setSeries(await listMySeries(creator.id)) }
  useEffect(() => { refreshSeries() }, [creator])

  // --- gates ---
  if (authLoading || loading) {
    return <Centered><p className="animate-pulse text-cream/60">Chargement du Studio…</p></Centered>
  }
  if (!user) {
    return (
      <Centered>
        <div className="text-center">
          <Brand />
          <p className="mt-4 max-w-sm text-cream/70">Connecte-toi pour accéder à ton espace créateur, publier tes séries et suivre tes performances.</p>
          <button onClick={() => setAuthOpen(true)} className="mt-6 rounded-full bg-fruit-red-bright px-6 py-2.5 font-bold text-white hover:brightness-110">
            Se connecter
          </button>
          <div><a href="/" className="mt-4 inline-block text-sm text-cream/50 hover:text-cream">← Retour à NETFRUIT</a></div>
        </div>
        <AuthModal open={authOpen} onClose={() => { setAuthOpen(false); refreshCreator() }} />
      </Centered>
    )
  }
  if (!creator) {
    return <Onboarding userId={user.id} onDone={refreshCreator} />
  }
  if (!isApprovedCreator(creator)) {
    return <ApplicationStatus creator={creator} onSignOut={signOut} />
  }

  // --- studio shell ---
  return (
    <div className="min-h-screen bg-ink-950 text-cream">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-ink-950/90 px-5 py-3 backdrop-blur">
        <button onClick={() => setView({ name: 'dashboard' })}><Brand small /></button>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden text-cream/60 sm:inline">@{creator.handle}</span>
          <img src={creator.avatar_url ?? '/icons/icon-192.png'} alt="" className="h-8 w-8 rounded-lg object-cover" />
          <a href="/" className="text-cream/60 hover:text-cream">Voir le site</a>
          <button onClick={signOut} className="text-cream/60 hover:text-cream">Déconnexion</button>
        </div>
      </header>

      <nav className="flex gap-1 overflow-x-auto border-b border-white/10 px-5">
        <Tab on={view.name === 'dashboard'} onClick={() => setView({ name: 'dashboard' })}>Tableau de bord</Tab>
        <Tab on={view.name === 'series' || view.name === 'editor'} onClick={() => setView({ name: 'series' })}>Mes séries</Tab>
        <Tab on={view.name === 'revenue'} onClick={() => setView({ name: 'revenue' })}>Revenus</Tab>
        {admin && <Tab on={view.name === 'moderation'} onClick={() => setView({ name: 'moderation' })}>Modération</Tab>}
      </nav>

      <main className="mx-auto max-w-4xl px-5 py-6">
        {view.name === 'dashboard' && (
          <Dashboard creator={creator} series={series} onNew={() => setView({ name: 'editor' })} />
        )}

        {view.name === 'series' && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h1 className="font-display text-2xl font-extrabold">Mes séries</h1>
              <button onClick={() => setView({ name: 'editor' })} className="rounded-full bg-fruit-red-bright px-4 py-2 text-sm font-bold text-white hover:brightness-110">+ Nouvelle série</button>
            </div>
            {series.length === 0 ? (
              <Empty>Aucune série pour l'instant. Crée ta première série !</Empty>
            ) : (
              <ul className="divide-y divide-white/5 rounded-xl border border-white/10">
                {series.map((s) => (
                  <li key={s.id} className="flex items-center gap-3 p-3 hover:bg-white/5">
                    <button onClick={() => setView({ name: 'editor', id: s.id })} className="flex flex-1 items-center gap-4 text-left">
                      <div className="h-14 w-24 shrink-0 overflow-hidden rounded-md bg-white/5">
                        {s.poster_url && <img src={s.poster_url} alt="" className="h-full w-full object-cover" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{s.title}</p>
                        <p className="truncate text-xs text-cream/50">{s.monetization === 'purchase' ? 'Jetons' : s.monetization === 'subscription' ? 'Premium' : 'Gratuit'}</p>
                      </div>
                      <span className={`rounded px-2 py-0.5 text-[11px] font-bold ${STATUS_STYLE[s.status]}`}>{STATUS_LABEL[s.status]}</span>
                    </button>
                    {s.status === 'published' && (
                      <button onClick={() => setPromoteFor(s)} className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/20 px-3 py-1.5 text-xs font-bold text-cream hover:border-white/50">
                        <MegaphoneIcon size={14} /> Promouvoir
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {view.name === 'editor' && (
          <SeriesEditor
            creator={creator}
            seriesId={view.id}
            onBack={() => { refreshSeries(); setView({ name: 'series' }) }}
          />
        )}

        {view.name === 'revenue' && <Earnings creator={creator} />}

        {view.name === 'moderation' && admin && <Moderation />}
      </main>

      {promoteForS && <PromoteModal series={promoteForS} onClose={() => setPromoteFor(null)} />}
    </div>
  )
}

const PROMO_PACKAGES = [
  { days: 3, tokens: 30 }, { days: 7, tokens: 60 }, { days: 30, tokens: 200 },
]
function PromoteModal({ series, onClose }: { series: DbSeries; onClose: () => void }) {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const buy = async (days: number, tokens: number) => {
    setBusy(true); setMsg(null)
    const st = await promoteSeries(series.id, days, tokens)
    setBusy(false)
    if (st === 'OK') setMsg(`« ${series.title} » est mise en avant pendant ${days} jours !`)
    else if (st === 'INSUFFICIENT') setMsg('Solde de jetons insuffisant.')
    else setMsg('Impossible de promouvoir pour le moment.')
  }
  return (
    <div className="fixed inset-0 z-[120] grid place-items-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-ink-900 p-5 text-cream" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 flex items-center gap-2">
          <MegaphoneIcon size={20} className="text-fruit-red-bright" />
          <h3 className="font-display text-lg font-bold">Promouvoir</h3>
        </div>
        <p className="mb-4 text-sm text-cream/60">Booste « {series.title} » : badge <b>Sponsorisé</b> + mise en avant sur l'accueil pendant la durée choisie.</p>
        <div className="space-y-2">
          {PROMO_PACKAGES.map((p) => (
            <button key={p.days} disabled={busy} onClick={() => buy(p.days, p.tokens)}
              className="flex w-full items-center justify-between rounded-xl border border-white/15 px-4 py-3 text-left transition hover:border-white/40 disabled:opacity-50">
              <span className="font-semibold">{p.days} jours de mise en avant</span>
              <span className="inline-flex items-center gap-1 font-bold text-fruit-red-bright">{p.tokens} jetons</span>
            </button>
          ))}
        </div>
        {msg && <p className="mt-3 text-sm text-cream/80">{msg}</p>}
        <button onClick={onClose} className="mt-4 w-full rounded-full border border-white/20 py-2 text-sm text-cream/70 hover:border-white/40">Fermer</button>
      </div>
    </div>
  )
}

function Tab({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`shrink-0 border-b-2 px-4 py-3 text-sm font-semibold transition ${on ? 'border-fruit-red-bright text-cream' : 'border-transparent text-cream/50 hover:text-cream'}`}>
      {children}
    </button>
  )
}
function Centered({ children }: { children: React.ReactNode }) {
  return <div className="grid min-h-screen place-items-center bg-ink-950 p-6 text-cream">{children}</div>
}
function ApplicationStatus({ creator, onSignOut }: { creator: Creator; onSignOut: () => void }) {
  const rejected = creator.status === 'rejected'
  return (
    <Centered>
      <div className="max-w-md text-center">
        <div className="mb-4 flex justify-center text-cream/70">{rejected ? <FrownIcon size={52} /> : <HourglassIcon size={52} />}</div>
        <h1 className="font-display text-2xl font-extrabold">
          {rejected ? 'Candidature non retenue' : 'Candidature en cours d’examen'}
        </h1>
        <p className="mt-3 text-cream/70">
          {rejected
            ? 'Ta candidature créateur n’a pas été approuvée cette fois-ci.'
            : `Merci @${creator.handle} ! Notre équipe examine ton dossier. Tu recevras l’accès dès qu’il sera validé.`}
        </p>
        {rejected && creator.review_note && (
          <p className="mt-3 rounded-lg bg-white/5 px-4 py-3 text-sm text-cream/70">« {creator.review_note} »</p>
        )}
        <div className="mt-6 flex items-center justify-center gap-4 text-sm">
          <a href="/" className="text-cream/60 hover:text-cream">← Retour à NETFRUIT</a>
          <button onClick={onSignOut} className="text-cream/60 hover:text-cream">Déconnexion</button>
        </div>
      </div>
    </Centered>
  )
}
function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-dashed border-white/15 p-10 text-center text-cream/50">{children}</div>
}
function Brand({ small }: { small?: boolean }) {
  // Desktop: N mark + CREATOR wordmark. Mobile: CREATOR only.
  return (
    <span className="inline-flex items-center gap-2 align-middle">
      <img src="/brand/netfruit-mini.png" alt="NETFRUIT" className={`hidden w-auto sm:block ${small ? 'h-7' : 'h-11'}`} />
      <img src="/brand/creator.png" alt="CREATOR" className={`w-auto ${small ? 'h-6' : 'h-9'}`} />
    </span>
  )
}
