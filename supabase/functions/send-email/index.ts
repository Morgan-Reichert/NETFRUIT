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
  const bodies: Record<Kind, { subject: string; heading: string; msg: string; cta: string }> = {
    creator_approved: {
      subject: 'Bienvenue — ton compte créateur NETFRUIT est validé',
      heading: 'Candidature acceptée', cta: 'Ouvrir le Studio',
      msg: `Félicitations ${name}, ton compte créateur est officiellement certifié. Tu peux dès maintenant publier tes séries sur NETFRUIT depuis ton Studio.`,
    },
    creator_rejected: {
      subject: 'Ta candidature créateur NETFRUIT',
      heading: 'Candidature non retenue', cta: 'Re-candidater',
      msg: `Bonjour ${name}, après examen, ta candidature n'a pas été retenue pour le moment.${opts.note ? ` Motif : ${opts.note}.` : ''} Tu peux retravailler ton dossier et re-candidater quand tu veux.`,
    },
    series_published: {
      subject: `Ta série « ${opts.seriesTitle ?? ''} » est en ligne`,
      heading: 'Ta série est en ligne', cta: 'Voir sur NETFRUIT',
      msg: `Bonne nouvelle ${name}, ta série « ${opts.seriesTitle ?? ''} » a passé la modération et est maintenant en ligne sur NETFRUIT.`,
    },
    series_rejected: {
      subject: `Ta série « ${opts.seriesTitle ?? ''} » — décision de modération`,
      heading: 'Série non publiée', cta: 'Modifier ma série',
      msg: `Bonjour ${name}, ta série « ${opts.seriesTitle ?? ''} » n'a pas pu être publiée en l'état.${opts.note ? ` Motif : ${opts.note}.` : ''} Corrige les points signalés puis re-soumets-la depuis ton Studio.`,
    },
  }
  const b = bodies[kind]
  const grad = 'linear-gradient(135deg,#0a6fb0,#14a866)'
  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#f0f3f2;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f0f3f2;font-family:-apple-system,'Segoe UI',Arial,Helvetica,sans-serif;">
    <tr><td align="center" style="padding:32px 14px;">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.06);">

        <!-- thin brand accent -->
        <tr><td style="height:4px;background:${grad};font-size:0;line-height:0;">&nbsp;</td></tr>

        <!-- logo -->
        <tr><td style="padding:28px 36px 8px;">
          <img src="${LOGO}" alt="NETFRUIT" height="26" style="height:26px;width:auto;display:block;">
        </td></tr>

        <!-- body -->
        <tr><td style="padding:8px 36px 28px;">
          <h1 style="margin:0 0 14px;font-size:20px;font-weight:700;color:#12211f;">${b.heading}</h1>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#4a5a57;">${b.msg}</p>
          <a href="https://netfruit.fun/studio" style="display:inline-block;background:${grad};color:#ffffff;text-decoration:none;font-weight:600;padding:12px 26px;border-radius:8px;font-size:14px;">${b.cta}</a>
        </td></tr>

        <!-- footer -->
        <tr><td style="padding:20px 36px 26px;border-top:1px solid #eceeed;">
          <p style="margin:0 0 8px;font-size:12px;line-height:1.7;color:#9aa5a2;">
            <a href="https://netfruit.fun" style="color:#0f8f8f;text-decoration:none;">netfruit.fun</a>
            &nbsp;·&nbsp;<a href="mailto:contact@netfruit.fun" style="color:#0f8f8f;text-decoration:none;">Contact</a>
            &nbsp;·&nbsp;<a href="https://netfruit.fun/studio" style="color:#0f8f8f;text-decoration:none;">Politique de contenu</a>
            &nbsp;·&nbsp;<a href="https://netfruit.fun/studio" style="color:#0f8f8f;text-decoration:none;">Accord Créateur</a>
          </p>
          <p style="margin:0;font-size:11px;color:#b7bfbd;">© NETFRUIT — Email envoyé à propos de ta candidature créateur.</p>
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
