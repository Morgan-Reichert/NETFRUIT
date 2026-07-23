import {
  FRUIT_FAMILY,
  ROWS,
  SERIES,
  allSeries,
  byId,
  type Series,
} from '../data/series'
import type { UserState } from './store'

/* ------------------------------------------------------------------ *
 * NETFRUIT recommendation engine
 * Pure, deterministic functions that turn the catalog + a user's
 * interaction history into a personalized, ranked feed.
 * ------------------------------------------------------------------ */

/** Deterministic 0..1 pseudo-random keyed to a string (stable across renders). */
export function hashUnit(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  // xorshift finish
  h ^= h >>> 13
  h = Math.imul(h, 0x5bd1e995)
  h ^= h >>> 15
  return ((h >>> 0) % 100000) / 100000
}

const NEWEST_YEAR = Math.max(...SERIES.map((s) => s.year))

export interface Affinity {
  fruit: Record<string, number>
  family: Record<string, number>
  genre: Record<string, number>
  tag: Record<string, number>
  seeds: string[] // ids that drove the profile, most influential first
}

/**
 * Builds a taste profile from likes (strong +), watches (scaled by progress),
 * and dislikes (negative). Returns weighted maps over each attribute.
 */
export function buildAffinity(state: UserState): Affinity {
  const fruit: Record<string, number> = {}
  const family: Record<string, number> = {}
  const genre: Record<string, number> = {}
  const tag: Record<string, number> = {}
  const seedWeight: Record<string, number> = {}

  const bump = (s: Series, w: number) => {
    fruit[s.fruit] = (fruit[s.fruit] ?? 0) + w
    const fam = FRUIT_FAMILY[s.fruit]
    family[fam] = (family[fam] ?? 0) + w
    for (const g of s.genres) genre[g] = (genre[g] ?? 0) + w * 0.8
    for (const t of s.tags) tag[t] = (tag[t] ?? 0) + w * 0.6
    seedWeight[s.id] = (seedWeight[s.id] ?? 0) + w
  }

  for (const id of Object.keys(state.liked)) {
    const s = byId(id)
    if (s) bump(s, 3)
  }
  for (const [id, rec] of Object.entries(state.watched)) {
    const s = byId(id)
    if (s) bump(s, 1 + rec.progress * 1.5)
  }
  for (const id of Object.keys(state.disliked)) {
    const s = byId(id)
    if (s) bump(s, -2.5)
  }

  const seeds = Object.entries(seedWeight)
    .filter(([, w]) => w > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id)

  return { fruit, family, genre, tag, seeds }
}

/** Personalized affinity score of a title given a taste profile. */
export function scoreForYou(s: Series, aff: Affinity): number {
  let score = s.match / 100 // gentle popularity prior
  score += (aff.fruit[s.fruit] ?? 0) * 1.0
  score += (aff.family[FRUIT_FAMILY[s.fruit]] ?? 0) * 0.5
  for (const g of s.genres) score += (aff.genre[g] ?? 0) * 0.7
  for (const t of s.tags) score += (aff.tag[t] ?? 0) * 0.5
  // stable tie-break jitter so equal scores don't reorder randomly
  score += hashUnit(s.id) * 0.05
  return score
}

/** Trending = editorial flag + popularity + recency + a stable shuffle. */
export function trendingScore(s: Series): number {
  const recency = 1 - (NEWEST_YEAR - s.year) * 0.15
  return (
    (s.trending ? 1.2 : 0) +
    s.match / 100 +
    recency * 0.6 +
    (s.newBadge ? 0.3 : 0) +
    hashUnit('trend' + s.id) * 0.25
  )
}

/** Content similarity between two titles (shared fruit/family/genre/tag). */
export function similarity(a: Series, b: Series): number {
  if (a.id === b.id) return -Infinity
  let sim = 0
  if (a.fruit === b.fruit) sim += 2
  if (FRUIT_FAMILY[a.fruit] === FRUIT_FAMILY[b.fruit]) sim += 1
  sim += a.genres.filter((g) => b.genres.includes(g)).length * 1.3
  sim += a.tags.filter((t) => b.tags.includes(t)).length * 0.8
  sim += hashUnit(a.id + b.id) * 0.1
  return sim
}

