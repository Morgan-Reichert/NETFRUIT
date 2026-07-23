import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { fruitTheme, type Series } from '../data/series'
import { similarTo } from '../lib/recommend'
import { useUser } from '../lib/store'
import { isLocked, useWallet } from '../lib/wallet'
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
  const wallet = useWallet()
  const [shared, setShared] = useState(false)
  const [seasonTab, setSeasonTab] = useState<number | null>(null)
  const [unlockMsg, setUnlockMsg] = useState<string | null>(null)
  const [unlocking, setUnlocking] = useState(false)

  const locked = isLocked(series, wallet)
  const doUnlock = async () => {
    if (!series?.dbId) return
    setUnlocking(true); setUnlockMsg(null)
    const st = await wallet.unlock(series.dbId)
    setUnlocking(false)
    if (st === 'UNLOCKED' || st === 'PREMIUM' || st === 'ALREADY') { onPlay(series) }
    else if (st === 'INSUFFICIENT') setUnlockMsg('Solde de jetons insuffisant — recharge dans le menu profil.')
    else if (st === 'NEEDS_PREMIUM') setUnlockMsg('Cette série nécessite l’abonnement Premium (menu profil).')
    else if (st === 'NO_AUTH') setUnlockMsg('Connecte-toi pour débloquer cette série.')
    else setUnlockMsg('Impossible de débloquer pour le moment.')
  }

  const share = async () => {
    if (!series) return
    const url = `${window.location.origin}/?s=${series.id}`
    const data = { title: `${series.title} · NETFRUIT`, text: series.synopsis, url }
    try {
      if (navigator.share) await navigator.share(data)
      else { await navigator.clipboard.writeText(url); setShared(true); setTimeout(() => setShared(false), 1800) }
    } catch { /* user cancelled */ }
  }

  useEffect(() => { setSeasonTab(null) }, [series])

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
                  {series.comingSoon ? (
                    <span className="flex items-center gap-2 rounded-full bg-white/15 px-6 py-2.5 font-bold text-cream ring-1 ring-white/25">
                      Coming soon
                    </span>
                  ) : locked ? (
                    <button
                      onClick={doUnlock}
                      disabled={unlocking}
                      className="flex items-center gap-2 rounded-full bg-brand-gradient px-6 py-2.5 font-bold text-white transition hover:brightness-110 disabled:opacity-60"
                    >
                      {unlocking ? 'Déblocage…'
                        : series.monetization === 'subscription'
                          ? '💎 Débloquer avec Premium'
                          : `🪙 Débloquer · ${series.episodeTokenCost ?? 0} jetons`}
                    </button>
                  ) : (
                    <button
                      onClick={() => onPlay(series)}
                      className="flex items-center gap-2 rounded-full bg-cream px-6 py-2.5 font-bold text-ink-950 transition hover:bg-white"
                    >
                      <PlayIcon size={18} />
                      Play
                    </button>
                  )}
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
                  <button
                    onClick={share}
                    className="relative grid h-11 w-11 place-items-center rounded-full border border-white/30 text-cream transition hover:border-white/60"
                    aria-label="Partager"
                    title="Partager"
                  >
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                      <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
                    </svg>
                    {shared && <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-cream px-2 py-0.5 text-[11px] font-bold text-ink-950">Lien copié ✓</span>}
                  </button>
                </div>
                {unlockMsg && <p className="mt-3 text-sm font-medium text-amber-300">{unlockMsg}</p>}
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
                {series.creatorHandle && (
                  <p>
                    <span className="text-cream/50">Créateur : </span>
                    <a href={`/c/${series.creatorHandle}`} className="font-medium text-fruit-red-bright hover:underline">
                      {series.creatorName ?? series.producedBy}
                    </a>
                  </p>
                )}
              </div>
            </div>

            {/* Episodes — season selector (tabs when multiple seasons) */}
            {(series.episodes?.length ?? 0) > 0 && (() => {
              const eps = series.episodes!
              const seasons = [...new Set(eps.map((e) => e.season ?? 1))].sort((a, b) => a - b)
              const active = seasonTab ?? seasons[0]
              const list = eps.filter((e) => (e.season ?? 1) === active)
              return (
                <div className="px-6 pb-4 sm:px-8">
                  <div className="mb-3 flex items-center gap-3">
                    <h3 className="font-display text-lg font-bold text-cream">Episodes</h3>
                    {seasons.length > 1 ? (
                      <div className="flex gap-1 rounded-full bg-white/5 p-1">
                        {seasons.map((sn) => (
                          <button
                            key={sn}
                            onClick={() => setSeasonTab(sn)}
                            className={`rounded-full px-3 py-1 text-sm font-semibold transition ${active === sn ? 'bg-fruit-red-bright text-white' : 'text-cream/60 hover:text-cream'}`}
                          >
                            Saison {sn}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <span className="text-cream/40">Saison {active} · {list.length}</span>
                    )}
                  </div>
                  <div className="divide-y divide-white/5 rounded-xl border border-white/5">
                    {list.map((e) => (
                      <button
                        key={e.number}
                        onClick={() => onPlay(series, e.number)}
                        className="flex w-full items-center gap-4 p-3 text-left transition hover:bg-white/5"
                      >
                        <span className="w-5 text-center text-lg font-bold text-cream/40">{e.ep ?? e.number}</span>
                        <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-md">
                          <Poster series={series} ratio="landscape" showTitle={false} />
                          <span className="absolute inset-0 grid place-items-center bg-black/30 text-cream">
                            <PlayIcon size={18} />
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-cream">{e.title}</p>
                          <p className="truncate text-xs text-cream/50">Saison {active} · Épisode {e.ep ?? e.number} · AI-generated</p>
                        </div>
                        <span className="text-xs text-cream/50">{Math.max(1, Math.round(e.durationSec / 60))}m</span>
                      </button>
                    ))}
                  </div>
                </div>
              )
            })()}

            {/* More like this */}
            <div className="p-6 sm:p-8">
              <h3 className="mb-3 font-display text-lg font-bold text-cream">More Fruit Like This</h3>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {similarTo(series, 4).map((s) => (
                    <button
                      key={s.id}
                      onClick={() => onOpen(s)}
                      className="overflow-hidden rounded-lg ring-1 ring-white/10 transition hover:ring-2"
                      style={{ boxShadow: `0 8px 20px -12px ${fruitTheme(s.fruit).to}` }}
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
