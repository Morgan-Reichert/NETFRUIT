import { useEffect, useState } from 'react'
import { useAuth } from './lib/auth'
import { supabase } from './lib/supabase'
import AuthModal from './components/AuthModal'

interface Creator { id: string; handle: string; display_name: string; bio: string | null; avatar_url: string | null }
interface Series { id: string; slug: string; title: string; poster_url: string | null; genres: string[] }

const handleFromPath = () => decodeURIComponent(window.location.pathname.replace(/^\/c\//, '').replace(/\/$/, ''))

export default function CreatorPage() {
  const { user } = useAuth()
  const [creator, setCreator] = useState<Creator | null>(null)
  const [series, setSeries] = useState<Series[]>([])
  const [loading, setLoading] = useState(true)
  const [following, setFollowing] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const handle = handleFromPath()

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!supabase) { setLoading(false); return }
      const { data: c } = await supabase.from('creators').select('*').eq('handle', handle).maybeSingle()
      if (cancelled) return
      setCreator(c as Creator | null)
      if (c) {
        const { data: s } = await supabase.from('series')
          .select('id,slug,title,poster_url,genres')
          .eq('creator_id', (c as Creator).id).eq('status', 'published')
          .order('created_at', { ascending: false })
        if (!cancelled) setSeries((s as Series[]) ?? [])
      }
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [handle])

  // Is the signed-in viewer already following?
  useEffect(() => {
    if (!supabase || !user || !creator) { setFollowing(false); return }
    supabase.from('follows').select('creator_id').eq('viewer_id', user.id).eq('creator_id', creator.id).maybeSingle()
      .then(({ data }) => setFollowing(!!data))
  }, [user, creator])

  const toggleFollow = async () => {
    if (!supabase || !creator) return
    if (!user) { setAuthOpen(true); return }
    if (following) {
      await supabase.from('follows').delete().eq('viewer_id', user.id).eq('creator_id', creator.id)
      setFollowing(false)
    } else {
      await supabase.from('follows').insert({ viewer_id: user.id, creator_id: creator.id })
      setFollowing(true)
    }
  }

  if (loading) return <Centered><p className="animate-pulse text-cream/60">Chargement…</p></Centered>
  if (!creator) return (
    <Centered>
      <div className="text-center">
        <p className="text-cream/70">Créateur introuvable : @{handle}</p>
        <a href="/" className="mt-4 inline-block text-sm text-fruit-red-bright hover:underline">← Retour à NETFRUIT</a>
      </div>
    </Centered>
  )

  return (
    <div className="min-h-screen bg-ink-950 text-cream">
      <div className="mx-auto max-w-5xl px-5 py-8">
        <a href="/" className="text-sm text-cream/60 hover:text-cream">← NETFRUIT</a>

        <header className="mt-6 flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
          <img src={creator.avatar_url ?? '/icons/icon-192.png'} alt="" className="h-24 w-24 rounded-2xl object-cover ring-1 ring-white/15" />
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-3xl font-extrabold">{creator.display_name}</h1>
            <p className="text-cream/50">@{creator.handle} · {series.length} série{series.length > 1 ? 's' : ''}</p>
            {creator.bio && <p className="mt-2 max-w-xl text-cream/75">{creator.bio}</p>}
          </div>
          <button
            onClick={toggleFollow}
            className={`shrink-0 rounded-full px-6 py-2.5 font-bold transition ${following ? 'border border-white/25 text-cream hover:border-white/50' : 'bg-brand-gradient text-white hover:brightness-110'}`}
          >
            {following ? 'Suivi ✓' : 'Suivre'}
          </button>
        </header>

        <h2 className="mb-4 mt-10 font-display text-xl font-bold">Séries</h2>
        {series.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/15 p-10 text-center text-cream/50">Aucune série publiée pour l'instant.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {series.map((s) => (
              <a key={s.id} href={`/?s=${s.slug}`} className="group overflow-hidden rounded-xl ring-1 ring-white/10 transition hover:ring-2 hover:ring-white/30">
                <div className="relative aspect-[2/3] bg-white/5">
                  {s.poster_url && <img src={s.poster_url} alt={s.title} className="h-full w-full object-cover" />}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                    <p className="truncate text-sm font-bold">{s.title}</p>
                    <p className="truncate text-[11px] text-cream/60">{s.genres?.[0]}</p>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="grid min-h-screen place-items-center bg-ink-950 p-6 text-cream">{children}</div>
}
