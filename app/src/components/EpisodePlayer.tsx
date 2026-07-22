import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Series } from '../data/series'
import {
  CaptionsIcon, ChevronDown, CloseIcon, GaugeIcon, PauseIcon,
  PlayIcon, ReplayIcon, SettingsIcon, VolumeIcon,
} from './icons'

type Lang = 'en' | 'fr' | 'es'
const LANG_LABEL: Record<Lang, string> = { en: 'English', fr: 'Français', es: 'Español' }
const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2]
type Quality = 'auto' | 'high' | 'medium' | 'low'
const QUALITY_FILTER: Record<Quality, string> = {
  auto: '', high: '', medium: 'saturate(.92) brightness(.98)', low: 'blur(1.4px) saturate(.85)',
}
const QUALITY_LABEL: Record<Quality, string> = { auto: 'Auto', high: '1080p', medium: '720p', low: '360p' }

interface Shot {
  speaker?: string
  imageUrl: string
  clipUrl: string | null
  voiceUrls?: Record<Lang, string | null>
  voiceUrl?: string | null // legacy
  captions?: Record<Lang, string>
  caption?: string // legacy
  durationSec: number
}
interface Manifest {
  title: string
  shots: Shot[]
  langs?: Lang[]
  videoUrl: string | null
}

const capOf = (s: Shot, l: Lang) => s.captions?.[l] ?? s.caption ?? ''
const voiceOf = (s: Shot, l: Lang) => s.voiceUrls?.[l] ?? s.voiceUrl ?? null

