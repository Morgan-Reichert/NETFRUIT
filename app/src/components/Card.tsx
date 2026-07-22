import { motion } from 'motion/react'
import { FRUIT_THEMES, type Series } from '../data/series'
import { useUser } from '../lib/store'
import Poster from './Poster'
import { CheckIcon, ThumbUpIcon } from './icons'

export default function Card({
  series,
  index = 0,
  onOpen,
  showProgress = false,
}: {
  series: Series
  index?: number
  onOpen: (s: Series) => void
  showProgress?: boolean
}) {
  const t = FRUIT_THEMES[series.fruit]
  const { state } = useUser()
  const progress = state.watched[series.id]?.progress ?? 0
  const inList = !!state.myList[series.id]
  const liked = !!state.liked[series.id]

  return (
    <motion.button
      layout
      onClick={() => onOpen(series)}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.03, 0.3) }}
      whileHover={{ y: -8, scale: 1.05 }}
      className="group relative w-[150px] shrink-0 cursor-pointer text-left sm:w-[176px]"
    >
      <div
        className="relative overflow-hidden rounded-xl ring-1 ring-white/10 transition-shadow duration-300 group-hover:ring-2"
        style={{ boxShadow: `0 10px 30px -12px ${t.to}` }}
      >
        <Poster series={series} ratio="portrait" />

        {/* Personal state badges */}
        <div className="absolute right-2 top-2 flex gap-1">
          {liked && (
            <span className="grid h-6 w-6 place-items-center rounded-full bg-black/50 text-lime backdrop-blur">
              <ThumbUpIcon size={13} />
            </span>
          )}
          {inList && (
            <span className="grid h-6 w-6 place-items-center rounded-full bg-black/50 text-lime backdrop-blur">
              <CheckIcon size={13} />
            </span>
          )}
        </div>

        {/* Continue-watching progress bar */}
        {showProgress && progress > 0 && (
          <div className="absolute inset-x-2 bottom-2 h-1 overflow-hidden rounded-full bg-white/25">
            <div
              className="h-full rounded-full bg-fruit-red-bright"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        )}
      </div>

      <div className="mt-2 flex items-center gap-2 text-[11px] text-cream/60 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <span className="font-semibold text-lime">{series.match}% Match</span>
        <span className="rounded border border-white/20 px-1">{series.maturity}</span>
        <span>{series.seasons} S</span>
      </div>
    </motion.button>
  )
}
