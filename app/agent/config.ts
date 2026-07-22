/**
 * Central configuration for the NETFRUIT generation agent.
 *
 * Everything defaults to FREE / OFFLINE mock providers so `npm run generate`
 * works with zero keys and zero cost. Set the env vars below to swap in the
 * real (cheap) providers documented in agent/README.md.
 */

// Load app/.env (Node 20.12+) so keys live in a file, never in the shell history
// or this chat. Silently ignored if the file is absent.
try {
  ;(process as unknown as { loadEnvFile: (p: string | URL) => void }).loadEnvFile(
    new URL('../.env', import.meta.url),
  )
} catch {
  /* no .env — fine */
}

import type { Lang } from './types'

const env = process.env

export type ImageProvider = 'mock' | 'pollinations' | 'gemini' | 'fal-flux' | 'fal-nano'
export type VideoProvider = 'mock' | 'fal-ltx' | 'fal-kling' | 'fal-wan' | 'fal-talk'
export type VoiceProvider = 'mock' | 'gemini' | 'openai' | 'elevenlabs' | 'fal-elevenlabs'
export type LLMProvider = 'mock' | 'gemini' | 'anthropic' | 'fal'

export interface AgentConfig {
  llm: LLMProvider
  image: ImageProvider
  video: VideoProvider
  voice: VoiceProvider
  geminiKey?: string
  geminiImageModel: string
  geminiTextModel: string
  geminiTTSModel: string
  geminiVoiceName: string
  anthropicKey?: string
  anthropicModel: string
  falKey?: string
  falVideoModel: string
  falTextModel: string
  falImageModel: string
  falNanoModel: string
  falTTSModel: string
  falTalkModel: string
  falKlingModel: string
  falWanModel: string
  falLipsyncModel: string
  falLipsync: boolean
  /** Languages to render lip-synced talking video for (others get audio+subs). */
  lipsyncLangs: Lang[]
  openaiKey?: string
  elevenKey?: string
  elevenVoiceId: string
  clipDurationSec: number
  episodeMinSec: number
  /** How many shots per episode. */
  shotsPerEpisode: number
  outDir: string // public dir that Vite serves
}

const gem = env.GEMINI_API_KEY || env.GOOGLE_API_KEY

const fal = env.FAL_KEY

export const config: AgentConfig = {
  // Premium path: when a fal key is present, route EVERYTHING through fal.ai
  // (openai/gpt-4o script, Flux images, ElevenLabs voices, talking-head video).
  llm:
    (env.NETFRUIT_LLM as LLMProvider) ||
    (fal ? 'fal' : env.ANTHROPIC_API_KEY ? 'anthropic' : gem ? 'gemini' : 'mock'),
  // Nano Banana (Gemini image) beats Flux on fruit-head fidelity + consistency.
  image: (env.NETFRUIT_IMAGE as ImageProvider) || (fal ? 'fal-nano' : 'pollinations'),
  // Wan 2.2 = reference-quality controlled motion at a fraction of Kling's cost.
  video: (env.NETFRUIT_VIDEO as VideoProvider) || (fal ? 'fal-wan' : 'mock'),
  voice: (env.NETFRUIT_VOICE as VoiceProvider) || (fal ? 'fal-elevenlabs' : gem ? 'gemini' : 'mock'),

  geminiKey: gem,
  geminiImageModel: env.NETFRUIT_GEMINI_IMAGE || 'gemini-2.5-flash-image',
  geminiTextModel: env.NETFRUIT_GEMINI_TEXT || 'gemini-flash-latest',
  geminiTTSModel: env.NETFRUIT_GEMINI_TTS || 'gemini-2.5-flash-preview-tts',
  geminiVoiceName: env.NETFRUIT_GEMINI_VOICE || 'Kore',

  anthropicKey: env.ANTHROPIC_API_KEY,
  anthropicModel: env.NETFRUIT_LLM_MODEL || 'claude-haiku-4-5',

  falKey: fal,
  falVideoModel: env.NETFRUIT_FAL_VIDEO || 'fal-ai/ltx-video/image-to-video',
  falTextModel: env.NETFRUIT_FAL_TEXT || 'openai/gpt-4o',
  // flux/schnell: ~10× cheaper than /dev, still great for the stylized mascots.
  falImageModel: env.NETFRUIT_FAL_IMAGE || 'fal-ai/flux/schnell',
  falNanoModel: env.NETFRUIT_FAL_NANO || 'fal-ai/nano-banana',
  falTTSModel: env.NETFRUIT_FAL_TTS || 'fal-ai/elevenlabs/tts/multilingual-v2',
  falTalkModel: env.NETFRUIT_FAL_TALK || 'fal-ai/sadtalker',
  falKlingModel: env.NETFRUIT_FAL_KLING || 'fal-ai/kling-video/v1.6/standard/image-to-video',
  falWanModel: env.NETFRUIT_FAL_WAN || 'fal-ai/wan/v2.2-a14b/image-to-video',
  falLipsyncModel: env.NETFRUIT_FAL_LIPSYNC || 'fal-ai/sync-lipsync',
  // Real phoneme lip-sync is opt-in now (Kling already animates the mouth) — it
  // ~doubles video cost/time, so default OFF. Enable per-run with NETFRUIT_LIPSYNC=1.
  falLipsync: env.NETFRUIT_LIPSYNC === '1',
  lipsyncLangs: (env.NETFRUIT_LIPSYNC_LANGS?.split(',') as Lang[]) || ['fr'],

  openaiKey: env.OPENAI_API_KEY,
  elevenKey: env.ELEVENLABS_API_KEY,
  elevenVoiceId: env.ELEVENLABS_VOICE_ID || 'Rachel',

  // Episode length: aim for >= 3 min. With ~10s clips that's ~18 scenes.
  // Fewer, longer clips = big cost saving vs many 5s clips.
  clipDurationSec: Number(env.NETFRUIT_CLIP_SEC || 10),
  episodeMinSec: Number(env.NETFRUIT_EPISODE_MIN_SEC || 180),
  shotsPerEpisode: Number(
    env.NETFRUIT_SHOTS || Math.ceil(Number(env.NETFRUIT_EPISODE_MIN_SEC || 180) / Number(env.NETFRUIT_CLIP_SEC || 10)),
  ),
  outDir: env.NETFRUIT_OUT || new URL('../public', import.meta.url).pathname,
}

export function providerSignature(): string {
  return `llm:${config.llm}|img:${config.image}|vid:${config.video}|voice:${config.voice}`
}

export function log(stage: string, msg: string) {
  const pad = stage.padEnd(9)
  console.log(`  \x1b[2m${pad}\x1b[0m ${msg}`)
}
