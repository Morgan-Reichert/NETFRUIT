import { useEffect, useState } from 'react'
import {
  listTickets, ticketMessages, replyTicket, setTicketStatus, setTicketPriority,
  type Ticket, type TicketMessage, type TicketStatus,
} from '../lib/admin'

const STATUS: { v: TicketStatus | ''; label: string }[] = [
  { v: '', label: 'Tous' }, { v: 'open', label: 'Ouverts' }, { v: 'in_progress', label: 'En cours' },
  { v: 'resolved', label: 'Résolus' }, { v: 'closed', label: 'Fermés' },
]
const CATS = [{ v: '', label: 'Toutes' }, { v: 'report', label: 'Signalements' }, { v: 'support', label: 'Support' }, { v: 'appeal', label: 'Contestations' }]
const STATUS_STYLE: Record<string, string> = {
  open: 'bg-amber-400/15 text-amber-300', in_progress: 'bg-blue-400/15 text-blue-300',
  resolved: 'bg-lime/15 text-lime', closed: 'bg-white/10 text-cream/50',
}

export default function Tickets() {
  const [status, setStatus] = useState<TicketStatus | ''>('')
  const [cat, setCat] = useState('')
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [open, setOpen] = useState<Ticket | null>(null)

  const refresh = () => listTickets({ status: status || undefined, category: cat || undefined }).then(setTickets)
  useEffect(() => { refresh() }, [status, cat])

  return (
    <div>
      <h1 className="mb-4 font-display text-2xl font-extrabold">Tickets ({tickets.length})</h1>
      <div className="mb-4 flex flex-wrap gap-2">
        {STATUS.map((s) => <Chip key={s.v} on={status === s.v} onClick={() => setStatus(s.v as TicketStatus | '')}>{s.label}</Chip>)}
        <span className="w-2" />
        {CATS.map((c) => <Chip key={c.v} on={cat === c.v} onClick={() => setCat(c.v)}>{c.label}</Chip>)}
      </div>

      {tickets.length === 0 ? (
        <Empty>Aucun ticket.</Empty>
      ) : (
        <ul className="divide-y divide-white/5 rounded-xl border border-white/10">
          {tickets.map((t) => (
            <li key={t.id}>
              <button onClick={() => setOpen(t)} className="flex w-full items-center gap-3 p-3 text-left hover:bg-white/5">
                <span className={`rounded px-2 py-0.5 text-[11px] font-bold ${STATUS_STYLE[t.status]}`}>{t.status}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{t.subject}</p>
                  <p className="truncate text-xs text-cream/50">{t.category}{t.target_type ? ` · ${t.target_type}` : ''} · {new Date(t.created_at).toLocaleDateString('fr-FR')}</p>
                </div>
                {t.priority === 'high' && <span className="rounded bg-fruit-red-bright/20 px-2 py-0.5 text-[11px] font-bold text-fruit-red-bright">urgent</span>}
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && <TicketDetail ticket={open} onClose={() => { setOpen(null); refresh() }} />}
    </div>
  )
}

function TicketDetail({ ticket, onClose }: { ticket: Ticket; onClose: () => void }) {
  const [msgs, setMsgs] = useState<TicketMessage[]>([])
  const [reply, setReply] = useState('')
  const [status, setStatus] = useState<TicketStatus>(ticket.status)
  const [busy, setBusy] = useState(false)
  const load = () => ticketMessages(ticket.id).then(setMsgs)
  useEffect(() => { load() }, [ticket.id])

  const send = async () => {
    if (!reply.trim()) return
    setBusy(true); await replyTicket(ticket.id, reply.trim(), true); setReply(''); await load(); setBusy(false)
  }
  const changeStatus = async (s: TicketStatus) => { setStatus(s); await setTicketStatus(ticket.id, s) }
  const togglePriority = async () => { const p = ticket.priority === 'high' ? 'normal' : 'high'; await setTicketPriority(ticket.id, p); ticket.priority = p }

  return (
    <div className="fixed inset-0 z-[120] grid place-items-center bg-black/70 p-4" onClick={onClose}>
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl border border-white/10 bg-ink-900 text-cream" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-white/10 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-lg font-bold">{ticket.subject}</h3>
              <p className="text-xs text-cream/50">{ticket.category}{ticket.target_type ? ` · cible ${ticket.target_type}:${ticket.target_id}` : ''}</p>
            </div>
            <button onClick={togglePriority} className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${ticket.priority === 'high' ? 'bg-fruit-red-bright/20 text-fruit-red-bright' : 'border border-white/20 text-cream/60'}`}>Urgent</button>
          </div>
          <div className="mt-2 flex gap-1">
            {(['open', 'in_progress', 'resolved', 'closed'] as TicketStatus[]).map((s) => (
              <button key={s} onClick={() => changeStatus(s)} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${status === s ? 'bg-fruit-red-bright text-white' : 'border border-white/15 text-cream/60'}`}>{s}</button>
            ))}
          </div>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {ticket.body && <p className="rounded-lg bg-white/5 p-3 text-sm text-cream/80">{ticket.body}</p>}
          {msgs.map((m) => (
            <div key={m.id} className={`max-w-[85%] rounded-lg p-2.5 text-sm ${m.is_staff ? 'ml-auto bg-fruit-red-bright/15 text-cream' : 'bg-white/5 text-cream/80'}`}>
              <p className="mb-0.5 text-[10px] uppercase text-cream/40">{m.is_staff ? 'Staff' : 'Utilisateur'}</p>
              {m.body}
            </div>
          ))}
        </div>
        <div className="flex gap-2 border-t border-white/10 p-3">
          <input value={reply} onChange={(e) => setReply(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder="Répondre…" className="flex-1 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none" />
          <button disabled={busy} onClick={send} className="rounded-lg bg-fruit-red-bright px-4 text-sm font-bold text-white disabled:opacity-50">Envoyer</button>
        </div>
      </div>
    </div>
  )
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${on ? 'bg-fruit-red-bright text-white' : 'border border-white/15 text-cream/60 hover:border-white/40'}`}>{children}</button>
}
function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-dashed border-white/15 p-10 text-center text-cream/50">{children}</div>
}
