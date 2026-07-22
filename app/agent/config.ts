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

const env = process.env

export type ImageProvider = 'mock' | 'pollinations' | 'gemini' | 'fal-flux'
export type VideoProvider = 'mock' | 'fal-ltx'
export type VoiceProvider = 'mock' | 'gemini' | 'openai' | 'elevenlabs'
export type LLMProvider = 'mock' | 'gemini' | 'anthropic'

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
  openaiKey?: string
  elevenKey?: string
  elevenVoiceId: string
  /** How many shots per episode when the LLM step is mocked. */
  shotsPerEpisode: number
  outDir: string // public dir that Vite serves
}

const gem = env.GEMINI_API_KEY || env.GOOGLE_API_KEY

export const config: AgentConfig = {
  // Auto-select real providers when a key is present, unless explicitly forced.
  // One free Gemini key powers script + image + voice.
  llm:
    (env.NETFRUIT_LLM as LLMProvider) ||
    (env.ANTHROPIC_API_KEY ? 'anthropic' : gem ? 'gemini' : 'mock'),
  // Gemini image gen needs billing (free tier = 0 quota), so default images to
  // Pollinations: free, no key, Flux-grade quality. Gemini stays opt-in.
  image: (env.NETFRUIT_IMAGE as ImageProvider) || 'pollinations',
  video: (env.NETFRUIT_VIDEO as VideoProvider) || 'mock',
  voice: (env.NETFRUIT_VOICE as VoiceProvider) || (gem ? 'gemini' : 'mock'),

  geminiKey: gem,
  geminiImageModel: env.NETFRUIT_GEMINI_IMAGE || 'gemini-2.5-flash-image',
  geminiTextModel: env.NETFRUIT_GEMINI_TEXT || 'gemini-flash-latest',
  geminiTTSModel: env.NETFRUIT_GEMINI_TTS || 'gemini-2.5-flash-preview-tts',
  geminiVoiceName: env.NETFRUIT_GEMINI_VOICE || 'Kore',

  anthropicKey: env.ANTHROPIC_API_KEY,
  anthropicModel: env.NETFRUIT_LLM_MODEL || 'claude-haiku-4-5',
  falKey: env.FAL_KEY,
  falVideoModel: env.NETFRUIT_FAL_VIDEO || 'fal-ai/ltx-video/image-to-video',
  openaiKey: env.OPENAI_API_KEY,
  elevenKey: env.ELEVENLABS_API_KEY,
  elevenVoiceId: env.ELEVENLABS_VOICE_ID || 'Rachel',

  shotsPerEpisode: Number(env.NETFRUIT_SHOTS || 8),
  outDir: env.NETFRUIT_OUT || new URL('../public', import.meta.url).pathname,
}

export function providerSignature(): string {
  return `llm:${config.llm}|img:${config.image}|vid:${config.video}|voice:${config.voice}`
}

export function log(stage: string, msg: string) {
  const pad = stage.padEnd(9)
  console.log(`  \x1b[2m${pad}\x1b[0m ${msg}`)
}
