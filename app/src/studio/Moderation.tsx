import { useEffect, useState } from 'react'
import { listEpisodes, listPending, setSeriesStatus, type DbEpisode, type DbSeries } from '../lib/creator'

export default function Moderation() {
  const [pending, setPending] = useState<DbSeries[]>([])
  const [eps, setEps] = useState<Record<string, DbEpisode[]>>({})
  const [busy, setBusy] = useState<string | null>(null)

  const refresh = async () => {
    const list = await listPending()
    setPending(list)
    const map: Record<string, DbEpisode[]> = {}
    await Promise.all(list.map(async (s) => { map[s.id] = await listEpisodes(s.id) }))
    setEps(map)
  }
  useEffect(() => { refresh() }, [])

  const decide = async (id: string, status: 'published' | 'rejected') => {
    setBusy(id)
    await setSeriesStatus(id, status)
    setBusy(null)
    refresh()
  }

  return (
    <div>
      <h1 className="mb-4 font-display text-2xl font-extrabold">Modération</h1>
      {pending.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/15 p-10 text-center text-cream/50">Rien à modérer. 🎉</p>
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
                      <a key={e.id} href={e.video_url} target="_blank" rel="noreferrer"
                        className="rounded bg-white/10 px-2 py-1 text-xs text-cream/80 hover:bg-white/20">▶ {e.number}. {e.title}</a>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button disabled={busy === s.id} onClick={() => decide(s.id, 'published')}
                  className="rounded-full bg-lime px-4 py-2 text-sm font-bold text-ink-950 enabled:hover:brightness-110 disabled:opacity-40">Approuver</button>
                <button disabled={busy === s.id} onClick={() => decide(s.id, 'rejected')}
                  className="rounded-full bg-fruit-red-bright px-4 py-2 text-sm font-bold text-white enabled:hover:brightness-110 disabled:opacity-40">Rejeter</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
