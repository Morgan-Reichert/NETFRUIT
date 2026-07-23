import { useRef, useState } from 'react'
import { addEpisode, listEpisodes, uploadToBucket, type Creator, type DbEpisode, type DbSeries } from '../lib/creator'
import { CloseIcon } from '../components/icons'

// Reuse the app's mood soundtracks as selectable background music.
const TRACKS = [
  { v: 'epic', label: 'Épique' }, { v: 'hype', label: 'Entraînant' },
  { v: 'mysterious', label: 'Mystérieux' }, { v: 'tense', label: 'Tendu' }, { v: 'comedic', label: 'Comique' },
]

type Line = { text: string; size: number; color: string; gap: number }

function buildLines(series: DbSeries): Line[] {
  const L: Line[] = []
  L.push({ text: series.title, size: 64, color: '#ffffff', gap: 40 })
  L.push({ text: 'un original NETFRUIT', size: 24, color: '#12a565', gap: 90 })
  for (const c of series.credits ?? []) {
    if (!c.role && !c.name) continue
    L.push({ text: (c.role || '').toUpperCase(), size: 22, color: '#7f9b96', gap: 6 })
    L.push({ text: c.name || '', size: 34, color: '#f7f3e8', gap: 44 })
  }
  if ((series.ai_tools ?? []).length) {
    L.push({ text: 'IA UTILISÉES', size: 22, color: '#7f9b96', gap: 6 })
    L.push({ text: (series.ai_tools ?? []).join(' · '), size: 30, color: '#f7f3e8', gap: 60 })
  }
  L.push({ text: 'NETFRUIT', size: 40, color: '#12a565', gap: 20 })
  L.push({ text: 'netfruit.fun', size: 22, color: '#7f9b96', gap: 0 })
  return L
}

const pickMime = () =>
  ['video/mp4;codecs=avc1,mp4a', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
    .find((m) => (window as any).MediaRecorder?.isTypeSupported?.(m)) ?? 'video/webm'

export default function CreditsMovie({ creator, series, onClose, onAdded }: {
  creator: Creator; series: DbSeries; onClose: () => void; onAdded: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [mood, setMood] = useState('epic')
  const [duration, setDuration] = useState(16)
  const [phase, setPhase] = useState<'idle' | 'rendering' | 'uploading' | 'done'>('idle')
  const [msg, setMsg] = useState<string | null>(null)

  const run = async () => {
    const canvas = canvasRef.current!
    canvas.width = 720; canvas.height = 1280
    const ctx = canvas.getContext('2d')!
    const lines = buildLines(series)

    // audio graph → capturable music track
    const music = new Audio(`/music/${mood}.mp3`)
    music.loop = true
    let actx: AudioContext | null = null
    let audioTracks: MediaStreamTrack[] = []
    try {
      actx = new AudioContext()
      const srcNode = actx.createMediaElementSource(music)
      const destNode = actx.createMediaStreamDestination()
      srcNode.connect(destNode); srcNode.connect(actx.destination)
      audioTracks = destNode.stream.getAudioTracks()
    } catch { /* music optional */ }

    const stream = canvas.captureStream(30)
    audioTracks.forEach((t) => stream.addTrack(t))
    const mime = pickMime()
    const rec = new MediaRecorder(stream, { mimeType: mime })
    const chunks: BlobPart[] = []
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }

    const done = new Promise<Blob>((resolve) => {
      rec.onstop = () => resolve(new Blob(chunks, { type: mime }))
    })

    // total content height
    const contentH = lines.reduce((h, l) => h + l.size + l.gap, 0)
    const scroll = contentH + canvas.height // travel from fully-below to fully-above
    const totalMs = duration * 1000

    setPhase('rendering')
    await actx?.resume().catch(() => {})
    music.play().catch(() => {})
    rec.start()
    const t0 = performance.now()
    await new Promise<void>((resolve) => {
      const frame = (now: number) => {
        const p = Math.min(1, (now - t0) / totalMs)
        ctx.fillStyle = '#051413'; ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.fillStyle = '#0a1f1e'; ctx.fillRect(0, 0, canvas.width, 6)
        ctx.textAlign = 'center'
        let y = canvas.height - p * scroll
        for (const l of lines) {
          y += l.size
          if (y > -60 && y < canvas.height + 60) {
            ctx.font = `${l.size >= 40 ? '800' : '600'} ${l.size}px Arial, sans-serif`
            ctx.fillStyle = l.color
            ctx.fillText(l.text, canvas.width / 2, y)
          }
          y += l.gap
        }
        if (p < 1) requestAnimationFrame(frame)
        else { rec.stop(); music.pause(); resolve() }
      }
      requestAnimationFrame(frame)
    })

    const blob = await done
    actx?.close().catch(() => {})

    setPhase('uploading')
    try {
      const eps: DbEpisode[] = await listEpisodes(series.id)
      const number = (eps.at(-1)?.number ?? 0) + 1
      const ext = mime.includes('mp4') ? 'mp4' : 'webm'
      const url = await uploadToBucket(creator.id, series.slug, `credits.${ext}`, blob)
      await addEpisode({
        series_id: series.id, season: eps.at(-1)?.season ?? 1, ep: number, number,
        title: 'Générique', video_url: url, duration_sec: duration, subtitles: null,
        baked_audio: true, token_cost: 0,
      })
      setPhase('done'); setMsg('Générique ajouté comme dernier épisode ✓'); onAdded()
    } catch (e) { setPhase('idle'); setMsg('Échec upload : ' + (e as Error).message) }
  }

  return (
    <div className="fixed inset-0 z-[120] grid place-items-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-ink-900 p-5 text-cream" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold">Générer le générique de fin</h3>
          <button onClick={onClose} className="text-cream/50 hover:text-cream"><CloseIcon size={18} /></button>
        </div>
        <p className="mb-4 text-sm text-cream/60">Un générique façon film (crédits + IA qui défilent) sur une musique, ajouté comme dernier épisode de la série.</p>

        <div className="flex gap-4">
          <canvas ref={canvasRef} className="h-64 w-36 shrink-0 rounded-lg border border-white/10 bg-ink-950" />
          <div className="flex-1 space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm text-cream/70">Musique de fond</span>
              <select value={mood} onChange={(e) => setMood(e.target.value)} className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 outline-none">
                {TRACKS.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm text-cream/70">Durée : {duration}s</span>
              <input type="range" min={10} max={40} value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="w-full accent-fruit-red-bright" />
            </label>
            <button disabled={phase === 'rendering' || phase === 'uploading'} onClick={run}
              className="w-full rounded-full bg-fruit-red-bright px-5 py-2.5 font-bold text-white enabled:hover:brightness-110 disabled:opacity-50">
              {phase === 'rendering' ? 'Génération…' : phase === 'uploading' ? 'Upload…' : phase === 'done' ? 'Terminé ✓' : 'Générer'}
            </button>
            {msg && <p className="text-sm text-cream/70">{msg}</p>}
          </div>
        </div>
        <p className="mt-3 text-xs text-cream/40">Renseigne d'abord les crédits et les IA dans « Classification & crédits ».</p>
      </div>
    </div>
  )
}
