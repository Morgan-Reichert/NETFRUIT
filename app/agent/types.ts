import type { FruitKey, Series } from '../src/data/series'

/** Languages every episode ships with (audio + subtitles), minimum set. */
export type Lang = 'en' | 'fr' | 'es'
export const LANGS: Lang[] = ['en', 'fr', 'es']
export const LANG_LABEL: Record<Lang, string> = { en: 'English', fr: 'Français', es: 'Español' }

/** One beat of the episode: a generated image → animated clip + one spoken line. */
export interface ShotPlan {
  index: number
  /** Who speaks this beat (character name), or "Narrator". */
  speaker: string
  /** Prompt for the image / video model — should describe motion & action. */
  visualPrompt: string
  /** The spoken line per language (empty string = wordless beat). */
  captions: Record<Lang, string>
  durationSec: number
}

export interface Character {
  name: string
  /** Short visual description reused across shots for consistency. */
  look: string
  /** Gemini TTS prebuilt voice name (distinct per character). */
  voice: string
}

export interface EpisodePlan {
  number: number
  title: string
  logline: string
  characters: Character[]
  shots: ShotPlan[]
}

/**
 * The LLM's full creative output for a new series: catalog metadata that
 * conforms to the app's `Series` shape, plus the shot-by-shot plan for
 * episode 1 that the rest of the pipeline turns into media.
 */
export interface Concept {
  meta: Omit<Series, 'featured' | 'trending' | 'newBadge'> & { fruit: FruitKey }
  episode: EpisodePlan
  /** One-line prompt used to render the key art / poster. */
  posterPrompt: string
}

/** Media produced for a single shot. Paths are public-relative (served by Vite). */
export interface ShotAssets {
  index: number
  speaker: string
  imagePath: string
  clipPath: string | null
  /** Voice-over audio URL per language (null = caption-only for that lang). */
  voiceUrls: Record<Lang, string | null>
  captions: Record<Lang, string>
  durationSec: number
}

/** The published record — a `Series` enriched with generated media. */
export interface GeneratedSeries extends Series {
  generated: true
  posterUrl: string
  episodeManifest: string // path to episode.json
  producedBy: string // provider signature, for provenance
}

export interface Brief {
  fruit: FruitKey
  /** Optional creative nudge, e.g. "make it a heist thriller". */
  hint?: string
}
