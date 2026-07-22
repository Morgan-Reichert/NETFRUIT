const COLS: Record<string, string[]> = {
  Watch: ['New & Ripe', 'Originals', 'Top Squeezed', 'My Basket', 'Coming Soon'],
  NETFRUIT: ['About', 'Careers', 'Press', 'Fruit Blog', 'Investors'],
  Support: ['Help Center', 'Account', 'Devices', 'Contact', 'Accessibility'],
  Legal: ['Terms of Juice', 'Privacy', 'Cookie Preferences', 'Corporate Info'],
}

export default function Footer() {
  return (
    <footer className="relative mt-10 border-t border-white/5 bg-ink-900/60 px-4 py-14 sm:px-10">
      {/* Tagline ticker */}
      <div className="mb-12 overflow-hidden border-y border-white/5 py-3">
        <div className="flex w-max animate-ticker gap-6 whitespace-nowrap font-display text-sm font-bold uppercase tracking-[0.3em] text-cream/25">
          {Array.from({ length: 2 }).map((_, r) => (
            <span key={r} className="flex gap-6">
              {'Stream the juice · Freshly picked · 100% AI-grown · Bingeable pulp · Ripe drama · '
                .repeat(3)
                .split(' · ')
                .filter(Boolean)
                .map((w, i) => (
                  <span key={r + '-' + i}>{w} ·</span>
                ))}
            </span>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-[1600px]">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:grid-cols-5">
          <div className="col-span-2 sm:col-span-4 lg:col-span-1">
            <img
              src="/brand/netfruit-long.png"
              alt="NETFRUIT"
              className="h-8 w-auto brightness-125 saturate-150 drop-shadow-[0_0_14px_rgba(255,39,64,0.4)]"
            />
            <p className="mt-3 max-w-xs text-sm text-cream/50">
              The world's first streaming home for AI-generated fruit series. Freshly picked, endlessly bingeable.
            </p>
          </div>
          {Object.entries(COLS).map(([head, links]) => (
            <div key={head}>
              <h4 className="mb-3 text-sm font-bold text-cream">{head}</h4>
              <ul className="space-y-2 text-sm text-cream/50">
                {links.map((l) => (
                  <li key={l}>
                    <a href="#" className="transition hover:text-cream">{l}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-white/5 pt-6 text-sm text-cream/40 sm:flex-row sm:items-center">
          <p>© 2026 NETFRUIT — 100% AI-generated, 0% real fruit harmed.</p>
          <div className="flex gap-4 text-xs font-semibold uppercase tracking-wide">
            {['TikTok', 'Instagram', 'X', 'YouTube'].map((s) => (
              <a key={s} href="#" className="text-cream/50 transition hover:text-cream">{s}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
