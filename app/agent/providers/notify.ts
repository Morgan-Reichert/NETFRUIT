import { log } from '../config'

const env = process.env
const VAPID_PUB = env.VAPID_PUBLIC_KEY
const VAPID_PRIV = env.VAPID_PRIVATE_KEY
const SB_URL = env.VITE_SUPABASE_URL || env.SUPABASE_URL
const SB_SERVICE = env.SUPABASE_SERVICE_ROLE_KEY

export interface DropPayload {
  title: string
  body: string
  url?: string
  image?: string
}

/**
 * Sends a Web Push to every stored subscription. Reads subscriptions from
 * Supabase with the service-role key and signs with the VAPID private key —
 * all local/server-side. No-ops (with a log) when not configured.
 */
export async function notifyDrop(payload: DropPayload): Promise<void> {
  if (!VAPID_PUB || !VAPID_PRIV || !SB_URL || !SB_SERVICE) {
    log('notify', 'skipped (VAPID / Supabase service key not set)')
    return
  }
  try {
    const res = await fetch(`${SB_URL}/rest/v1/push_subscriptions?select=sub`, {
      headers: { apikey: SB_SERVICE, Authorization: `Bearer ${SB_SERVICE}` },
    })
    if (!res.ok) throw new Error(`supabase ${res.status}`)
    const rows: { sub: unknown }[] = await res.json()
    if (!rows.length) { log('notify', 'no subscribers'); return }

    const { default: webpush } = await import('web-push')
    webpush.setVapidDetails('mailto:hello@netfruit.fun', VAPID_PUB, VAPID_PRIV)

    let sent = 0
    await Promise.all(
      rows.map(async (r) => {
        try {
          await webpush.sendNotification(r.sub as any, JSON.stringify(payload))
          sent++
        } catch { /* stale subscription — ignore */ }
      }),
    )
    log('notify', `push sent to ${sent}/${rows.length} subscribers`)
  } catch (e) {
    log('notify', `failed (${(e as Error).message})`)
  }
}
