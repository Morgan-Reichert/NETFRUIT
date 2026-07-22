import { execSync } from 'node:child_process'
import { config, providerSignature, log } from './config'
import { readCatalog, upsertCatalog } from './catalog'
import { generateConcept, generateEpisode } from './providers/llm'
import { generateImage } from './providers/image'
import { generateClip } from './providers/video'
import { generateVoice } from './providers/voice'
import { assembleEpisode } from './providers/assemble'
import { notifyDrop } from './providers/notify'
import {
  LANGS, type Brief, type Character, type EpisodeRef, type GeneratedSeries,
  type Lang, type ShotAssets, type ShotPlan,
} from './types'

/** Force the cinematic photoreal fruit-headed-humanoid style on every image. */
const cinematic = (p: string) =>
  `Cinematic photorealistic 3D animated feature-film still, Pixar/DreamWorks render quality, ` +
  `dramatic movie lighting, richly detailed set, shallow depth of field, volumetric light. ` +
  `Characters are fruit-headed humanoids (a fruit for a head on a human body, wearing clothes, ` +
  `expressive face) — never plain humans. ${p}`

/**
 * Produces all media for ONE episode into generated/<dirSub>/ and returns the
 * manifest URL + total duration. `dirSub` is the folder under public/generated
 * (e.g. "berry-betrayal" or "fruit-mafia/e2").
 */
async function produceEpisodeMedia(
  dirSub: string,
  fruit: GeneratedSeries['fruit'],
  epTitle: string,
  epLogline: string,
  shots: ShotPlan[],
  characters: Character[],
): Promise<{ manifest: string; durationSec: number }> {
  const voiceOf = new Map(characters.map((c) => [c.name, c.voice]))
  const narratorVoice = voiceOf.get('Narrator') ?? 'Roger'
  const lipsyncLang = config.lipsyncLangs[0] ?? 'en'

  const assets: ShotAssets[] = []
  for (const shot of shots) {
    const image = await generateImage({
      seriesId: dirSub, fruit, prompt: cinematic(shot.visualPrompt),
      name: `shot-${shot.index}`, ratio: 'vertical',
    })
    const voice = voiceOf.get(shot.speaker) ?? narratorVoice
    const voiceUrls = {} as Record<Lang, string | null>
    let lipsyncAudioRemote: string | undefined
    for (const lang of LANGS) {
      const v = await generateVoice({
        seriesId: dirSub, name: `voice-${shot.index}-${lang}`,
        text: shot.captions[lang], lang, voice,
      })
      voiceUrls[lang] = v.url
      if (lang === lipsyncLang) lipsyncAudioRemote = v.remote
    }
    const clipPath = await generateClip({
      seriesId: dirSub, name: `clip-${shot.index}`,
      imageUrl: image.url, imageRemote: image.remote, audioRemote: lipsyncAudioRemote,
      prompt: shot.visualPrompt, durationSec: shot.durationSec,
    })
    assets.push({
      index: shot.index, speaker: shot.speaker, imagePath: image.url, clipPath,
      voiceUrls, captions: shot.captions, durationSec: shot.durationSec,
    })
  }
  const manifest = await assembleEpisode(dirSub, epTitle, epLogline, assets)
  return { manifest, durationSec: assets.reduce((a, s) => a + s.durationSec, 0) }
}

/** Single stand-alone episode (back-compat). */
export async function produceSeries(brief: Brief): Promise<GeneratedSeries> {
  const concept = await generateConcept(brief)
  const id = concept.meta.id
  console.log(`\n🍓 Producing "${concept.meta.title}" (${concept.meta.fruit}) — ${id}`)

  const poster = await generateImage({
    seriesId: id, fruit: concept.meta.fruit,
    prompt: cinematic(concept.posterPrompt), name: 'poster', ratio: 'portrait',
  })
  const { manifest } = await produceEpisodeMedia(
    id, concept.meta.fruit, concept.episode.title, concept.episode.logline,
    concept.episode.shots, concept.episode.characters,
  )
  const entry: GeneratedSeries = {
    ...concept.meta, generated: true, newBadge: true,
    posterUrl: poster.url, episodeManifest: manifest, producedBy: providerSignature(),
  }
  await upsertCatalog(entry)
  log('publish', `✔ ${concept.meta.title} added to catalog.json`)
  return entry
}

