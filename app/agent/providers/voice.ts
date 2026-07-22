import { config, log } from '../config'
import { publicPath, publicUrl, writeText, writeBinary } from '../util'
import { geminiTTS } from './gemini'
import { falRun, fetchBytes } from './fal'
import type { Lang } from '../types'

export interface VoiceRequest {
  seriesId: string
  name: string // e.g. "voice-0-fr"
  text: string
  lang?: Lang
  /** Prebuilt voice name for this character (ElevenLabs or Gemini). */
  voice?: string
}

export interface VoiceResult {
  url: string | null
  remote?: string
}

async function openaiTTS(text: string): Promise<Buffer> {
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.openaiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'tts-1', voice: 'onyx', input: text, response_format: 'mp3' }),
  })
  if (!res.ok) throw new Error(`openai-tts ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

/**
 * Narrates one line in the character's voice. Returns local URL (for the app)
 * and a remote fal URL (for chaining into lip-sync/video).
 */
export async function generateVoice(req: VoiceRequest): Promise<VoiceResult> {
  if (!req.text.trim()) return { url: null }
  const dir = ['generated', req.seriesId]

  if (config.voice === 'fal-elevenlabs' && config.falKey) {
    try {
      log('voice', `elevenlabs ← ${req.name} (${req.voice ?? 'default'})`)
      const json = await falRun<{ audio?: { url: string } }>(config.falTTSModel, {
        text: req.text,
        voice: req.voice || 'Rachel',
      })
      const remote = json.audio?.url
      if (!remote) throw new Error('elevenlabs: no audio url')
      const abs = publicPath(...dir, `${req.name}.mp3`)
      await writeBinary(abs, await fetchBytes(remote))
      return { url: publicUrl(...dir, `${req.name}.mp3`), remote }
    } catch (e) {
      log('voice', `elevenlabs failed (${(e as Error).message}); caption fallback`)
    }
  } else if (config.voice === 'gemini' && config.geminiKey) {
    try {
      log('voice', `gemini ← ${req.name} (${req.voice ?? 'default'})`)
      const wav = await geminiTTS(req.text, req.voice)
      await writeBinary(publicPath(...dir, `${req.name}.wav`), wav)
      return { url: publicUrl(...dir, `${req.name}.wav`) }
    } catch (e) {
      log('voice', `gemini failed (${(e as Error).message}); caption fallback`)
    }
  } else if (config.voice === 'openai' && config.openaiKey) {
    try {
      log('voice', `openai ← ${req.name}`)
      await writeBinary(publicPath(...dir, `${req.name}.mp3`), await openaiTTS(req.text))
      return { url: publicUrl(...dir, `${req.name}.mp3`) }
    } catch (e) {
      log('voice', `openai failed (${(e as Error).message}); caption fallback`)
    }
  }

  log('voice', `caption ← ${req.name}`)
  await writeText(publicPath(...dir, `${req.name}.txt`), req.text)
  return { url: null }
}
