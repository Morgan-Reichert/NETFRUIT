import { useEffect, useState } from 'react'
import { adminAccounts, sanctionUser, type Account } from '../lib/admin'

const fmtTime = (s: number) => {
  if (!s) return '0 min'
  const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60)
  return h ? `${h}h ${m}min` : `${m} min`
}

export default function Accounts() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<Account | null>(null)
  const refresh = () => adminAccounts().then(setAccounts)
  useEffect(() => { refresh() }, [])

  const filtered = accounts.filter((a) => !q || a.email.toLowerCase().includes(q.toLowerCase()))

  return (
    <div>
      <h1 className="mb-4 font-display text-2xl font-extrabold">Comptes ({accounts.length})</h1>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un email…" className="mb-4 w-full max-w-sm rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none" />
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-left text-xs uppercase tracking-wide text-cream/50">
            <tr><th className="p-3">Email</th><th className="p-3">Inscrit</th><th className="p-3">Séries vues</th><th className="p-3">Temps</th><th className="p-3">Rôle</th><th className="p-3">Statut</th></tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map((a) => (
              <tr key={a.user_id} className="cursor-pointer hover:bg-white/5" onClick={() => setOpen(a)}>
                <td className="max-w-[180px] truncate p-3 font-medium">{a.email}</td>
                <td className="p-3 text-cream/60">{new Date(a.created_at).toLocaleDateString('fr-FR')}</td>
                <td className="p-3 text-cream/70">{a.series_watched}</td>
                <td className="p-3 text-cream/70">{fmtTime(a.seconds_watched)}</td>
                <td className="p-3">{a.is_creator ? <span className="rounded bg-brand-gradient px-1.5 py-0.5 text-[11px] font-bold text-white">{a.creator_status === 'approved' ? 'Créateur' : 'Créateur ?'}</span> : <span className="text-cream/40">Spectateur</span>}</td>
                <td className="p-3">{a.active_sanction ? <span className="rounded bg-fruit-red-bright/20 px-1.5 py-0.5 text-[11px] font-bold text-fruit-red-bright">{a.active_sanction}</span> : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {open && <AccountDetail account={open} onClose={() => { setOpen(null); refresh() }} />}
    </div>
  )
}

function AccountDetail({ account, onClose }: { account: Account; onClose: () => void }) {
  const [reason, setReason] = useState('')
  const [days, setDays] = useState('7')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const act = async (kind: 'none' | 'warning' | 'suspension' | 'ban') => {
    setBusy(true); setMsg(null)
    const st = await sanctionUser(account.user_id, kind, reason.trim(), kind === 'suspension' ? parseInt(days || '7', 10) : 0)
    setBusy(false)
    setMsg(st === 'OK'
      ? (kind === 'none' ? 'Sanctions levées.' : `Sanction « ${kind} » appliquée.`)
      : 'Action impossible.')
  }

  return (
    <div className="fixed inset-0 z-[120] grid place-items-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-ink-900 p-5 text-cream" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display text-lg font-bold">{account.email}</h3>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <Info label="Inscrit le" value={new Date(account.created_at).toLocaleDateString('fr-FR')} />
          <Info label="Séries regardées" value={String(account.series_watched)} />
          <Info label="Temps passé" value={fmtTime(account.seconds_watched)} />
          <Info label="Tickets ouverts" value={String(account.open_tickets)} />
          <Info label="Rôle" value={account.is_creator ? `Créateur (${account.creator_status})` : 'Spectateur'} />
          <Info label="Sanction active" value={account.active_sanction ?? 'Aucune'} />
        </div>

        <div className="mt-5 space-y-2 rounded-xl border border-white/10 p-3">
          <p className="text-sm font-semibold text-cream/80">Sanctionner</p>
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motif" className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none" />
          <div className="flex items-center gap-2 text-sm">
            <span className="text-cream/60">Suspension :</span>
            <input value={days} onChange={(e) => setDays(e.target.value)} className="w-16 rounded-lg border border-white/15 bg-white/5 px-2 py-1" /> jours
          </div>
          <div className="flex flex-wrap gap-2">
            <button disabled={busy} onClick={() => act('warning')} className="rounded-full bg-amber-400/20 px-3 py-1.5 text-sm font-bold text-amber-300 disabled:opacity-50">Avertir</button>
            <button disabled={busy} onClick={() => act('suspension')} className="rounded-full bg-orange-500/20 px-3 py-1.5 text-sm font-bold text-orange-300 disabled:opacity-50">Suspendre</button>
            <button disabled={busy} onClick={() => act('ban')} className="rounded-full bg-fruit-red-bright/20 px-3 py-1.5 text-sm font-bold text-fruit-red-bright disabled:opacity-50">Bannir</button>
            <button disabled={busy} onClick={() => act('none')} className="rounded-full border border-white/20 px-3 py-1.5 text-sm text-cream/70 disabled:opacity-50">Lever</button>
          </div>
          {msg && <p className="text-sm text-cream/80">{msg}</p>}
        </div>
        <button onClick={onClose} className="mt-4 w-full rounded-full border border-white/20 py-2 text-sm text-cream/70 hover:border-white/40">Fermer</button>
      </div>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-white/[0.03] p-2.5"><p className="text-[11px] text-cream/40">{label}</p><p className="font-semibold">{value}</p></div>
}
