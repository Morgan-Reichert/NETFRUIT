import { log } from '../config'
import { LANGS, type Concept, type Lang, type ShotAssets } from '../types'
import { publicPath, publicUrl, writeText } from '../util'

export interface EpisodeManifest {
  seriesId: string
  title: string
  logline: string
  durationSec: number
  /** Languages available for audio + subtitles. */
  langs: Lang[]
  /** Ordered timeline the app plays as a Ken-Burns slideshow (or real video). */
  shots: {
    speaker: string
    imageUrl: string
    clipUrl: string | null
    voiceUrls: Record<Lang, string | null>
    captions: Record<Lang, string>
    durationSec: number
  }[]
  videoUrl: string | null // set when a real stitched mp4 exists
}

/**
 * Assembles shot media into a playable episode manifest and writes episode.json.
 * When every shot has a real mp4 clip and ffmpeg is available, it also stitches
 * a single episode.mp4; otherwise the app plays the manifest timeline directly.
 */
export async function assembleEpisode(
  concept: Concept,
  shots: ShotAssets[],
): Promise<string> {
  const seriesId = concept.meta.id
  const dir = ['generated', seriesId]

  const manifest: EpisodeManifest = {
    seriesId,
    title: concept.episode.title,
    logline: concept.episode.logline,
    durationSec: shots.reduce((a, s) => a + s.durationSec, 0),
    langs: LANGS,
    shots: shots.map((s) => ({
      speaker: s.speaker,
      imageUrl: s.imagePath,
      clipUrl: s.clipPath,
      voiceUrls: s.voiceUrls,
      captions: s.captions,
      durationSec: s.durationSec,
    })),
    videoUrl: null,
  }

  const allReal = shots.length > 0 && shots.every((s) => s.clipPath)
  if (allReal) {
    try {
      manifest.videoUrl = await stitch(seriesId, shots)
    } catch (e) {
      log('assemble', `ffmpeg stitch skipped (${(e as Error).message})`)
    }
  }

  const abs = publicPath(...dir, 'episode.json')
  await writeText(abs, JSON.stringify(manifest, null, 2))
  log('assemble', `episode.json (${manifest.shots.length} shots, ${manifest.durationSec}s)`)
  return publicUrl(...dir, 'episode.json')
}

async function stitch(seriesId: string, shots: ShotAssets[]): Promise<string> {
  const { spawn } = await import('node:child_process')
  const { writeFile } = await import('node:fs/promises')
  const dir = ['generated', seriesId]
  const listAbs = publicPath(...dir, 'concat.txt')
  await writeFile(
    listAbs,
    shots.map((s) => `file '${publicPath(...dir, s.clipPath!.split('/').pop()!)}'`).join('\n'),
  )
  const outAbs = publicPath(...dir, 'episode.mp4')
  await new Promise<void>((resolve, reject) => {
    const p = spawn('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', listAbs, '-c', 'copy', outAbs])
    p.on('error', reject)
    p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error('ffmpeg exit ' + code))))
  })
  return publicUrl(...dir, 'episode.mp4')
}
