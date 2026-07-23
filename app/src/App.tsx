import { useEffect, useMemo, useRef, useState } from 'react'
import { CATEGORIES, allSeries, byId, type Series } from './data/series'
import { buildFeed, matchesCategory, scoreForYou, buildAffinity } from './lib/recommend'
import { useCatalog } from './lib/catalog'
import { useUser } from './lib/store'
import { useWallet, isLocked } from './lib/wallet'
import { useCloudSync } from './lib/sync'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Row from './components/Row'
import DetailModal from './components/DetailModal'
import EpisodePlayer from './components/EpisodePlayer'
import AuthModal from './components/AuthModal'
import SearchOverlay from './components/SearchOverlay'
import Footer from './components/Footer'

export default function App() {
  const { state, watch } = useUser()
  const catalogVersion = useCatalog()
  const wallet = useWallet()
  useCloudSync()
  const [selected, setSelected] = useState<Series | null>(null)
  const [playing, setPlaying] = useState<Series | null>(null)
  const [playingEp, setPlayingEp] = useState(1)
  const [authOpen, setAuthOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [category, setCategory] = useState('All')

  // Play marks the title watched; generated titles open the episode player.
  // With no explicit episode (hero/card), resume where the viewer left off.
  const handlePlay = (s: Series, epNum?: number) => {
    // Gated series must be unlocked first — send the viewer to the detail paywall.
    if (isLocked(s, wallet)) { setSelected(s); return }
    watch(s.id)
    if (s.episodeManifest || s.episodes?.length) {
      const rec = state.watched[s.id]
      const resumeEp = rec && rec.progress < 0.98 ? rec.ep : undefined
      setPlayingEp(epNum ?? resumeEp ?? 1)
      setPlaying(s)
    } else setSelected(s)
  }

  // Deep links: /?s=<slug> opens a series page, /?play=<slug> starts playback.
  // Runs once the catalog is loaded so byId() can resolve.
  const linkHandled = useRef(false)
  useEffect(() => {
    if (linkHandled.current) return
    const params = new URLSearchParams(window.location.search)
    const sid = params.get('play') || params.get('s')
    if (!sid) return
    const s = byId(sid)
    if (!s) return
    linkHandled.current = true
    if (params.get('play')) handlePlay(s)
    else setSelected(s)
    window.history.replaceState({}, '', window.location.pathname)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogVersion])

  // Feed reacts to every like / watch / list change, and to the async catalog load.
  const feed = useMemo(() => buildFeed(state), [state, catalogVersion])

  // Hero: an explicitly featured title always wins; otherwise the best pick.
  const featured = useMemo(() => {
    const pool = allSeries()
    const flagged = pool.find((s) => s.featured)
    if (flagged) return flagged
    const aff = buildAffinity(state)
    if (aff.seeds.length === 0) return pool[0]
    const best = [...pool]
      .filter((s) => !state.disliked[s.id])
      .sort((a, b) => scoreForYou(b, aff) - scoreForYou(a, aff))[0]
    return best ?? pool[0]
  }, [state, catalogVersion])

  // Category chips actually filter every row; empty rows disappear.
  const visibleFeed = useMemo(() => {
    if (category === 'All') return feed
    return feed
      .map((r) => ({
        ...r,
        ids: r.ids.filter((id) => {
          const s = byId(id)
          return s && matchesCategory(s, category)
        }),
      }))
      .filter((r) => r.ids.length > 0)
  }, [feed, category])

  return (
    <div className="relative min-h-screen bg-ink-950">
      <Navbar onAuthClick={() => setAuthOpen(true)} onSearchClick={() => setSearchOpen(true)} />

      <main>
        <Hero series={featured} onOpen={setSelected} onPlay={handlePlay} />

        {/* Category chips */}
        <div className="sticky top-[calc(4rem+env(safe-area-inset-top))] z-30 -mt-2 border-y border-white/5 bg-ink-950/80 backdrop-blur-md sm:top-[calc(5rem+env(safe-area-inset-top))]">
          <div className="no-scrollbar mx-auto flex max-w-[1600px] gap-2 overflow-x-auto px-4 py-3 sm:px-10">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                  category === c
                    ? 'bg-fruit-red-bright text-white shadow-lg shadow-fruit-red/30'
                    : 'border border-white/15 text-cream/70 hover:border-white/40 hover:text-cream'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Personalized + curated rows */}
        <div className="relative z-10 -mt-4 pb-8">
          {visibleFeed.map((r) => (
            <Row
              key={r.key}
              title={r.title}
              ids={r.ids}
              onOpen={setSelected}
              showProgress={r.kind === 'continue'}
            />
          ))}
          {visibleFeed.length === 0 && (
            <p className="px-4 py-16 text-center text-cream/50 sm:px-10">
              No fruit in this category yet — try another flavor.
            </p>
          )}
        </div>
      </main>

      <Footer />

      <DetailModal
        series={selected}
        onClose={() => setSelected(null)}
        onOpen={setSelected}
        onPlay={handlePlay}
      />
      <EpisodePlayer series={playing} startEp={playingEp} onClose={() => setPlaying(null)} />
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} onOpen={setSelected} />
    </div>
  )
}
