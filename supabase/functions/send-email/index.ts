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

const AV = (f: string, size: number, radius: number, margin = 0) =>
  `<img src="https://netfruit.fun/avatars/${f}.png" width="${size}" height="${size}" alt="" style="border-radius:${radius}px;display:inline-block;vertical-align:middle;margin:0 ${margin}px;">`
const FRUIT_ROW = ['strawberry', 'lemon', 'grape', 'blueberry', 'orange', 'lime']
  .map((f) => AV(f, 30, 9, 4)).join('')

function template(kind: Kind, opts: { name?: string; seriesTitle?: string; note?: string }): { subject: string; html: string } {
  const name = opts.name || 'créateur'
  const bodies: Record<Kind, { subject: string; hero: string; heading: string; msg: string }> = {
    creator_approved: {
      subject: 'Bienvenue — ton compte créateur NETFRUIT est validé',
      hero: 'strawberry', heading: 'Candidature acceptée !',
      msg: `Félicitations <b>${name}</b> ! Ton compte créateur est officiellement <b>certifié</b>.<br>Tu peux dès maintenant publier tes séries sur NETFRUIT depuis ton Studio.`,
    },
    creator_rejected: {
      subject: 'Ta candidature créateur NETFRUIT',
      hero: 'lemon', heading: 'Candidature non retenue',
      msg: `Bonjour <b>${name}</b>, après examen, ta candidature n'a pas été retenue pour le moment.${opts.note ? `<br><br><span style="color:#f4a72e">Motif : ${opts.note}</span>` : ''}<br><br>Tu peux retravailler ton dossier et re-candidater quand tu veux.`,
    },
    series_published: {
      subject: `Ta série « ${opts.seriesTitle ?? ''} » est en ligne`,
      hero: 'banana', heading: 'Ta série est en ligne !',
      msg: `Bonne nouvelle <b>${name}</b> — ta série <b>${opts.seriesTitle ?? ''}</b> a passé la modération et est maintenant <b>en ligne</b> sur NETFRUIT.`,
    },
    series_rejected: {
      subject: `Ta série « ${opts.seriesTitle ?? ''} » — décision de modération`,
      hero: 'pear', heading: 'Série non publiée',
      msg: `Bonjour <b>${name}</b>, ta série <b>${opts.seriesTitle ?? ''}</b> n'a pas pu être publiée en l'état.${opts.note ? `<br><br><span style="color:#f4a72e">Motif : ${opts.note}</span>` : ''}<br><br>Corrige les points signalés puis re-soumets-la depuis ton Studio.`,
    },
  }
  const b = bodies[kind]
  const grad = 'linear-gradient(135deg,#0a6fb0 0%,#10a1a0 52%,#14a866 100%)'
  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#04100f;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#04100f;font-family:'Segoe UI',Arial,Helvetica,sans-serif;">
    <tr><td align="center" style="padding:28px 12px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header: gradient band + logo + fruit illustrations -->
        <tr><td style="background:${grad};border-radius:22px 22px 0 0;padding:32px 24px 22px;text-align:center;">
          <img src="${LOGO}" alt="NETFRUIT" width="190" style="display:block;margin:0 auto;height:auto;max-width:80%;">
          <div style="margin-top:18px;line-height:1;">${FRUIT_ROW}</div>
        </td></tr>

        <!-- Body card -->
        <tr><td style="background:#0c2523;padding:34px 32px 30px;text-align:center;">
          ${AV(b.hero, 76, 20)}
          <h1 style="margin:16px 0 16px;font-size:25px;font-weight:800;color:#ffffff;">${b.heading}</h1>
          <p style="margin:0 auto;max-width:440px;font-size:15px;line-height:1.7;color:#d8e6e2;">${b.msg}</p>
          <div style="margin-top:28px;">
            <a href="https://netfruit.fun/studio" style="display:inline-block;background:${grad};color:#ffffff;text-decoration:none;font-weight:bold;padding:14px 34px;border-radius:999px;font-size:15px;">Ouvrir le Studio</a>
          </div>
        </td></tr>

        <!-- Fruit divider -->
        <tr><td style="background:#0c2523;padding:6px 30px 20px;text-align:center;line-height:1;">${FRUIT_ROW}</td></tr>

        <!-- Footer -->
        <tr><td style="background:#081b1a;border-radius:0 0 22px 22px;padding:24px 30px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#7f9b96;line-height:1.7;">
            <span style="color:#12a565;font-weight:bold;">NETFRUIT</span> — le streaming des séries de fruits IA<br>
            <a href="mailto:contact@netfruit.fun" style="color:#12a565;text-decoration:none;">contact@netfruit.fun</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
  </body></html>`
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
