import { FRUIT_THEMES, type Series } from '../data/series'

type Ratio = 'portrait' | 'landscape' | 'square'

const ASPECT: Record<Ratio, string> = {
  portrait: '2 / 3',
  landscape: '16 / 9',
  square: '1 / 1',
}

/**
 * A generative, image-free poster for a fruit series.
 * Builds a juicy gradient keyed to the fruit, a giant translucent glyph,
 * a soft light-bloom, film grain and a vignette — so every card looks
 * bespoke without shipping a single bitmap.
 */
export default function Poster({
  series,
  ratio = 'portrait',
  showTitle = true,
  className = '',
}: {
  series: Series
  ratio?: Ratio
  showTitle?: boolean
  className?: string
}) {
  const t = FRUIT_THEMES[series.fruit]
  return (
    <div
      className={`grain relative isolate h-full w-full overflow-hidden ${className}`}
      style={{
        aspectRatio: ASPECT[ratio],
        background: `radial-gradient(120% 90% at 78% 12%, ${t.glow}55 0%, transparent 55%), linear-gradient(150deg, ${t.from} 0%, ${t.to} 130%)`,
      }}
    >
      {/* AI-generated key art (falls back to the generative layers below) */}
      {series.posterUrl && (
        <img
          src={series.posterUrl}
          alt={series.title}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}

      {!series.posterUrl && (
        <>
          {/* Bloom */}
          <div
            className="absolute -right-10 -top-10 h-40 w-40 rounded-full blur-2xl"
            style={{ background: t.glow, opacity: 0.5 }}
          />
          {/* Oversized ghost glyph */}
          <div
            className="pointer-events-none absolute -bottom-6 -right-4 select-none leading-none"
            style={{
              fontSize: ratio === 'landscape' ? '9rem' : '11rem',
              filter: 'drop-shadow(0 12px 24px rgba(0,0,0,.35))',
              transform: 'rotate(-8deg)',
            }}
          >
            {t.glyph}
          </div>
          {/* Secondary small glyph */}
          <div
            className="pointer-events-none absolute left-3 top-4 select-none opacity-40 leading-none"
            style={{ fontSize: '2.6rem', transform: 'rotate(10deg)' }}
          >
            {t.glyph}
          </div>
        </>
      )}

      {/* Vignette + bottom scrim */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-black/10" />

      {series.newBadge && (
        <span className="absolute left-3 top-3 rounded bg-fruit-red-bright px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg">
          New
        </span>
      )}

      {showTitle && (
        <div className="absolute inset-x-0 bottom-0 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] opacity-70" style={{ color: t.ink }}>
            {series.genres[0]}
          </p>
          <h3
            className="font-display text-lg font-extrabold leading-[1.05] text-shadow-cinema"
            style={{ color: t.ink }}
          >
            {series.title}
          </h3>
        </div>
      )}
    </div>
  )
}