export function similarTo(seed: Series, limit = 12): Series[] {
  return [...allSeries()]
    .filter((s) => s.id !== seed.id)
    .map((s) => ({ s, sim: similarity(seed, s) }))
    .sort((a, b) => b.sim - a.sim)
    .slice(0, limit)
    .map((x) => x.s)
}

export interface FeedRow {
  key: string
  title: string
  ids: string[]
  kind?: 'continue' | 'toppicks'
}

/**
 * Assembles the full personalized home feed. Dynamic rows (Continue Watching,
 * Top Picks, Trending, "Because you liked…", My List) are computed from state
 * and float to the top; curated editorial rows follow.
 */
export function buildFeed(state: UserState): FeedRow[] {
  const aff = buildAffinity(state)
  const pool = allSeries()
  const inPool = new Set(pool.map((s) => s.id))
  const rows: FeedRow[] = []

  // Continue Watching — in-progress titles that still exist, most recent first
  const continueIds = Object.entries(state.watched)
    .filter(([id, r]) => inPool.has(id) && r.progress > 0.02 && r.progress < 0.98)
    .sort((a, b) => b[1].updatedAt - a[1].updatedAt)
    .map(([id]) => id)
  if (continueIds.length) {
    rows.push({ key: 'continue', title: 'Continue Watching', ids: continueIds, kind: 'continue' })
  }

  const ranked = [...pool]
    .filter((s) => !state.disliked[s.id])
    .sort((a, b) => scoreForYou(b, aff) - scoreForYou(a, aff))
  const listIds = Object.keys(state.myList).filter((id) => inPool.has(id))

  // Real (AI-generated) catalog present → focused, non-redundant feed over it.
  if (pool.some((s) => s.generated)) {
    const promoted = pool.filter((s) => s.promoted && !state.disliked[s.id])
    if (promoted.length) rows.push({ key: 'promoted', title: 'Sponsorisé', ids: promoted.map((s) => s.id) })
    rows.push({ key: 'originals', title: 'NETFRUIT Originals', ids: ranked.map((s) => s.id), kind: 'toppicks' })
    const fresh = pool.filter((s) => s.newBadge)
    if (fresh.length) rows.push({ key: 'fresh', title: 'New This Week', ids: fresh.map((s) => s.id) })
    const seed = byId(aff.seeds[0])
    if (seed) {
      const sims = similarTo(seed, 12).filter((s) => !state.disliked[s.id])
      if (sims.length >= 3) rows.push({ key: 'because-' + seed.id, title: `Because you liked ${seed.title}`, ids: sims.map((s) => s.id) })
    }
    if (listIds.length) rows.push({ key: 'mylist', title: 'My Basket', ids: listIds })
    return rows
  }

  // First-run placeholder feed (no generated content yet).
  const hasHistory = aff.seeds.length > 0
  rows.push({ key: 'toppicks', title: hasHistory ? 'Top Picks For You' : 'Popular on NETFRUIT', ids: ranked.slice(0, 12).map((s) => s.id), kind: 'toppicks' })
  const trending = [...pool].sort((a, b) => trendingScore(b) - trendingScore(a))
  rows.push({ key: 'trending', title: 'Trending Fruits', ids: trending.slice(0, 10).map((s) => s.id) })
  if (listIds.length) rows.push({ key: 'mylist', title: 'My Basket', ids: listIds })
  for (const r of ROWS) {
    if (r.title.toLowerCase().includes('trending')) continue
    rows.push({ key: 'curated-' + r.title, title: r.title, ids: r.ids })
  }
  return rows
}

export const getProgress = (state: UserState, id: string) =>
  state.watched[id]?.progress ?? 0

/** Maps a category chip to a predicate over a series. */
export function matchesCategory(s: Series, category: string): boolean {
  switch (category) {
    case 'All':
      return true
    case 'AI Originals':
      return s.genres.includes('AI Original')
    case 'Feel-good':
      return s.tags.includes('Feel-good')
    default:
      return s.genres.includes(category)
  }
}
