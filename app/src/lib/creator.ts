import { supabase } from './supabase'

export interface Creator {
  id: string
  handle: string
  display_name: string
  bio: string | null
  avatar_url: string | null
  is_pro: boolean
}

export type Monetization = 'free' | 'purchase' | 'subscription'
export type SeriesStatus = 'draft' | 'pending' | 'published' | 'rejected'

/** Revenue model (creator share of each stream) + token economics. Central so
 *  the earnings UI and the future payout cron agree on the numbers. */
export const REVENUE = {
  adShare: 0.55,          // creator gets 55% of net ad revenue
  tokenShare: 0.70,       // creator gets 70% of a spent token's gross value
  subscriptionShare: 0.60,// 60% of sub price HT, split pro-rata by watch time
  tokenValueEur: 0.10,    // gross monetary value of 1 token
}

export interface Payout {
  id: string
  creator_id: string
  period: string
  ad_cents: number
  token_cents: number
  subscription_cents: number
  total_cents: number
  status: 'pending' | 'paid'
  created_at: string
}

export interface DbSeries {
  id: string
  creator_id: string
  slug: string
  title: string
  synopsis: string | null
  fruit: string | null
  genres: string[]
  tags: string[]
  poster_url: string | null
  maturity: string
  is_original: boolean
  monetization: Monetization
  price_cents: number | null
  episode_token_cost: number
  in_premium: boolean
  status: SeriesStatus
  created_at: string
}

export interface DbEpisode {
  id: string
  series_id: string
  season: number
  ep: number
  number: number
  title: string
  video_url: string
  duration_sec: number
  subtitles: unknown
  baked_audio: boolean
  token_cost: number
}

const sb = () => {
  if (!supabase) throw new Error('Supabase not configured')
  return supabase
}

export const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 48)

// ---- creator profile --------------------------------------------------------
export async function getMyCreator(userId: string): Promise<Creator | null> {
  const { data } = await sb().from('creators').select('*').eq('id', userId).maybeSingle()
  return (data as Creator) ?? null
}

export async function createCreator(userId: string, p: {
  handle: string; display_name: string; bio?: string; avatar_url?: string
}): Promise<{ creator?: Creator; error?: string }> {
  const { data, error } = await sb().from('creators')
    .insert({ id: userId, handle: p.handle, display_name: p.display_name, bio: p.bio ?? null, avatar_url: p.avatar_url ?? null })
    .select().single()
  if (error) return { error: error.code === '23505' ? 'Ce handle est déjà pris.' : error.message }
  return { creator: data as Creator }
}

// ---- series -----------------------------------------------------------------
export async function listMySeries(creatorId: string): Promise<DbSeries[]> {
  const { data } = await sb().from('series').select('*').eq('creator_id', creatorId).order('created_at', { ascending: false })
  return (data as DbSeries[]) ?? []
}

export async function createSeries(creatorId: string, p: {
  slug: string; title: string; synopsis: string; fruit: string; genres: string[];
  tags: string[]; poster_url: string | null; maturity: string;
  monetization: Monetization; price_cents: number | null;
  episode_token_cost: number; in_premium: boolean
}): Promise<{ series?: DbSeries; error?: string }> {
  const { data, error } = await sb().from('series')
    .insert({ creator_id: creatorId, status: 'draft', ...p }).select().single()
  if (error) return { error: error.code === '23505' ? 'Ce slug de série existe déjà.' : error.message }
  return { series: data as DbSeries }
}

export async function listPayouts(creatorId: string): Promise<Payout[]> {
  const { data } = await sb().from('payouts').select('*').eq('creator_id', creatorId).order('period', { ascending: false })
  return (data as Payout[]) ?? []
}

export async function updateSeries(id: string, patch: Partial<DbSeries>) {
  return sb().from('series').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id)
}

export async function submitSeries(id: string) {
  return sb().from('series').update({ status: 'pending' }).eq('id', id)
}

// ---- episodes ---------------------------------------------------------------
export async function listEpisodes(seriesId: string): Promise<DbEpisode[]> {
  const { data } = await sb().from('episodes').select('*').eq('series_id', seriesId).order('number')
  return (data as DbEpisode[]) ?? []
}

export async function addEpisode(p: Omit<DbEpisode, 'id'>) {
  return sb().from('episodes').insert(p)
}

export async function deleteEpisode(id: string) {
  return sb().from('episodes').delete().eq('id', id)
}

// ---- storage upload ---------------------------------------------------------
/** Upload a file under <creatorId>/<slug>/<name> and return its public URL. */
export async function uploadToBucket(creatorId: string, slug: string, name: string, file: File): Promise<string> {
  const path = `${creatorId}/${slug}/${name}`
  const { error } = await sb().storage.from('episodes').upload(path, file, {
    upsert: true, contentType: file.type || 'application/octet-stream',
  })
  if (error) throw new Error(error.message)
  return sb().storage.from('episodes').getPublicUrl(path).data.publicUrl
}

/** Read a video file's duration (seconds) client-side. */
export function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const v = document.createElement('video')
    v.preload = 'metadata'
    v.onloadedmetadata = () => { URL.revokeObjectURL(v.src); resolve(Math.round(v.duration) || 0) }
    v.onerror = () => resolve(0)
    v.src = URL.createObjectURL(file)
  })
}

// ---- admin moderation -------------------------------------------------------
export async function listPending(): Promise<DbSeries[]> {
  const { data } = await sb().from('series').select('*').eq('status', 'pending').order('created_at')
  return (data as DbSeries[]) ?? []
}

export async function setSeriesStatus(id: string, status: SeriesStatus) {
  return sb().from('series').update({ status }).eq('id', id)
}

export async function amIAdmin(userId: string): Promise<boolean> {
  const { data } = await sb().from('admins').select('user_id').eq('user_id', userId).maybeSingle()
  return !!data
}

// ---- platform analytics -----------------------------------------------------
export async function topEpisodes(limit = 8) {
  const { data } = await sb()
    .from('episode_stats')
    .select('views,completes,episode:episodes(title,series:series(title,slug))')
    .order('views', { ascending: false })
    .limit(limit)
  return data ?? []
}
