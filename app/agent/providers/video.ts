import { readFile } from 'node:fs/promises'
import { config, log } from '../config'
import { publicPath, publicUrl, writeText, writeBinary } from '../util'

export interface VideoRequest {
  seriesId: string
  name: string // e.g. "clip-0"
  imageUrl: string // keyframe to animate (image-to-video)
  prompt: string
  durationSec: number
}

/** Turns a public-relative keyframe path into a data URI fal can read directly. */
async function toDataUri(imageUrl: string): Promise<string> {
  if (/^https?:/.test(imageUrl)) return imageUrl
  const rel = imageUrl.replace(/^\//, '').split('/')
  const bytes = await readFile(publicPath(...rel))
  const ext = imageUrl.split('.').pop()?.toLowerCase()
  const mime = ext === 'png' ? 'image/png' : ext === 'svg' ? 'image/svg+xml' : 'image/jpeg'
  return `data:${mime};base64,${Buffer.from(bytes).toString('base64')}`
}

/* ----------------------------- fal: LTX-Video ------------------------------ *
 * Video generation runs for minutes, so we use fal's async QUEUE API
 * (submit → poll status → fetch result) rather than the sync endpoint, which
 * drops long connections ("fetch failed").
 * -------------------------------------------------------------------------- */

const sleepMs = (ms: number) => new Promise((r) => setTimeout(r, ms))
const auth = () => ({ Authorization: `Key ${config.falKey}` })

async function falLtx(req: VideoRequest, absMp4: string, urlMp4: string) {
  const image_url = await toDataUri(req.imageUrl)

  // 1. Submit to the queue — bias LTX toward real motion, not a static hold.
  const motionPrompt = `${req.prompt}. Dynamic camera movement, characters and elements in motion, cinematic action, no static frames.`
  const submit = await fetch(`https://queue.fal.run/${config.falVideoModel}`, {
    method: 'POST',
    headers: { ...auth(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: motionPrompt,
      negative_prompt: 'static, still image, frozen, motionless, low quality, worst quality',
      image_url,
      num_frames: 121,
      frame_rate: 24,
    }),
  })
  if (!submit.ok) throw new Error(`fal submit ${submit.status}: ${(await submit.text()).slice(0, 120)}`)
  const { status_url, response_url } = await submit.json()
  if (!status_url || !response_url) throw new Error('fal: no queue urls')

  // 2. Poll until completed (up to ~5 min)
  for (let i = 0; i < 100; i++) {
    await sleepMs(3000)
    const st = await fetch(status_url, { headers: auth() })
    const sj = await st.json()
    if (sj.status === 'COMPLETED') break
    if (sj.status === 'FAILED' || sj.status === 'ERROR') throw new Error('fal job failed')
    if (i === 99) throw new Error('fal poll timeout')
  }

  // 3. Fetch the result payload → video url → download
  const out = await fetch(response_url, { headers: auth() })
  if (!out.ok) throw new Error(`fal result ${out.status}`)
  const json = await out.json()
  const vUrl = json.video?.url ?? json.videos?.[0]?.url
  if (!vUrl) throw new Error('fal-ltx: no video url')
  const bin = await fetch(vUrl)
  await writeBinary(absMp4, Buffer.from(await bin.arrayBuffer()))
  return urlMp4
}

/**
 * Produces one animated clip. In mock mode we don't synthesize real video —
 * we emit a small clip manifest so the pipeline stays fully offline/free, and
 * the app treats the still keyframe as the "clip" (Ken-Burns slideshow).
 */
export async function generateClip(req: VideoRequest): Promise<string | null> {
  const dir = ['generated', req.seriesId]
  if (config.video === 'fal-ltx' && config.falKey) {
    try {
      log('video', `LTX ← ${req.name}`)
      return await falLtx(req, publicPath(...dir, `${req.name}.mp4`), publicUrl(...dir, `${req.name}.mp4`))
    } catch (e) {
      log('video', `LTX failed (${(e as Error).message}); manifest fallback`)
    }
  }
  log('video', `mock clip ← ${req.name}`)
  await writeText(
    publicPath(...dir, `${req.name}.json`),
    JSON.stringify({ type: 'still-clip', imageUrl: req.imageUrl, durationSec: req.durationSec, prompt: req.prompt }, null, 2),
  )
  return null // null clip → app falls back to the keyframe image
}
