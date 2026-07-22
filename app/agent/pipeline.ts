import { providerSignature, log } from './config'
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
  console.log(`\n🍓 Producing "${concept.meta.title}" (${concept.meta.fruit}) — ${id}`)

  // 1. Poster / key art
  const posterUrl = await generateImage({
    seriesId: id,
    fruit: concept.meta.fruit,
    prompt: concept.posterPrompt,
    name: 'poster',
    ratio: 'portrait',
  })

  // Map each character to its distinct voice (Narrator falls back sensibly).
  const voiceOf = new Map(concept.episode.characters.map((c) => [c.name, c.voice]))
  const narratorVoice = voiceOf.get('Narrator') ?? 'Charon'

  // 2. Per-shot media (keyframe → clip → voice), sequentially to stay gentle
  //    on free rate limits.
  const shots: ShotAssets[] = []
  for (const shot of concept.episode.shots) {
    const imagePath = await generateImage({
      seriesId: id,
      fruit: concept.meta.fruit,
      prompt: shot.visualPrompt,
      name: `shot-${shot.index}`,
      ratio: 'landscape',
    })
    const clipPath = await generateClip({
      seriesId: id,
      name: `clip-${shot.index}`,
      imageUrl: imagePath,
      prompt: shot.visualPrompt,
      durationSec: shot.durationSec,
    })
    // Voice-over in every language (EN/FR/ES minimum), in the character's voice
    const voice = voiceOf.get(shot.speaker) ?? narratorVoice
    const voiceUrls = {} as Record<Lang, string | null>
    for (const lang of LANGS) {
      voiceUrls[lang] = await generateVoice({
        seriesId: id,
        name: `voice-${shot.index}-${lang}`,
        text: shot.captions[lang],
        lang,
        voice,
      })
    }
    shots.push({
      index: shot.index,
      speaker: shot.speaker,
      imagePath,
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
    posterUrl,
    episodeManifest,
    producedBy: providerSignature(),
  }
  await upsertCatalog(entry)
  log('publish', `✔ ${concept.meta.title} added to catalog.json`)
  return entry
}
