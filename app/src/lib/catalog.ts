import { useEffect, useState } from 'react'
import { registerDynamic, type Series } from '../data/series'
import { supabase } from './supabase'

/** Editorially featured in the hero (admin-curated; DB column comes in Phase 1). */
const FEATURED = new Set(['overripe'])

/** Map a DB series row (+ nested episodes/creator) to the runtime Series shape. */
function fromDbRow(r: Record<string, any>): Series {
  const eps = [...((r.episodes as any[]) ?? [])].sort((a, b) => a.number - b.number)
  const seasons = eps.reduce((m, e) => Math.max(m, e.season ?? 1), 1)
  const episodes = eps.map((e) => ({
    number: e.number,
    title: e.title,
    id: e.id,
    durationSec: e.duration_sec ?? 0,
    season: e.season ?? 1,
    ep: e.ep ?? e.number,
    // Inline manifest so the player needs no per-episode JSON file.
    manifestData: {
      title: `${r.title} — Ep. ${e.number}: ${e.title}`,
      bakedAudio: e.baked_audio ?? true,
      langs: [],
      videoUrl: e.video_url,
      shots: [{
        speaker: '', imageUrl: r.poster_url, clipUrl: e.video_url,
        voiceUrls: {}, captions: {}, durationSec: e.duration_sec ?? 0,
      }],
      subtitles: e.subtitles ?? undefined,
    },
  }))
  const runtime = episodes.length
    ? seasons > 1 ? `${seasons} seasons · ${episodes.length} episodes` : `${episodes.length} episodes`
    : 'Coming soon'
  return {
    id: r.slug,
    title: r.title,
    fruit: r.fruit ?? 'strawberry',
    year: 2026,
    maturity: r.maturity ?? 'PG',
    seasons,
    match: 97,
    genres: r.genres ?? [],
    tags: r.tags ?? [],
    synopsis: r.synopsis ?? '',
    runtime,
    generated: true,
    featured: FEATURED.has(r.slug),
    newBadge: !!r.is_original,
    comingSoon: episodes.length === 0,
    dbId: r.id,
    monetization: (r.monetization ?? 'free') as Series['monetization'],
    episodeTokenCost: r.episode_token_cost ?? 0,
    inPremium: !!r.in_premium,
    posterUrl: r.poster_url ?? undefined,
    episodes: episodes.length ? episodes : undefined,
    episodeManifest: undefined,
    producedBy: r.creator?.display_name ?? 'NETFRUIT',
    creatorHandle: r.creator?.handle,
    creatorName: r.creator?.display_name,
  } as Series
}

/** Supabase-first load of published series; resolves [] on any error. */
async function loadFromSupabase(): Promise<Series[]> {
  if (!supabase) return []
  try {
    const { data, error } = await supabase
      .from('series')
      .select('*, creator:creators(handle,display_name,avatar_url), episodes(*)')
      .eq('status', 'published')
    if (error || !Array.isArray(data)) return []
    return data.map(fromDbRow)
  } catch {
    return []
  }
}

/** Fallback: the static /catalog.json shipped with the build. */
async function loadFromJson(): Promise<Series[]> {
  try {
    const r = await fetch('/catalog.json', { cache: 'no-store' })
    const list = r.ok ? await r.json() : []
    return Array.isArray(list) ? (list as Series[]) : []
  } catch {
    return []
  }
}

/**
 * Loads the AI-generated catalog into the runtime registry. Prefers Supabase
 * (the marketplace source of truth); falls back to /catalog.json so the app
 * still works if the DB is empty or unreachable. Bumps a version once loaded.
 */
export function useCatalog(): number {
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      let list = await loadFromSupabase()
      if (list.length === 0) list = await loadFromJson()
      if (cancelled || list.length === 0) return
      registerDynamic(list)
      setVersion((v) => v + 1)
    })()
    return () => { cancelled = true }
  }, [])

  return version
}
