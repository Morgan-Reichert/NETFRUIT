import { config, providerSignature, log } from './config'
import { upsertCatalog } from './catalog'
import { generateConcept } from './providers/llm'
import { generateImage } from './providers/image'
import { generateClip } from './providers/video'
import { generateVoice } from './providers/voice'
import { assembleEpisode } from './providers/assemble'
import { LANGS, type Brief, type GeneratedSeries, type Lang, type ShotAssets } from './types'

/**
 * The end-to-end production pipeline for ONE mini-series episode:
 *   concept (Claude) → poster + keyframes → clips → voice → assemble → publish.
 * Every stage degrades to a free/offline mock, so this always completes.
 */
export async function produceSeries(brief: Brief): Promise<GeneratedSeries> {
  const concept = await generateConcept(brief)
  const id = concept.meta.id
  const fruit = concept.meta.fruit
  console.log(`\n🍓 Producing "${concept.meta.title}" (${fruit}) — ${id}`)

  // Force the fruit-mascot look on EVERY image — the LLM's story prompts can
  // drift toward humans (esp. "telenovela"), so we hard-prepend the style.
  const mascot = (p: string) =>
    `3D Pixar-style animated movie still of an anthropomorphic ${fruit} character — ` +
    `a giant cute ${fruit} with a clear cartoon face (big expressive eyes, eyebrows, mouth) ` +
    `and little arms and legs, absolutely NOT a human person. Scene: ${p}`

  // 1. Poster / key art
  const poster = await generateImage({
    seriesId: id,
    fruit,
    prompt: mascot(concept.posterPrompt),
    name: 'poster',
    ratio: 'portrait',
  })

  // Map each character to its distinct voice (Narrator falls back sensibly).
  const voiceOf = new Map(concept.episode.characters.map((c) => [c.name, c.voice]))
  const narratorVoice = voiceOf.get('Narrator') ?? 'Roger'
  const lipsyncLang = config.lipsyncLangs[0] ?? 'en'

  // 2. Per-shot media. Order matters for lip-sync: image → voices → video,
  //    so the video model can be driven by the character's voice track.
  const shots: ShotAssets[] = []
  for (const shot of concept.episode.shots) {
    const image = await generateImage({
      seriesId: id,
      fruit,
      prompt: mascot(shot.visualPrompt),
      name: `shot-${shot.index}`,
      ratio: 'vertical', // 9:16 TikTok-style
    })

    // Voice-over in every language, in this character's distinct voice
    const voice = voiceOf.get(shot.speaker) ?? narratorVoice
    const voiceUrls = {} as Record<Lang, string | null>
    let lipsyncAudioRemote: string | undefined
    for (const lang of LANGS) {
      const v = await generateVoice({
        seriesId: id,
        name: `voice-${shot.index}-${lang}`,
        text: shot.captions[lang],
        lang,
        voice,
      })
      voiceUrls[lang] = v.url
      if (lang === lipsyncLang) lipsyncAudioRemote = v.remote
    }

    // Talking, moving clip — driven by the primary-language voice for lip-sync
    const clipPath = await generateClip({
      seriesId: id,
      name: `clip-${shot.index}`,
      imageUrl: image.url,
      imageRemote: image.remote,
      audioRemote: lipsyncAudioRemote,
      prompt: shot.visualPrompt,
      durationSec: shot.durationSec,
    })

    shots.push({
      index: shot.index,
      speaker: shot.speaker,
      imagePath: image.url,
      clipPath,
      voiceUrls,
      captions: shot.captions,
      durationSec: shot.durationSec,
    })
  }

  // 3. Assemble timeline / stitched video
  const episodeManifest = await assembleEpisode(concept, shots)

  // 4. Publish into the catalog the app reads
  const entry: GeneratedSeries = {
    ...concept.meta,
    generated: true,
    newBadge: true,
    posterUrl: poster.url,
    episodeManifest,
    producedBy: providerSignature(),
  }
  await upsertCatalog(entry)
  log('publish', `✔ ${concept.meta.title} added to catalog.json`)
  return entry
}
