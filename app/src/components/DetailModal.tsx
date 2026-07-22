import { AnimatePresence, motion } from 'motion/react'
import { useEffect } from 'react'
import { FRUIT_THEMES, type Series } from '../data/series'
import { similarTo } from '../lib/recommend'
import { useUser } from '../lib/store'
import Poster from './Poster'
import { CheckIcon, CloseIcon, PlayIcon, PlusIcon, ThumbDownIcon, ThumbUpIcon } from './icons'

export default function DetailModal({
  series,
  onClose,
  onOpen,
  onPlay,
}: {
  series: Series | null
  onClose: () => void
  onOpen: (s: Series) => void
  onPlay: (s: Series, ep?: number) => void
}) {
  const { state, like, dislike, toggleList } = useUser()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = series ? 'hidden' : ''
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [series, onClose])

  const liked = series ? !!state.liked[series.id] : false
  const disliked = series ? !!state.disliked[series.id] : false
  const inList = series ? !!state.myList[series.id] : false

  return (
    <AnimatePresence>
      {series && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm sm:p-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="relative my-6 w-full max-w-3xl overflow-hidden rounded-2xl bg-ink-900 shadow-2xl ring-1 ring-white/10"
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.97 }}
            transition={{ type: 'spring', damping: 26, stiffness: 260 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Hero band */}
            <div className="relative">
              <div className="h-64 w-full sm:h-80">
                <Poster series={series} ratio="landscape" showTitle={false} />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-ink-900 via-ink-900/20 to-transparent" />

              <button
                onClick={onClose}
                aria-label="Close"
                className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-ink-950/70 text-cream ring-1 ring-white/15 transition hover:bg-ink-950"
              >
                <CloseIcon size={18} />
              </button>

              <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
                <h2 className="font-display text-3xl font-extrabold text-cream text-shadow-cinema sm:text-5xl">
                  {series.title}
                </h2>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => onPlay(series)}
                    className="flex items-center gap-2 rounded-full bg-cream px-6 py-2.5 font-bold text-ink-950 transition hover:bg-white"
                  >
                    <PlayIcon size={18} />
                    Play
                  </button>
                  <button
                    onClick={() => toggleList(series.id)}
                    className={`grid h-11 w-11 place-items-center rounded-full border transition ${
                      inList ? 'border-lime bg-lime/15 text-lime' : 'border-white/30 text-cream hover:border-white/60'
                    }`}
                    aria-label={inList ? 'Remove from My Basket' : 'Add to My Basket'}
                    title={inList ? 'In My Basket' : 'Add to My Basket'}
                  >
                    {inList ? <CheckIcon size={20} /> : <PlusIcon size={20} />}
                  </button>
                  <button
                    onClick={() => like(series.id)}
                    className={`grid h-11 w-11 place-items-center rounded-full border transition ${
                      liked ? 'border-fruit-red-bright bg-fruit-red/20 text-fruit-red-bright' : 'border-white/30 text-cream hover:border-white/60'
                    }`}
                    aria-label="Like"
                  >
                    <ThumbUpIcon size={19} />
                  </button>
                  <button
                    onClick={() => dislike(series.id)}
                    className={`grid h-11 w-11 place-items-center rounded-full border transition ${
                      disliked ? 'border-blueberry bg-blueberry/25 text-blueberry' : 'border-white/30 text-cream hover:border-white/60'
                    }`}
                    aria-label="Not for me"
                  >
                    <ThumbDownIcon size={19} />
                  </button>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="grid gap-6 p-6 sm:grid-cols-3 sm:p-8">
              <div className="sm:col-span-2">
                <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-bold text-lime">{series.match}% Match</span>
                  <span className="text-cream/70">{series.year}</span>
                  <span className="rounded border border-white/25 px-1.5 text-xs text-cream/70">{series.maturity}</span>
                  <span className="text-cream/70">{series.seasons} Seasons</span>
                  <span className="rounded bg-fruit-red px-1.5 text-xs font-bold text-white">HD</span>
                </div>
                <p className="leading-relaxed text-cream/85">{series.synopsis}</p>
              </div>
              <div className="space-y-3 text-sm">
                <p>
                  <span className="text-cream/50">Genres: </span>
                  <span className="text-cream/90">{series.genres.join(', ')}</span>
                </p>
                <p>
                  <span className="text-cream/50">This series is: </span>
                  <span className="text-cream/90">{series.tags.join(', ')}</span>
                </p>
                <p>
                  <span className="text-cream/50">Format: </span>
                  <span className="text-cream/90">{series.runtime}</span>
                </p>
              </div>
            </div>

            {/* Episodes */}
            {(series.episodes?.length ?? 0) > 0 && (
              <div className="px-6 pb-4 sm:px-8">
                <h3 className="font-display text-lg font-bold text-cream">
                  Episodes · Season 1 <span className="text-cream/40">({series.episodes!.length})</span>
                </h3>
                <div className="mt-3 divide-y divide-white/5 rounded-xl border border-white/5">
                  {series.episodes!.map((e) => (
                    <button
                      key={e.number}
                      onClick={() => onPlay(series, e.number)}
                      className="flex w-full items-center gap-4 p-3 text-left transition hover:bg-white/5"
                    >
                      <span className="w-5 text-center text-lg font-bold text-cream/40">{e.number}</span>
                      <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-md">
                        <Poster series={series} ratio="landscape" showTitle={false} />
                        <span className="absolute inset-0 grid place-items-center bg-black/30 text-cream">
                          <PlayIcon size={18} />
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-cream">{e.title}</p>
                        <p className="truncate text-xs text-cream/50">Episode {e.number} · AI-generated</p>
                      </div>
                      <span className="text-xs text-cream/50">{Math.max(1, Math.round(e.durationSec / 60))}m</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* More like this */}
            <div className="p-6 sm:p-8">
              <h3 className="mb-3 font-display text-lg font-bold text-cream">More Fruit Like This</h3>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {similarTo(series, 4).map((s) => (
                    <button
                      key={s.id}
                      onClick={() => onOpen(s)}
                      className="overflow-hidden rounded-lg ring-1 ring-white/10 transition hover:ring-2"
                      style={{ boxShadow: `0 8px 20px -12px ${FRUIT_THEMES[s.fruit].to}` }}
                    >
                      <Poster series={s} ratio="portrait" />
                    </button>
                  ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
