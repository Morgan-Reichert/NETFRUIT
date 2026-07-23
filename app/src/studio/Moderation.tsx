import { useEffect, useState } from 'react'
import {
  listEpisodes, listPending, listPendingCreators, sendDecisionEmail, setCreatorStatus, setSeriesStatus,
  type Creator, type DbEpisode, type DbSeries,
} from '../lib/creator'

export default function Moderation() {
  const [creators, setCreators] = useState<Creator[]>([])
  const [pending, setPending] = useState<DbSeries[]>([])
  const [eps, setEps] = useState<Record<string, DbEpisode[]>>({})
  const [busy, setBusy] = useState<string | null>(null)

  const refresh = async () => {
    setCreators(await listPendingCreators())
    const list = await listPending()
    setPending(list)
    const map: Record<string, DbEpisode[]> = {}
    await Promise.all(list.map(async (s) => { map[s.id] = await listEpisodes(s.id) }))
    setEps(map)
  }
  useEffect(() => { refresh() }, [])

  const decideCreator = async (id: string, status: 'approved' | 'rejected') => {
    let note: string | undefined
    if (status === 'rejected') note = window.prompt('Motif du refus (optionnel) :') ?? undefined
    setBusy(id)
    await setCreatorStatus(id, status, note)
    await sendDecisionEmail({ kind: status === 'approved' ? 'creator_approved' : 'creator_rejected', creatorId: id, note })
    setBusy(null); refresh()
  }
  const decideSeries = async (s: DbSeries, status: 'published' | 'rejected') => {
    let note: string | undefined
    if (status === 'rejected') note = window.prompt('Motif du refus (optionnel) :') ?? undefined
    setBusy(s.id)
    await setSeriesStatus(s.id, status)
    await sendDecisionEmail({ kind: status === 'published' ? 'series_published' : 'series_rejected', creatorId: s.creator_id, seriesTitle: s.title, note })
    setBusy(null); refresh()
  }

  return (
    <div className="space-y-10">
      {/* Creator applications */}
      <div>
        <h1 className="mb-4 font-display text-2xl font-extrabold">Candidatures créateur ({creators.length})</h1>
        {creators.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/15 p-8 text-center text-cream/50">Aucune candidature en attente.</p>
        ) : (
          <ul className="space-y-4">
            {creators.map((c) => (
              <li key={c.id} className="rounded-xl border border-white/10 p-4">
                <div className="flex items-center gap-3">
                  <img src={c.avatar_url ?? '/icons/icon-192.png'} alt="" className="h-10 w-10 rounded-lg object-cover" />
                  <div>
                    <p className="font-bold">{c.display_name} <span className="text-cream/40">@{c.handle}</span></p>
                    {c.bio && <p className="text-sm text-cream/60">{c.bio}</p>}
                  </div>
                </div>
                <p className="mt-2 text-sm text-cream/70">
                  {c.legal_name && <span><span className="text-cream/40">Identité : </span>{c.legal_name}</span>}
                  {c.birth_date && <span> · <span className="text-cream/40">Né·e le </span>{c.birth_date}</span>}
                  {c.country && <span> · {c.country}</span>}
                </p>
                {c.experience && <p className="mt-2 text-sm text-cream/80"><span className="text-cream/40">Expérience : </span>{c.experience}</p>}
                {c.answers?.tools && <p className="mt-1 text-sm text-cream/70"><span className="text-cream/40">Outils : </span>{c.answers.tools}</p>}
                {c.answers?.rights_practice && <p className="mt-1 text-sm text-cream/70"><span className="text-cream/40">Droits : </span>{c.answers.rights_practice}</p>}
                <div className="mt-2 flex flex-wrap gap-3 text-xs">
                  {c.socials?.tiktok && <Link label={`TikTok: ${c.socials.tiktok}`} href={c.socials.tiktok} />}
                  {c.socials?.instagram && <Link label={`Instagram: ${c.socials.instagram}`} href={c.socials.instagram} />}
                  {c.socials?.youtube && <Link label={`YouTube: ${c.socials.youtube}`} href={c.socials.youtube} />}
                  {c.portfolio_url && <Link label="Portfolio" href={c.portfolio_url} />}
                </div>
                <div className="mt-3 flex gap-2">
                  <button disabled={busy === c.id} onClick={() => decideCreator(c.id, 'approved')}
                    className="rounded-full bg-lime px-4 py-2 text-sm font-bold text-ink-950 enabled:hover:brightness-110 disabled:opacity-40">Certifier</button>
                  <button disabled={busy === c.id} onClick={() => decideCreator(c.id, 'rejected')}
                    className="rounded-full bg-fruit-red-bright px-4 py-2 text-sm font-bold text-white enabled:hover:brightness-110 disabled:opacity-40">Rejeter</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Series moderation */}
      <div>
        <h1 className="mb-4 font-display text-2xl font-extrabold">Séries à modérer ({pending.length})</h1>
        {pending.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/15 p-8 text-center text-cream/50">Rien à modérer.</p>
        ) : (
          <ul className="space-y-4">
            {pending.map((s) => (
              <li key={s.id} className="rounded-xl border border-white/10 p-4">
                <div className="flex gap-4">
                  <div className="h-24 w-16 shrink-0 overflow-hidden rounded-md bg-white/5">
                    {s.poster_url && <img src={s.poster_url} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-lg font-bold">{s.title}</p>
                    <p className="text-sm text-cream/60">{s.synopsis}</p>
                    <p className="mt-1 text-xs text-cream/40">{s.genres?.join(' · ')} · {s.monetization} · {(eps[s.id] ?? []).length} épisode(s)</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(eps[s.id] ?? []).map((e) => (
                        <a key={e.id} href={e.video_url} target="_blank" rel="noreferrer" className="rounded bg-white/10 px-2 py-1 text-xs text-cream/80 hover:bg-white/20">▶ {e.number}. {e.title}</a>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button disabled={busy === s.id} onClick={() => decideSeries(s, 'published')}
                    className="rounded-full bg-lime px-4 py-2 text-sm font-bold text-ink-950 enabled:hover:brightness-110 disabled:opacity-40">Approuver</button>
                  <button disabled={busy === s.id} onClick={() => decideSeries(s, 'rejected')}
                    className="rounded-full bg-fruit-red-bright px-4 py-2 text-sm font-bold text-white enabled:hover:brightness-110 disabled:opacity-40">Rejeter</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function Link({ label, href }: { label: string; href: string }) {
  const url = /^https?:\/\//.test(href) ? href : undefined
  return url
    ? <a href={url} target="_blank" rel="noreferrer" className="rounded bg-white/10 px-2 py-1 text-cream/80 hover:bg-white/20">{label} ↗</a>
    : <span className="rounded bg-white/10 px-2 py-1 text-cream/70">{label}</span>
}
