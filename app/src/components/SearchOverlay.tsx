import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { allSeries, FRUIT_THEMES, type Series } from '../data/series'
import Poster from './Poster'
import { CloseIcon, SearchIcon } from './icons'

export default function SearchOverlay({
  open,
  onClose,
  onOpen,
}: {
  open: boolean
  onClose: () => void
  onOpen: (s: Series) => void
}) {
  const [q, setQ] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setQ('')
      setTimeout(() => inputRef.current?.focus(), 60)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  const results = useMemo(() => {
    const term = q.trim().toLowerCase()
    const pool = allSeries()
    if (!term) return pool.slice(0, 18)
    return pool.filter((s) =>
      [s.title, s.fruit, ...s.genres, ...s.tags].some((f) => f.toLowerCase().includes(term)),
    )
  }, [q, open])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[115] overflow-y-auto bg-ink-950/97 backdrop-blur-xl"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <div className="safe-top mx-auto max-w-[1400px] px-4 pb-16 pt-6 sm:px-10">
            {/* Search bar */}
            <div className="flex items-center gap-3">
              <div className="flex flex-1 items-center gap-3 rounded-full border border-white/15 bg-white/5 px-5 py-3">
                <SearchIcon size={20} className="text-cream/50" />
                <input
                  ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)}
                  placeholder="Search fruits, genres, moods…"
                  className="flex-1 bg-transparent text-lg text-cream placeholder-cream/40 outline-none"
                />
              </div>
              <button onClick={onClose} aria-label="Close search" className="grid h-11 w-11 place-items-center rounded-full border border-white/15 text-cream/70 transition hover:border-white/40 hover:text-cream">
                <CloseIcon />
              </button>
            </div>

            <p className="mt-5 text-sm text-cream/50">
              {q.trim() ? `${results.length} result${results.length === 1 ? '' : 's'} for “${q.trim()}”` : 'Popular right now'}
            </p>

            {results.length === 0 ? (
              <p className="py-20 text-center text-cream/50">No fruit matches that — try another flavor.</p>
            ) : (
              <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
                {results.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => { onClose(); onOpen(s) }}
                    className="group overflow-hidden rounded-xl text-left ring-1 ring-white/10 transition hover:ring-2"
                    style={{ boxShadow: `0 10px 30px -14px ${FRUIT_THEMES[s.fruit].to}` }}
                  >
                    <Poster series={s} ratio="portrait" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