export default function EpisodePlayer({
  series,
  onClose,
}: {
  series: Series | null
  onClose: () => void
}) {
  const [manifest, setManifest] = useState<Manifest | null>(null)
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  const [done, setDone] = useState(false)
  const [audioLang, setAudioLang] = useState<Lang>('fr')
  const [subLang, setSubLang] = useState<Lang | 'off'>('off')
  const [speed, setSpeed] = useState(1)
  const [quality, setQuality] = useState<Quality>('auto')
  const [settings, setSettings] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    setManifest(null); setI(0); setDone(false); setPaused(false)
    if (!series?.episodeManifest) return
    let cancelled = false
    fetch(series.episodeManifest, { cache: 'no-store' })
      .then((r) => r.json())
      .then((m: Manifest) => !cancelled && setManifest(m))
      .catch(() => !cancelled && setManifest({ title: series.title, shots: [], videoUrl: null }))
    return () => { cancelled = true }
  }, [series])

  const langs: Lang[] = manifest?.langs ?? ['en', 'fr', 'es']

  const clearTimer = () => { if (timerRef.current) window.clearTimeout(timerRef.current); timerRef.current = null }

  const next = useCallback(() => {
    setI((prev) => {
      if (!manifest) return prev
      if (prev + 1 >= manifest.shots.length) { setDone(true); return prev }
      return prev + 1
    })
  }, [manifest])

  // Drive the current shot: voice-over + auto-advance, scaled by playback speed
  useEffect(() => {
    if (!manifest || done || paused) return
    const shot = manifest.shots[i]
    if (!shot) return
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }

    let advanced = false
    const go = () => { if (advanced) return; advanced = true; next() }

    const vurl = voiceOf(shot, audioLang)
    if (vurl) {
      const audio = new Audio(vurl)
      audio.playbackRate = speed
      audioRef.current = audio
      audio.onended = go
      audio.play().catch(() => {})
    }
    timerRef.current = window.setTimeout(go, (Math.max(shot.durationSec, 3) / speed) * 1000 + 500)
    return clearTimer
  }, [manifest, i, done, paused, audioLang, speed, next])

  // Keep video playbackRate in sync
  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = speed
  }, [speed, i])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && (settings ? setSettings(false) : onClose())
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = series ? 'hidden' : ''
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [series, onClose, settings])

  const restart = () => { setI(0); setDone(false); setPaused(false) }

  const shot = manifest?.shots[i]
  const total = manifest?.shots.length ?? 0
  const subtitle = shot && subLang !== 'off' ? capOf(shot, subLang) : ''
  const filter = QUALITY_FILTER[quality]

  return (
    <AnimatePresence>
      {series && (
        <motion.div
          className="fixed inset-0 z-[110] flex flex-col bg-black"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          {/* Stage */}
          <div className="relative flex-1 overflow-hidden">
            {shot && (
              <div key={i} className="absolute inset-0">
                {shot.clipUrl ? (
                  <video
                    ref={videoRef}
                    src={shot.clipUrl}
                    className="h-full w-full bg-black object-contain"
                    style={{ filter }}
                    autoPlay muted playsInline loop
                  />
                ) : (
                  <img
                    src={shot.imageUrl} alt=""
                    className="animate-kenburns h-full w-full object-cover"
                    style={{ filter, ['--kb-dur' as string]: `${Math.max(shot.durationSec, 3) / speed}s` }}
                  />
                )}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />

                {subtitle && (
                  <motion.div
                    key={'cap' + i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                    className="absolute inset-x-0 bottom-28 mx-auto max-w-3xl px-6 text-center"
                  >
                    {shot.speaker && shot.speaker !== 'Narrator' && (
                      <span className="mb-1 inline-block rounded bg-fruit-red-bright/90 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white">
                        {shot.speaker}
                      </span>
                    )}
                    <p className="font-display text-xl font-semibold text-cream text-shadow-cinema sm:text-2xl">
                      {subtitle}
                    </p>
                  </motion.div>
                )}
              </div>
            )}

            {!manifest && <div className="grid h-full place-items-center text-cream/60">Loading episode…</div>}

            {done && (
              <div className="absolute inset-0 grid place-items-center bg-black/85">
                <div className="text-center">
                  <p className="font-display text-3xl font-extrabold text-cream">To be continued…</p>
                  <p className="mt-1 text-cream/60">{manifest?.title}</p>
                  <button onClick={restart} className="mt-5 inline-flex items-center gap-2 rounded-full bg-fruit-red-bright px-6 py-2.5 font-bold text-white transition hover:brightness-110">
                    <ReplayIcon size={18} /> Replay
                  </button>
                </div>
              </div>
            )}

            {/* Segmented progress */}
            <div className="absolute inset-x-0 top-0 flex gap-1 p-3">
              {Array.from({ length: total }).map((_, k) => (
                <div key={k} className="h-1 flex-1 overflow-hidden rounded-full bg-white/25">
                  <div className="h-full bg-fruit-red-bright" style={{ width: k < i || done ? '100%' : k === i ? '100%' : '0%' }} />
                </div>
              ))}
            </div>

            {/* Settings popover */}
            <AnimatePresence>
              {settings && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-20 right-4 w-72 rounded-2xl border border-white/10 bg-ink-900/95 p-4 shadow-2xl backdrop-blur-xl"
                >
                  <Section icon={<VolumeIcon size={15} />} label="Audio">
                    <Segmented options={langs.map((l) => ({ v: l, label: LANG_LABEL[l] }))} value={audioLang} onChange={(v) => setAudioLang(v as Lang)} />
                  </Section>
                  <Section icon={<CaptionsIcon size={15} />} label="Subtitles">
                    <Segmented
                      options={[{ v: 'off', label: 'Off' }, ...langs.map((l) => ({ v: l, label: l.toUpperCase() }))]}
                      value={subLang} onChange={(v) => setSubLang(v as Lang | 'off')}
                    />
                  </Section>
                  <Section icon={<GaugeIcon size={15} />} label="Speed">
                    <Segmented options={SPEEDS.map((s) => ({ v: String(s), label: s + '×' }))} value={String(speed)} onChange={(v) => setSpeed(Number(v))} />
                  </Section>
                  <Section icon={<SettingsIcon size={15} />} label="Quality">
                    <Segmented options={(['auto', 'high', 'medium', 'low'] as Quality[]).map((q) => ({ v: q, label: QUALITY_LABEL[q] }))} value={quality} onChange={(v) => setQuality(v as Quality)} />
                  </Section>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4 bg-black px-5 py-4">
            <button onClick={onClose} className="text-cream/70 transition hover:text-cream" aria-label="Close">
              <CloseIcon />
            </button>
            <button
              onClick={() => setPaused((p) => !p)}
              className="grid h-11 w-11 place-items-center rounded-full bg-cream text-ink-950 transition hover:bg-white"
              aria-label={paused ? 'Play' : 'Pause'}
            >
              {paused ? <PlayIcon size={18} /> : <PauseIcon size={18} />}
            </button>
            <div className="min-w-0">
              <p className="truncate font-display font-bold text-cream">{manifest?.title ?? series.title}</p>
              <p className="text-xs text-cream/50">
                Scene {Math.min(i + 1, total || 1)}/{total || '…'} · {LANG_LABEL[audioLang]} · {QUALITY_LABEL[quality]}
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => setSettings(true)}
                className="hidden items-center gap-1 rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-cream/80 transition hover:border-white/40 sm:flex"
              >
                {LANG_LABEL[audioLang]} <ChevronDown size={13} />
              </button>
              <button
                onClick={() => { const on = subLang !== 'off'; setSubLang(on ? 'off' : 'fr') }}
                className={`grid h-9 w-9 place-items-center rounded-full border transition ${subLang !== 'off' ? 'border-fruit-red-bright bg-fruit-red/20 text-cream' : 'border-white/15 text-cream/70 hover:border-white/40'}`}
                aria-label="Toggle subtitles"
              >
                <CaptionsIcon size={18} />
              </button>
              <button
                onClick={() => setSettings((s) => !s)}
                className={`grid h-9 w-9 place-items-center rounded-full border transition ${settings ? 'border-white/50 text-cream' : 'border-white/15 text-cream/70 hover:border-white/40'}`}
                aria-label="Settings"
              >
                <SettingsIcon size={18} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Section({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3 last:mb-0">
      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-cream/50">
        {icon} {label}
      </div>
      {children}
    </div>
  )
}

function Segmented({
  options, value, onChange,
}: {
  options: { v: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${value === o.v ? 'bg-fruit-red-bright text-white' : 'bg-white/5 text-cream/70 hover:bg-white/10'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
