import { supabase } from './supabase'

export type CreatorStatus = 'pending' | 'approved' | 'rejected'

export interface Creator {
  id: string
  handle: string
  display_name: string
  bio: string | null
  avatar_url: string | null
  is_pro: boolean
  status?: CreatorStatus
  socials?: { tiktok?: string; instagram?: string; youtube?: string; x?: string } | null
  portfolio_url?: string | null
  experience?: string | null
  answers?: Record<string, string> | null
  review_note?: string | null
  applied_at?: string
  birth_date?: string | null
  legal_name?: string | null
  country?: string | null
}

/** Treats a missing status (pre-migration house account) as approved. */
export const isApprovedCreator = (c: Creator | null) => !!c && (!c.status || c.status === 'approved')

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
  age_rating?: string
  content_flags?: string[]
  credits?: { role: string; name: string }[] | null
  ai_tools?: string[]
  season_covers?: Record<string, string> | null
}

export const AGE_RATINGS = [
  { v: 'all', label: 'Tous publics' }, { v: '10', label: '10+' }, { v: '12', label: '12+' },
  { v: '16', label: '16+' }, { v: '18', label: '18+' },
]
export const CONTENT_FLAGS = [
  { v: 'sex', label: 'Sexe' }, { v: 'violence', label: 'Violence' }, { v: 'profanity', label: 'Insultes' },
  { v: 'gore', label: 'Gore' }, { v: 'drugs', label: 'Drogue' }, { v: 'horror', label: 'Horreur' },
  { v: 'discrimination', label: 'Discrimination' },
]

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
  cover_url?: string | null
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

export async function applyAsCreator(userId: string, p: {
  handle: string; display_name: string; bio?: string; avatar_url?: string
  socials?: Creator['socials']; portfolio_url?: string; experience?: string
  answers?: Record<string, string>; birth_date?: string; legal_name?: string; country?: string
}): Promise<{ creator?: Creator; error?: string }> {
  const { data, error } = await sb().from('creators')
    .insert({
      id: userId, handle: p.handle, display_name: p.display_name, bio: p.bio ?? null,
      avatar_url: p.avatar_url ?? null, socials: p.socials ?? {}, portfolio_url: p.portfolio_url ?? null,
      experience: p.experience ?? null, answers: p.answers ?? {},
      birth_date: p.birth_date ?? null, legal_name: p.legal_name ?? null, country: p.country ?? null,
      // status defaults to 'pending' in the DB
    })
    .select().single()
  if (error) return { error: error.code === '23505' ? 'Ce handle est déjà pris.' : error.message }
  return { creator: data as Creator }
}

/** Fire a branded transactional email via the Edge Function (best-effort). */
export async function sendDecisionEmail(payload: {
  kind: 'creator_approved' | 'creator_rejected' | 'series_published' | 'series_rejected'
  creatorId?: string; seriesTitle?: string; note?: string
}) {
  try { await sb().functions.invoke('send-email', { body: payload }) } catch { /* email is best-effort */ }
}

// ---- admin: creator certification review -----------------------------------
export async function listPendingCreators(): Promise<Creator[]> {
  const { data } = await sb().from('creators').select('*').eq('status', 'pending').order('applied_at')
  return (data as Creator[]) ?? []
}

export async function setCreatorStatus(id: string, status: CreatorStatus, note?: string) {
  return sb().from('creators').update({ status, review_note: note ?? null, reviewed_at: new Date().toISOString() }).eq('id', id)
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

export async function promoteSeries(seriesDbId: string, days: number, tokens: number): Promise<string> {
  const { data, error } = await sb().rpc('promote_series', { sid: seriesDbId, days, tokens })
  return error ? 'ERROR' : (data as string)
}

export async function listPayouts(creatorId: string): Promise<Payout[]> {
  const { data } = await sb().from('payouts').select('*').eq('creator_id', creatorId).order('period', { ascending: false })
  return (data as Payout[]) ?? []
}

export async function updateSeries(id: string, patch: Partial<DbSeries>) {
  return sb().from('series').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id)
}

export async function updateEpisode(id: string, patch: Partial<DbEpisode>) {
  return sb().from('episodes').update(patch).eq('id', id)
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
/** Upload a file/blob under <creatorId>/<slug>/<name> and return its public URL. */
export async function uploadToBucket(creatorId: string, slug: string, name: string, file: Blob): Promise<string> {
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
