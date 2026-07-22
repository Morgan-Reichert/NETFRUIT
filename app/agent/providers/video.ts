import { readFile } from 'node:fs/promises'
import { config, log } from '../config'
import { publicPath, publicUrl, writeText, writeBinary } from '../util'
import { falQueue, fetchBytes } from './fal'

export interface VideoRequest {
  seriesId: string
  name: string // e.g. "clip-0"
  imageUrl: string // local keyframe (fallback)
  imageRemote?: string // fal-hosted keyframe URL (preferred for chaining)
  audioRemote?: string // fal-hosted voice URL (for lip-sync)
  prompt: string
  durationSec: number
}

/** Local public-relative path → data URI (fallback when no remote URL exists). */
async function toDataUri(imageUrl: string): Promise<string> {
  if (/^https?:/.test(imageUrl)) return imageUrl
  const rel = imageUrl.replace(/^\//, '').split('/')
  const bytes = await readFile(publicPath(...rel))
  const ext = imageUrl.split('.').pop()?.toLowerCase()
  const mime = ext === 'png' ? 'image/png' : ext === 'svg' ? 'image/svg+xml' : 'image/jpeg'
  return `data:${mime};base64,${Buffer.from(bytes).toString('base64')}`
}

/* ----------------------------- fal: Kling i2v ------------------------------ *
 * Flux keyframe → Kling image-to-video (character talks, gestures, mouth moves,
 * camera moves). Optionally refined with sync-lipsync against the voice track.
 * -------------------------------------------------------------------------- */

async function falKling(req: VideoRequest, absMp4: string, urlMp4: string) {
  const image_url = req.imageRemote ?? (await toDataUri(req.imageUrl))
  const kling = await falQueue<{ video?: { url: string } }>(config.falKlingModel, {
    prompt:
      `${req.prompt}. The character is talking animatedly, mouth moving, expressive gestures, ` +
      `lively camera. Smooth cinematic motion.`,
    image_url,
    duration: '5',
  })
  let videoUrl = kling.video?.url
  if (!videoUrl) throw new Error('kling: no video url')

  // Optional real phoneme lip-sync on top of the Kling clip
  if (config.falLipsync && req.audioRemote) {
    try {
      log('video', `lipsync ← ${req.name}`)
      const ls = await falQueue<{ video?: { url: string } }>(config.falLipsyncModel, {
        video_url: videoUrl,
        audio_url: req.audioRemote,
      })
      if (ls.video?.url) videoUrl = ls.video.url
    } catch (e) {
      log('video', `lipsync failed (${(e as Error).message}); using Kling clip`)
    }
  }

  await writeBinary(absMp4, await fetchBytes(videoUrl))
  return urlMp4
}

/* ---------------------------- fal: SadTalker ------------------------------- */

async function falTalk(req: VideoRequest, absMp4: string, urlMp4: string) {
  if (!req.imageRemote || !req.audioRemote) throw new Error('sadtalker: needs remote image+audio')
  const out = await falQueue<{ video?: { url: string } }>(config.falTalkModel, {
    source_image_url: req.imageRemote,
    driven_audio_url: req.audioRemote,
  })
  const v = out.video?.url
  if (!v) throw new Error('sadtalker: no video url')
  await writeBinary(absMp4, await fetchBytes(v))
  return urlMp4
}

/* ------------------------------ fal: LTX ----------------------------------- */

async function falLtx(req: VideoRequest, absMp4: string, urlMp4: string) {
  const image_url = req.imageRemote ?? (await toDataUri(req.imageUrl))
  const out = await falQueue<{ video?: { url: string } }>(config.falVideoModel, {
    prompt: `${req.prompt}. Dynamic motion, moving camera, cinematic.`,
    negative_prompt: 'static, still image, frozen, low quality',
    image_url,
    num_frames: 121,
    frame_rate: 24,
  })
  const v = out.video?.url
  if (!v) throw new Error('ltx: no video url')
  await writeBinary(absMp4, await fetchBytes(v))
  return urlMp4
}

/** Produces one animated clip. Falls back to a still-clip manifest on failure. */
export async function generateClip(req: VideoRequest): Promise<string | null> {
  const dir = ['generated', req.seriesId]
  const absMp4 = publicPath(...dir, `${req.name}.mp4`)
  const urlMp4 = publicUrl(...dir, `${req.name}.mp4`)

  const providers: Record<string, () => Promise<string>> = {
    'fal-kling': () => falKling(req, absMp4, urlMp4),
    'fal-talk': () => falTalk(req, absMp4, urlMp4),
    'fal-ltx': () => falLtx(req, absMp4, urlMp4),
  }
  const run = providers[config.video]
  if (run && config.falKey) {
    try {
      log('video', `${config.video} ← ${req.name}`)
      return await run()
    } catch (e) {
      log('video', `${config.video} failed (${(e as Error).message}); manifest fallback`)
    }
  }

  log('video', `mock clip ← ${req.name}`)
  await writeText(
    publicPath(...dir, `${req.name}.json`),
    JSON.stringify({ type: 'still-clip', imageUrl: req.imageUrl, durationSec: req.durationSec, prompt: req.prompt }, null, 2),
  )
  return null
}
