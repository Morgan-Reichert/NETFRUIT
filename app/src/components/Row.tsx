import { useRef } from 'react'
import { byId, type Series } from '../data/series'
import Card from './Card'

export default function Row({
  title,
  ids,
  onOpen,
  showProgress = false,
}: {
  title: string
  ids: string[]
  onOpen: (s: Series) => void
  showProgress?: boolean
}) {
  const scroller = useRef<HTMLDivElement>(null)
  const items = ids.map(byId).filter(Boolean) as Series[]

  const scroll = (dir: 1 | -1) => {
    scroller.current?.scrollBy({ left: dir * 560, behavior: 'smooth' })
  }

  return (
    <section className="group/row relative py-4">
      <div className="mb-2 flex items-baseline gap-3 px-4 sm:px-10">
        <h2 className="font-display text-lg font-bold tracking-tight text-cream sm:text-xl">
          {title}
        </h2>
        <span className="translate-x-0 text-xs font-semibold text-fruit-red-bright opacity-0 transition group-hover/row:translate-x-1 group-hover/row:opacity-100">
          Explore all ›
        </span>
      </div>

      <div className="relative">
        {/* Arrows */}
        <button
          aria-label="Scroll left"
          onClick={() => scroll(-1)}
          className="absolute left-0 top-0 z-20 hidden h-full w-10 items-center justify-center bg-gradient-to-r from-ink-950/90 to-transparent text-2xl text-cream opacity-0 transition group-hover/row:opacity-100 sm:flex"
        >
          ‹
        </button>
        <button
          aria-label="Scroll right"
          onClick={() => scroll(1)}
          className="absolute right-0 top-0 z-20 hidden h-full w-10 items-center justify-center bg-gradient-to-l from-ink-950/90 to-transparent text-2xl text-cream opacity-0 transition group-hover/row:opacity-100 sm:flex"
        >
          ›
        </button>

        <div
          ref={scroller}
          className="no-scrollbar flex gap-3 overflow-x-auto scroll-smooth px-4 pb-3 sm:px-10"
        >
          {items.map((s, i) => (
            <Card key={s.id + title} series={s} index={i} onOpen={onOpen} showProgress={showProgress} />
          ))}
        </div>
      </div>
    </section>
  )
}
