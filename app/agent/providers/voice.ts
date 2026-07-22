import { config, log } from '../config'
import { publicPath, publicUrl, writeText, writeBinary } from '../util'
import { geminiTTS } from './gemini'
import type { Lang } from '../types'

export interface VoiceRequest {
  seriesId: string
  name: string // e.g. "voice-0-fr"
  text: string
  lang?: Lang
  /** Gemini TTS prebuilt voice name for this character. */
  voice?: string
}

/* ------------------------------ OpenAI tts-1 ------------------------------- */

async function openaiTTS(req: VoiceRequest, absMp3: string, urlMp3: string) {
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.openaiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'tts-1', voice: 'onyx', input: req.text, response_format: 'mp3' }),
  })
  if (!res.ok) throw new Error(`openai-tts ${res.status}`)
  await writeBinary(absMp3, Buffer.from(await res.arrayBuffer()))
  return urlMp3
}

/* ------------------------------- ElevenLabs -------------------------------- */

async function elevenTTS(req: VoiceRequest, absMp3: string, urlMp3: string) {
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${config.elevenVoiceId}`,
    {
      method: 'POST',
      headers: { 'xi-api-key': config.elevenKey!, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: req.text, model_id: 'eleven_turbo_v2_5' }),
    },
  )
  if (!res.ok) throw new Error(`elevenlabs ${res.status}`)
  await writeBinary(absMp3, Buffer.from(await res.arrayBuffer()))
  return urlMp3
}

/**
 * Narrates one line. Mock mode writes the caption text (the app can render it
 * as a subtitle / use the browser's built-in speech synthesis for free audio).
 */
export async function generateVoice(req: VoiceRequest): Promise<string | null> {
  if (!req.text.trim()) return null
  const dir = ['generated', req.seriesId]
  const absMp3 = publicPath(...dir, `${req.name}.mp3`)
  const urlMp3 = publicUrl(...dir, `${req.name}.mp3`)

  if (config.voice === 'gemini' && config.geminiKey) {
    try {
      log('voice', `gemini ← ${req.name} (${req.voice ?? 'default'})`)
      const wav = await geminiTTS(req.text, req.voice)
      await writeBinary(publicPath(...dir, `${req.name}.wav`), wav)
      return publicUrl(...dir, `${req.name}.wav`)
    } catch (e) {
      log('voice', `gemini failed (${(e as Error).message}); caption fallback`)
    }
  } else if (config.voice === 'openai' && config.openaiKey) {
    try {
      log('voice', `openai ← ${req.name}`)
      return await openaiTTS(req, absMp3, urlMp3)
    } catch (e) {
      log('voice', `openai failed (${(e as Error).message}); caption fallback`)
    }
  } else if (config.voice === 'elevenlabs' && config.elevenKey) {
    try {
      log('voice', `elevenlabs ← ${req.name}`)
      return await elevenTTS(req, absMp3, urlMp3)
    } catch (e) {
      log('voice', `elevenlabs failed (${(e as Error).message}); caption fallback`)
    }
  }

  log('voice', `caption ← ${req.name}`)
  await writeText(publicPath(...dir, `${req.name}.txt`), req.text)
  return null // null → app shows caption / uses Web Speech API
}
