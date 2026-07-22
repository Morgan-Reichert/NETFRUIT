import { motion } from 'motion/react'
import { fruitTheme, type Series } from '../data/series'
import { PlayIcon, InfoIcon } from './icons'

export default function Hero({
  series,
  onOpen,
  onPlay,
}: {
  series: Series
  onOpen: (s: Series) => void
  onPlay: (s: Series) => void
}) {
  const t = fruitTheme(series.fruit)
  const art = series.posterUrl // real generated key art, if any

  return (
    <section id="top" className="relative min-h-[94vh] w-full overflow-hidden bg-ink-950">
      {/* Cinematic backdrop */}
      <div className="absolute inset-0">
        {art ? (
          <motion.img
            key={art}
            src={art}
            alt={series.title}
            initial={{ scale: 1.12, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
            className="h-full w-full object-cover object-[50%_26%]"
          />
        ) : (
          <>
            <div
              className="grain absolute inset-0"
              style={{
                background: `radial-gradient(80% 70% at 70% 26%, ${t.glow}55 0%, transparent 60%), linear-gradient(120deg, ${t.from} 0%, #0c060a 70%)`,
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.85, rotate: -12 }}
              animate={{ opacity: 0.5, scale: 1, rotate: -6 }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              className="pointer-events-none absolute -right-20 top-6 select-none leading-none blur-[2px] sm:right-2"
              style={{ fontSize: 'clamp(18rem, 46vw, 44rem)', filter: 'drop-shadow(0 40px 90px rgba(0,0,0,.55))' }}
            >
              {t.glyph}
            </motion.div>
          </>
        )}
      </div>

      {/* Colour wash tuned to the fruit, for cohesion */}
      <div
        className="pointer-events-none absolute inset-0 opacity-60 mix-blend-soft-light"
        style={{ background: `linear-gradient(120deg, ${t.from} 0%, transparent 55%)` }}
      />
      {/* Legibility scrims: bottom, left, and a top vignette */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/45 to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-ink-950 via-ink-950/55 to-transparent sm:via-ink-950/35" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-ink-950/80 to-transparent" />

      {/* Content */}
      <div className="relative mx-auto flex min-h-[94vh] max-w-[1600px] flex-col justify-end px-4 pb-28 pt-28 sm:px-10 sm:pb-32">
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.08, delayChildren: 0.25 } } }}
          className="max-w-2xl"
        >
          <motion.p
            variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
            className="mb-4 inline-flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.32em] text-fruit-red-bright"
          >
            <span className="h-px w-9 bg-fruit-red-bright" />
            {series.generated ? 'NETFRUIT AI Original' : 'NETFRUIT Original Series'}
          </motion.p>

          <motion.h1
            variants={{ hidden: { opacity: 0, y: 26 }, show: { opacity: 1, y: 0 } }}
            className="font-display text-6xl font-extrabold leading-[0.9] tracking-tight text-cream text-shadow-cinema sm:text-8xl"
          >
            {series.title}
          </motion.h1>

          <motion.div
            variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0 } }}
            className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm font-medium text-cream/85"
          >
            <span className="font-bold text-lime">{series.match}% Match</span>
            <span>{series.year}</span>
            <span className="rounded border border-white/30 px-1.5 text-xs">{series.maturity}</span>
            <span>{series.seasons > 1 ? `${series.seasons} Seasons` : '1 Season'}</span>
            {series.episodes?.length ? (
              <span className="rounded-full bg-fruit-red-bright/90 px-2 py-0.5 text-xs font-bold text-white">
                {series.episodes.length} episodes
              </span>
            ) : null}
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs backdrop-blur">{series.runtime}</span>
          </motion.div>

          <motion.p
            variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0 } }}
            className="mt-5 max-w-xl text-base leading-relaxed text-cream/85 text-shadow-cinema sm:text-lg"
          >
            {series.synopsis}
          </motion.p>

          <motion.div
            variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0 } }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <button
              onClick={() => onPlay(series)}
              className="group flex items-center gap-2.5 rounded-full bg-cream px-8 py-3.5 text-lg font-bold text-ink-950 shadow-[0_10px_40px_-8px_rgba(255,255,255,0.4)] transition hover:bg-white"
            >
              <PlayIcon size={22} />
              <span className="transition-transform group-hover:translate-x-0.5">Play</span>
            </button>
            <button
              onClick={() => onOpen(series)}
              className="flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-7 py-3.5 font-semibold text-cream backdrop-blur-md transition hover:border-white/50 hover:bg-white/20"
            >
              <InfoIcon size={20} />
              More Info
            </button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
