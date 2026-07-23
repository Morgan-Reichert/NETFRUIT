#!/usr/bin/env node
/**
 * Send a Web Push to every stored subscriber — standalone (works with the
 * MANUAL publish flow, unlike the old agent pipeline).
 *
 * Usage:
 *   node scripts/notify.mjs "Title" "Body text" "/optional/url" "https://optional/image.jpg"
 * Example:
 *   node scripts/notify.mjs "OVERRIPE — Saison 2 🍌" "5 nouveaux épisodes sont en ligne !" "/"
 *
 * Reads VAPID + Supabase service key from app/.env. Prunes dead subscriptions.
 */
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const require = createRequire(join(ROOT, 'app/'))
const webpush = require('web-push')

// --- load app/.env ---
const env = {}
for (const line of readFileSync(join(ROOT, 'app/.env'), 'utf8').split('\n')) {
  const t = line.trim()
  if (!t || t.startsWith('#') || !t.includes('=')) continue
  const i = t.indexOf('=')
  env[t.slice(0, i).trim()] = t.slice(i + 1).trim()
}
const SB_URL = env.VITE_SUPABASE_URL || env.SUPABASE_URL
const SR = env.SUPABASE_SERVICE_ROLE_KEY
const VAPID_PUB = env.VAPID_PUBLIC_KEY || env.VITE_VAPID_PUBLIC_KEY
const VAPID_PRIV = env.VAPID_PRIVATE_KEY
if (!SB_URL || !SR || !VAPID_PUB || !VAPID_PRIV) {
  console.error('Missing VAPID / Supabase service key in app/.env'); process.exit(1)
}

const [title = 'NETFRUIT 🍓', body = 'Something fresh just dropped', url = '/', image] = process.argv.slice(2)
const payload = JSON.stringify({ title, body, url, ...(image ? { image } : {}) })

webpush.setVapidDetails('mailto:hello@netfruit.fun', VAPID_PUB, VAPID_PRIV)

const sbHeaders = { apikey: SR, Authorization: `Bearer ${SR}` }

const res = await fetch(`${SB_URL}/rest/v1/push_subscriptions?select=endpoint,sub`, { headers: sbHeaders })
if (!res.ok) { console.error('supabase read failed', res.status); process.exit(1) }
const rows = await res.json()
if (!rows.length) { console.log('No subscribers yet (0 rows). Enable notifications in the app first.'); process.exit(0) }

let sent = 0, pruned = 0
await Promise.all(rows.map(async (r) => {
  try {
    await webpush.sendNotification(r.sub, payload)
    sent++
  } catch (e) {
    const code = e?.statusCode
    if (code === 404 || code === 410) {
      // subscription is dead — remove it
      await fetch(`${SB_URL}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(r.endpoint)}`,
        { method: 'DELETE', headers: sbHeaders })
      pruned++
    } else {
      console.error('send error', code || e?.message)
    }
  }
}))
console.log(`✔ push sent to ${sent}/${rows.length} subscriber(s)${pruned ? `, pruned ${pruned} dead` : ''}`)
console.log(`   title: ${title}`)
