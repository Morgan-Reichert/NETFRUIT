import { motion } from 'motion/react'
import { fruitTheme, type Series } from '../data/series'

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
  return (
    <section id="top" className="relative min-h-[92vh] w-full overflow-hidden">
      {/* Cinematic backdrop */}
      <div
        className="grain absolute inset-0"
        style={{
          background: `radial-gradient(80% 70% at 72% 30%, ${t.glow}44 0%, transparent 60%), linear-gradient(120deg, ${t.from} 0%, #0c060a 68%)`,
        }}
      />
      {/* Huge hero fruit */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8, rotate: -12 }}
        animate={{ opacity: 1, scale: 1, rotate: -6 }}
        transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        className="pointer-events-none absolute -right-16 top-10 select-none leading-none sm:right-6 sm:top-16"
        style={{ fontSize: 'clamp(16rem, 42vw, 40rem)', filter: 'drop-shadow(0 40px 80px rgba(0,0,0,.5))' }}
      >
        {t.glyph}
      </motion.div>

      {/* Left + bottom scrims for legibility */}
      <div className="absolute inset-0 bg-gradient-to-r from-ink-950 via-ink-950/70 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-ink-950 to-transparent" />

      {/* Content */}
      <div className="relative mx-auto flex min-h-[92vh] max-w-[1600px] flex-col justify-end px-4 pb-28 pt-28 sm:px-10 sm:pb-32">
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.09, delayChildren: 0.15 } } }}
          className="max-w-2xl"
        >
          <motion.p
            variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
            className="mb-3 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.3em] text-fruit-red-bright"
          >
            <span className="h-px w-8 bg-fruit-red-bright" />
            NETFRUIT Original Series
          </motion.p>

          <motion.h1
            variants={{ hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } }}
            className="font-display text-5xl font-extrabold leading-[0.92] tracking-tight text-cream text-shadow-cinema sm:text-7xl lg:text-8xl"
          >
            {series.title}
          </motion.h1>

          <motion.div
            variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
            className="mt-5 flex flex-wrap items-center gap-3 text-sm text-cream/80"
          >
            <span className="font-bold text-lime">{series.match}% Match</span>
            <span>{series.year}</span>
            <span className="rounded border border-white/25 px-1.5 text-xs">{series.maturity}</span>
            <span>{series.seasons} Seasons</span>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs">{series.runtime}</span>
          </motion.div>

          <motion.p
            variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
            className="mt-4 max-w-xl text-base leading-relaxed text-cream/85 sm:text-lg"
          >
            {series.synopsis}
          </motion.p>

          <motion.div
            variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
            className="mt-7 flex flex-wrap items-center gap-3"
          >
            <button
              onClick={() => onPlay(series)}
              className="group flex items-center gap-2 rounded-full bg-cream px-7 py-3 font-bold text-ink-950 shadow-xl transition hover:bg-white"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
              Start Watching
            </button>
            <button
              onClick={() => onOpen(series)}
              className="flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-7 py-3 font-semibold text-cream backdrop-blur-md transition hover:bg-white/20"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4M12 8h.01" strokeLinecap="round" />
              </svg>
              More Info
            </button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
