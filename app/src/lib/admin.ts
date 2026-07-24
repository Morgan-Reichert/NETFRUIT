import { supabase } from './supabase'

const sb = () => { if (!supabase) throw new Error('Supabase not configured'); return supabase }

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed'
export interface Ticket {
  id: string; user_id: string | null; category: string; subject: string; body: string | null
  target_type: string | null; target_id: string | null; status: TicketStatus; priority: string
  created_at: string; updated_at: string
}
export interface TicketMessage { id: string; ticket_id: string; author_id: string | null; body: string; is_staff: boolean; created_at: string }
export interface Account {
  user_id: string; email: string; created_at: string; is_creator: boolean; creator_status: string | null
  series_watched: number; seconds_watched: number; open_tickets: number; active_sanction: string | null
}

// ---- viewer: create a ticket (report / support) ----------------------------
export async function createTicket(p: {
  category: 'support' | 'report' | 'appeal'; subject: string; body?: string
  target_type?: string; target_id?: string
}): Promise<{ error?: string }> {
  const { data: u } = await sb().auth.getUser()
  if (!u.user) return { error: 'Connecte-toi pour ouvrir un ticket.' }
  const { error } = await sb().from('tickets').insert({ user_id: u.user.id, ...p })
  return error ? { error: error.message } : {}
}

export async function myActiveSanction(): Promise<{ kind: string; reason: string | null; expires_at: string | null } | null> {
  try {
    const { data } = await sb().rpc('my_sanction')
    return (Array.isArray(data) && data[0]) || null
  } catch { return null }
}

// ---- admin -----------------------------------------------------------------
export async function listTickets(filter?: { status?: string; category?: string }): Promise<Ticket[]> {
  let q = sb().from('tickets').select('*').order('created_at', { ascending: false })
  if (filter?.status) q = q.eq('status', filter.status)
  if (filter?.category) q = q.eq('category', filter.category)
  const { data } = await q
  return (data as Ticket[]) ?? []
}
export async function ticketMessages(ticketId: string): Promise<TicketMessage[]> {
  const { data } = await sb().from('ticket_messages').select('*').eq('ticket_id', ticketId).order('created_at')
  return (data as TicketMessage[]) ?? []
}
export async function replyTicket(ticketId: string, body: string, isStaff: boolean) {
  const { data: u } = await sb().auth.getUser()
  return sb().from('ticket_messages').insert({ ticket_id: ticketId, author_id: u.user?.id, body, is_staff: isStaff })
}
export async function setTicketStatus(id: string, status: TicketStatus) {
  return sb().from('tickets').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
}
export async function setTicketPriority(id: string, priority: string) {
  return sb().from('tickets').update({ priority }).eq('id', id)
}

export async function adminAccounts(): Promise<Account[]> {
  const { data } = await sb().rpc('admin_accounts')
  return (data as Account[]) ?? []
}
export async function sanctionUser(uid: string, kind: 'none' | 'warning' | 'suspension' | 'ban', reason: string, days: number): Promise<string> {
  const { data, error } = await sb().rpc('sanction_user', { uid, kind_: kind, reason_: reason, days })
  return error ? 'ERROR' : (data as string)
}
