import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Series } from '../data/series'
import { useUser } from '../lib/store'
import {
  CaptionsIcon, ChevronDown, CloseIcon, GaugeIcon, MusicIcon, PauseIcon,
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

/** Picks an addictive background-music mood from the series' genres/tags. */
function moodFor(s: Series | null): string {
  const g = ((s?.genres ?? []).join(' ') + ' ' + (s?.tags ?? []).join(' ')).toLowerCase()
  if (/comedy|sitcom|rom|feel-good|wacky|punny|musical/.test(g)) return 'comedic'
  if (/thriller|crime|noir|heist|legal/.test(g)) return 'tense'
  if (/mystery|myster|survival|dark/.test(g)) return 'mysterious'
  if (/fantasy|epic|action|sci-fi|adventure|telenovela|drama/.test(g)) return 'epic'
  return 'hype'
}

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
interface Cue { start: number; end: number; text: string }
interface Manifest {
  title: string
  shots: Shot[]
  langs?: Lang[]
  videoUrl?: string | null
  /** True for full-episode videos with their own baked audio (e.g. Grok clips):
   *  play the video unmuted, no overlaid music/voice, advance on end. */
  bakedAudio?: boolean
  /** Timed narrative subtitles per language for baked-audio episodes. */
  subtitles?: Partial<Record<Lang, Cue[]>>
}

const capOf = (s: Shot, l: Lang) => s.captions?.[l] ?? s.caption ?? ''
const voiceOf = (s: Shot, l: Lang) => s.voiceUrls?.[l] ?? s.voiceUrl ?? null

export default function EpisodePlayer({
  series,
  startEp = 1,
  onClose,
}: {
  series: Series | null
  startEp?: number
  onClose: () => void
}) {
  const [manifest, setManifest] = useState<Manifest | null>(null)
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  const [done, setDone] = useState(false)
  const [audioLang, setAudioLang] = useState<Lang>('fr')
  const [subLang, setSubLang] = useState<Lang | 'off'>('fr')
  const [speed, setSpeed] = useState(1)
  const [quality, setQuality] = useState<Quality>('auto')
  const [settings, setSettings] = useState(false)
  // `shown` is the scene actually on screen. It only advances to `i` once the
  // next clip is buffered, so scenes crossfade with no black flash.
  const [shown, setShown] = useState(0)
  const [ep, setEp] = useState(startEp)
  const [music, setMusic] = useState(true)
  const [curTime, setCurTime] = useState(0)
  const [autoIn, setAutoIn] = useState<number | null>(null) // autoplay countdown seconds

  const { state, saveProgress } = useUser()
  const episodeList = series?.episodes ?? []
  const currentEp = episodeList.find((e) => e.number === ep)
  const inlineManifest = currentEp?.manifestData as Manifest | undefined
  const manifestUrl = currentEp?.manifest ?? series?.episodeManifest
  const hasNext = episodeList.some((e) => e.number === ep + 1)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const musicRef = useRef<HTMLAudioElement | null>(null)
  const timerRef = useRef<number | null>(null)
  const lastSaveRef = useRef(0)   // throttle progress writes
  const resumedRef = useRef(false) // seek-to-resume only once per episode load

  // Background music (mood-matched, looping) set up per opened series.
  useEffect(() => {
    musicRef.current?.pause()
    musicRef.current = null
    if (!series) return
    const a = new Audio(`/music/${moodFor(series)}.mp3`)
    a.loop = true
    a.volume = 0.2
    musicRef.current = a
    return () => { a.pause() }
  }, [series])

  // Play/pause the music with the episode + music toggle.
  useEffect(() => {
    const a = musicRef.current
    if (!a) return
    if (music && !paused && !done && manifest && !manifest.bakedAudio) a.play().catch(() => {})
    else a.pause()
  }, [music, paused, done, manifest])

  // Preload the target scene, then promote it (crossfade in).
  useEffect(() => {
    if (!manifest || i === shown) return
    const s = manifest.shots[i]
    if (!s) return
    let cancelled = false
    const promote = () => !cancelled && setShown(i)
    let cleanup: (() => void) | undefined
    if (s.clipUrl) {
      const v = document.createElement('video')
      v.preload = 'auto'; v.muted = true; v.src = s.clipUrl
      v.oncanplaythrough = promote
      v.load()
      const t = window.setTimeout(promote, 1800) // safety
      cleanup = () => window.clearTimeout(t)
    } else {
      const img = new Image()
      img.onload = promote; img.src = s.imageUrl
      const t = window.setTimeout(promote, 1200)
      cleanup = () => window.clearTimeout(t)
    }
    return () => { cancelled = true; cleanup?.() }
  }, [i, shown, manifest])

  // Start at the requested episode whenever a new series opens.
  useEffect(() => { setEp(startEp) }, [series, startEp])

  // Load the current episode's manifest — inline (DB-sourced) or fetched JSON.
  useEffect(() => {
    setManifest(null); setI(0); setShown(0); setCurTime(0); setDone(false); setPaused(false)
    setAutoIn(null); resumedRef.current = false; lastSaveRef.current = 0
    if (!series) return
    if (inlineManifest) { setManifest(inlineManifest); return }
    if (!manifestUrl) return
    let cancelled = false
    fetch(manifestUrl, { cache: 'no-store' })
      .then((r) => r.json())
      .then((m: Manifest) => !cancelled && setManifest(m))
      .catch(() => !cancelled && setManifest({ title: series.title, shots: [], videoUrl: null }))
    return () => { cancelled = true }
  }, [series, manifestUrl, inlineManifest])

  // Autoplay: when an episode ends and another exists, start a cancelable countdown.
  useEffect(() => {
    if (done && hasNext) setAutoIn(6)
    else setAutoIn(null)
  }, [done, hasNext])
  useEffect(() => {
    if (autoIn === null) return
    if (autoIn <= 0) { setEp((k) => k + 1); return }
    const t = window.setTimeout(() => setAutoIn(autoIn - 1), 1000)
    return () => window.clearTimeout(t)
  }, [autoIn])

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

    // Full-episode baked-audio videos advance ONLY on their real 'ended' event
    // (see the <video> onEnded/onLoadedMetadata below). No manifest-duration timer
    // here — a stale duration must never cut the episode short.
    if (manifest.bakedAudio) return clearTimer

    const vurl = voiceOf(shot, audioLang)
    // Duck the background music while a line is spoken, restore it after.
    if (musicRef.current) musicRef.current.volume = vurl ? 0.12 : 0.24
    if (vurl) {
      const audio = new Audio(vurl)
      audio.playbackRate = speed
      audioRef.current = audio
      audio.onended = () => { if (musicRef.current) musicRef.current.volume = 0.24 }
      audio.play().catch(() => {})
    }
    // Hold each scene long enough to actually watch the motion and read the line
    // (min ~8s), instead of jumping the instant the short spoken line ends.
    const holdSec = Math.max(shot.durationSec || 0, 8)
    timerRef.current = window.setTimeout(go, (holdSec / speed) * 1000)
    return clearTimer
  }, [manifest, i, done, paused, audioLang, speed, next])

  // Keep video playbackRate in sync
  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = speed
  }, [speed, shown])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && (settings ? setSettings(false) : onClose())
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = series ? 'hidden' : ''
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [series, onClose, settings])

  const restart = () => { setI(0); setShown(0); setDone(false); setPaused(false) }

  const baked = !!manifest?.bakedAudio
  const shot = manifest?.shots[i]
  const visible = manifest?.shots[shown]
  const total = manifest?.shots.length ?? 0
  const subtitle = !baked && shot && subLang !== 'off' ? capOf(shot, subLang) : ''
  // Timed narrative subtitle for baked-audio episodes, driven by the video clock.
  const bakedSub =
    baked && manifest?.subtitles && subLang !== 'off'
      ? (manifest.subtitles[subLang] ?? []).find((c) => curTime >= c.start && curTime < c.end)?.text ?? ''
      : ''
  const filter = QUALITY_FILTER[quality]

  return (
    <AnimatePresence>
      {series && (
        <motion.div
          className="fixed inset-0 z-[110] flex flex-col bg-black"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          {/* Stage — crossfading scene layers (no black flash between scenes) */}
          <div className="relative flex-1 overflow-hidden bg-black">
            <AnimatePresence>
              {visible && (
                <motion.div
                  key={shown}
                  className="absolute inset-0"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.6, ease: 'easeInOut' }}
                >
                  {visible.clipUrl ? (
                    <video
                      ref={videoRef}
                      src={visible.clipUrl}
                      className="h-full w-full bg-black object-contain"
                      style={{ filter }}
                      autoPlay
                      muted={!baked}
                      loop={!baked}
                      playsInline
                      onTimeUpdate={baked ? (e) => {
                        const t = e.currentTarget.currentTime
                        const d = e.currentTarget.duration || 0
                        setCurTime(t)
                        // Persist resume position (throttled to ~5s) for Continue Watching.
                        if (series && d > 0 && t - lastSaveRef.current >= 5) {
                          lastSaveRef.current = t
                          saveProgress(series.id, { progress: Math.min(0.99, t / d), ep, time: t })
                        }
                      } : undefined}
                      onEnded={baked ? () => {
                        clearTimer()
                        if (series) saveProgress(series.id, { progress: hasNext ? 0.99 : 1, ep, time: 0 })
                        next()
                      } : undefined}
                      onLoadedMetadata={
                        baked
                          ? (e) => {
                              // Resume: if this is the saved episode, seek to where we left off.
                              const rec = series ? state.watched[series.id] : undefined
                              if (!resumedRef.current && rec?.ep === ep && (rec.time ?? 0) > 3 && (rec.progress ?? 0) < 0.98) {
                                try { e.currentTarget.currentTime = rec.time! } catch { /* noop */ }
                              }
                              resumedRef.current = true
                              // Safety net keyed to the REAL file duration (never the manifest),
                              // in case 'ended' doesn't fire. Generous so it never pre-empts.
                              clearTimer()
                              const d = e.currentTarget.duration || 12
                              timerRef.current = window.setTimeout(() => next(), ((d + 4) / speed) * 1000)
                            }
                          : undefined
                      }
                    />
                  ) : (
                    <img
                      src={visible.imageUrl} alt=""
                      className="animate-kenburns h-full w-full object-cover"
                      style={{ filter, ['--kb-dur' as string]: `${Math.max(visible.durationSec, 3) / speed}s` }}
                    />
                  )}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Subtitle layer (follows the audio scene) */}
            <AnimatePresence mode="wait">
              {subtitle && (
                <motion.div
                  key={'cap' + i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="pointer-events-none absolute inset-x-0 bottom-28 z-10 mx-auto max-w-3xl px-6 text-center"
                >
                  {shot?.speaker && shot.speaker !== 'Narrator' && (
                    <span className="mb-1 inline-block rounded bg-fruit-red-bright/90 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white">
                      {shot.speaker}
                    </span>
                  )}
                  <p className="font-display text-2xl font-extrabold uppercase leading-tight tracking-wide text-cream text-shadow-cinema sm:text-3xl">
                    {subtitle.split(/\s+/).map((w, wi, arr) => (
                      <span
                        key={wi}
                        className="kw mr-[0.3em]"
                        style={{ animationDelay: `${wi * Math.min(0.32, ((shot?.durationSec ?? 8) * 0.7) / arr.length)}s` }}
                      >
                        {w}
                      </span>
                    ))}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Baked-audio timed narrative subtitle (Grok episodes) */}
            {bakedSub && (
              <motion.div
                key={'bsub' + bakedSub}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="pointer-events-none absolute inset-x-0 bottom-24 z-10 mx-auto max-w-3xl px-6 text-center"
              >
                <p className="whitespace-pre-line font-display text-2xl font-extrabold uppercase leading-tight tracking-wide text-cream text-shadow-cinema sm:text-3xl">
                  {bakedSub}
                </p>
              </motion.div>
            )}

            {!manifest && <div className="grid h-full place-items-center text-cream/60">Loading episode…</div>}

            {done && (
              <div className="absolute inset-0 grid place-items-center bg-black/85">
                <div className="text-center">
                  <p className="font-display text-3xl font-extrabold text-cream">To be continued…</p>
                  <p className="mt-1 text-cream/60">{manifest?.title}</p>
                  {autoIn !== null && hasNext && (
                    <p className="mt-3 text-sm text-cream/70">Prochain épisode dans <span className="font-bold text-cream">{autoIn}s</span> · <button onClick={() => setAutoIn(null)} className="underline hover:text-cream">Annuler</button></p>
                  )}
                  <div className="mt-5 flex items-center justify-center gap-3">
                    {hasNext && (
                      <button
                        onClick={() => setEp((n) => n + 1)}
                        className="inline-flex items-center gap-2 rounded-full bg-fruit-red-bright px-6 py-2.5 font-bold text-white transition hover:brightness-110"
                      >
                        <PlayIcon size={18} /> {autoIn !== null ? 'Regarder maintenant' : 'Next episode'}
                      </button>
                    )}
                    <button onClick={restart} className={`inline-flex items-center gap-2 rounded-full px-6 py-2.5 font-bold transition ${hasNext ? 'border border-white/25 text-cream hover:border-white/50' : 'bg-fruit-red-bright text-white hover:brightness-110'}`}>
                      <ReplayIcon size={18} /> Replay
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Segmented progress */}
            <div className="safe-top absolute inset-x-0 top-0 flex gap-1 p-3">
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
                  <Section icon={<MusicIcon size={15} />} label="Music">
                    <Segmented options={[{ v: 'on', label: 'On' }, { v: 'off', label: 'Off' }]} value={music ? 'on' : 'off'} onChange={(v) => setMusic(v === 'on')} />
                  </Section>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Controls */}
          <div className="pad-b-safe pad-x-nav flex items-center gap-4 bg-black pt-4">
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
