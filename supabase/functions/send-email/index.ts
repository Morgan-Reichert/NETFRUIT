// NETFRUIT — transactional email Edge Function.
// Sends branded emails from contact@netfruit.fun (via Resend) on moderation
// decisions. Only admins may invoke it; the recipient's email is looked up
// server-side with the service-role key (never exposed to the client).
//
// Deploy:
//   supabase secrets set RESEND_API_KEY=re_xxx
//   supabase functions deploy send-email
// Requires the domain netfruit.fun verified in Resend (SPF/DKIM).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const FROM = 'NETFRUIT <contact@netfruit.fun>'
const LOGO = 'https://netfruit.fun/brand/netfruit-long.png'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type Kind = 'creator_approved' | 'creator_rejected' | 'series_published' | 'series_rejected'

function template(kind: Kind, opts: { name?: string; seriesTitle?: string; note?: string }): { subject: string; html: string } {
  const name = opts.name || 'créateur'
  const bodies: Record<Kind, { subject: string; heading: string; msg: string }> = {
    creator_approved: {
      subject: '🎉 Bienvenue — ton compte créateur NETFRUIT est validé',
      heading: 'Candidature acceptée !',
      msg: `Félicitations ${name}, ton compte créateur est <b>certifié</b>. Tu peux dès maintenant publier tes séries sur NETFRUIT depuis ton Studio.`,
    },
    creator_rejected: {
      subject: 'Ta candidature créateur NETFRUIT',
      heading: 'Candidature non retenue',
      msg: `Bonjour ${name}, après examen, ta candidature créateur n'a pas été retenue pour le moment.${opts.note ? `<br><br><i>Motif : ${opts.note}</i>` : ''}<br><br>Tu peux retravailler ton dossier et re-candidater.`,
    },
    series_published: {
      subject: `✅ Ta série « ${opts.seriesTitle ?? ''} » est en ligne`,
      heading: 'Série approuvée !',
      msg: `Bonne nouvelle ${name} — ta série <b>${opts.seriesTitle ?? ''}</b> a passé la modération et est maintenant <b>en ligne</b> sur NETFRUIT. 🍓`,
    },
    series_rejected: {
      subject: `Ta série « ${opts.seriesTitle ?? ''} » — décision de modération`,
      heading: 'Série non publiée',
      msg: `Bonjour ${name}, ta série <b>${opts.seriesTitle ?? ''}</b> n'a pas pu être publiée en l'état.${opts.note ? `<br><br><i>Motif : ${opts.note}</i>` : ''}<br><br>Corrige les points signalés puis re-soumets-la depuis ton Studio.`,
    },
  }
  const b = bodies[kind]
  const html = `
  <div style="margin:0;padding:0;background:#051413;font-family:Arial,Helvetica,sans-serif">
    <div style="max-width:560px;margin:0 auto;padding:32px 24px">
      <img src="${LOGO}" alt="NETFRUIT" style="height:44px;width:auto;display:block;margin-bottom:28px">
      <div style="background:#0f2a28;border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:28px 24px;color:#f7f3e8">
        <h1 style="margin:0 0 12px;font-size:22px">${b.heading}</h1>
        <p style="margin:0;font-size:15px;line-height:1.6;color:#d8e6e2">${b.msg}</p>
        <a href="https://netfruit.fun/studio" style="display:inline-block;margin-top:22px;background:linear-gradient(135deg,#0a6fb0,#14a866);color:#fff;text-decoration:none;font-weight:bold;padding:12px 26px;border-radius:999px;font-size:14px">Ouvrir le Studio</a>
      </div>
      <p style="margin:22px 0 0;font-size:12px;color:#6f8b86;text-align:center">
        NETFRUIT · <a href="mailto:contact@netfruit.fun" style="color:#6f8b86">contact@netfruit.fun</a><br>
        Tu reçois cet email car tu as une candidature créateur sur NETFRUIT.
      </p>
    </div>
  </div>`
  return { subject: b.subject, html }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

    // Verify the caller is an authenticated admin.
    const jwt = req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
    const { data: u } = await admin.auth.getUser(jwt)
    if (!u?.user) return json({ error: 'unauthorized' }, 401)
    const { data: isAdmin } = await admin.from('admins').select('user_id').eq('user_id', u.user.id).maybeSingle()
    if (!isAdmin) return json({ error: 'forbidden' }, 403)

    const { kind, creatorId, seriesTitle, note } = await req.json() as {
      kind: Kind; creatorId: string; seriesTitle?: string; note?: string
    }

    // Resolve recipient email + name from the creator's auth user.
    const { data: target } = await admin.auth.admin.getUserById(creatorId)
    const to = target?.user?.email
    if (!to) return json({ error: 'no recipient email' }, 400)
    const { data: creatorRow } = await admin.from('creators').select('display_name').eq('id', creatorId).maybeSingle()

    const { subject, html } = template(kind, { name: creatorRow?.display_name, seriesTitle, note })

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to, subject, html }),
    })
    if (!res.ok) return json({ error: `resend ${res.status}`, detail: await res.text() }, 502)
    return json({ ok: true })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}