/** Commit + push ONLY this series' media + catalog so it deploys (per episode). */
function commitAndPush(message: string, seriesId: string) {
  const token = process.env.GH_TOKEN
  const repo = process.env.GH_REPO || 'Morgan-Reichert/NETFRUIT'
  const root = new URL('../..', import.meta.url).pathname
  try {
    execSync(`git add app/public/generated/${seriesId} app/public/catalog.json`, { cwd: root, stdio: 'ignore' })
    execSync(`git commit -q -m ${JSON.stringify(message)}`, { cwd: root, stdio: 'ignore' })
    if (token) execSync(`git push -q "https://${token}@github.com/${repo}.git" main`, { cwd: root, stdio: 'ignore' })
    log('deploy', `✔ pushed: ${message}`)
  } catch (e) {
    log('deploy', `git skipped (${(e as Error).message.slice(0, 80)})`)
  }
}

/**
 * Produces a SEASON: one series, a shared cast + continuing story across N
 * ~1-minute episodes. Commits + pushes + notifies after EACH episode so it goes
 * online one by one.
 */
export async function produceSeason(brief: Brief, episodeCount: number, startEp = 1): Promise<GeneratedSeries> {
  const concept = await generateConcept(brief)
  const fruit = concept.meta.fruit

  // Resume support: when starting past episode 1, reuse the existing series
  // (same id, poster, episodes so far) instead of creating a new one.
  let id = concept.meta.id
  let episodes: EpisodeRef[] = []
  let entry: GeneratedSeries
  let title = concept.meta.title

  if (startEp > 1) {
    const existing = (await readCatalog()).find((s) => s.fruit === fruit && s.episodes?.length)
    if (!existing) throw new Error(`resume: no existing ${fruit} season found`)
    id = existing.id
    title = existing.title
    episodes = [...(existing.episodes ?? [])]
    entry = { ...existing, episodes }
    console.log(`\n🎬 RESUMING SEASON "${title}" from episode ${startEp} (${id}) — ${episodes.length} already done`)
  } else {
    const poster = await generateImage({
      seriesId: id, fruit, prompt: cinematic(concept.posterPrompt), name: 'poster', ratio: 'portrait',
    })
    entry = {
      ...concept.meta, generated: true, newBadge: true,
      posterUrl: poster.url, episodeManifest: '', episodes, producedBy: providerSignature(),
    }
    console.log(`\n🎬 Producing SEASON "${title}" — ${episodeCount} episodes (${id})`)
  }

  let priorSummary = entry.synopsis ?? concept.meta.synopsis
  for (let n = startEp; n <= episodeCount; n++) {
    // Episode 1 uses the concept; later episodes continue the saga.
    let epTitle: string, epLogline: string, shots: ShotPlan[]
    if (n === 1) {
      epTitle = `${title} — Episode 1`
      epLogline = concept.episode.logline
      shots = concept.episode.shots
    } else {
      log('script', `writing episode ${n}…`)
      const ep = await generateEpisode(
        { title, genres: concept.meta.genres, characters: concept.episode.characters },
        n, priorSummary,
      )
      epTitle = ep.title
      epLogline = ep.summary
      shots = ep.shots as ShotPlan[]
      priorSummary = `${priorSummary} Then: ${ep.summary}`
    }

    console.log(`\n  ▶ Episode ${n}: ${epTitle}`)
    const { manifest, durationSec } = await produceEpisodeMedia(
      `${id}/e${n}`, fruit, epTitle, epLogline, shots, concept.episode.characters,
    )
    episodes.push({ number: n, title: epTitle, manifest, durationSec })
    if (n === 1) entry.episodeManifest = manifest

    entry = { ...entry, episodes: [...episodes], seasons: 1 }
    await upsertCatalog(entry)
    log('publish', `✔ episode ${n}/${episodeCount} published`)

    // Ship it online + notify subscribers.
    commitAndPush(`Season "${title}" — episode ${n}/${episodeCount}: ${epTitle}`, id)
    await notifyDrop({
      title: n === 1 ? `New series: ${title} 🍓` : `${title} — Ep. ${n} is live 🍿`,
      body: epLogline || concept.meta.synopsis,
      url: '/',
    })
  }

  console.log(`\n✅ Season complete: ${episodes.length} episodes.`)
  return entry
}
