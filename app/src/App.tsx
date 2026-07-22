import { useMemo, useState } from 'react'
import { CATEGORIES, allSeries, byId, type Series } from './data/series'
import { buildFeed, matchesCategory, scoreForYou, buildAffinity } from './lib/recommend'
import { useCatalog } from './lib/catalog'
import { useUser } from './lib/store'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Row from './components/Row'
import DetailModal from './components/DetailModal'
import EpisodePlayer from './components/EpisodePlayer'
import Footer from './components/Footer'

export default function App() {
  const { state, watch } = useUser()
  const catalogVersion = useCatalog()
  const [selected, setSelected] = useState<Series | null>(null)
  const [playing, setPlaying] = useState<Series | null>(null)
  const [category, setCategory] = useState('All')

  // Play marks the title watched; generated titles open the episode player.
  const handlePlay = (s: Series) => {
    watch(s.id)
    if (s.episodeManifest) setPlaying(s)
    else setSelected(s)
  }

  // Feed reacts to every like / watch / list change, and to the async catalog load.
  const feed = useMemo(() => buildFeed(state), [state, catalogVersion])

  // Hero: brand pick by default, best personalized pick once there's history.
  const featured = useMemo(() => {
    const pool = allSeries()
    const aff = buildAffinity(state)
    const flagged = pool.find((s) => s.featured) ?? pool[0]
    if (aff.seeds.length === 0) return flagged
    const best = [...pool]
      .filter((s) => !state.disliked[s.id])
      .sort((a, b) => scoreForYou(b, aff) - scoreForYou(a, aff))[0]
    return best ?? flagged
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
      <Navbar />

      <main>
        <Hero series={featured} onOpen={setSelected} onPlay={handlePlay} />

        {/* Category chips */}
        <div className="sticky top-16 z-30 -mt-2 border-y border-white/5 bg-ink-950/80 backdrop-blur-md sm:top-20">
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
      <EpisodePlayer series={playing} onClose={() => setPlaying(null)} />
    </div>
  )
}
