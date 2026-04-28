export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getUserProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { ROLES } from '@/lib/constants'

async function canAccess(profile: any, conv: any): Promise<boolean> {
  if (!profile) return false
  if (profile.role === ROLES.SUPERADMINBOSS) return true
  if (profile.role === ROLES.SUPERADMIN) {
    return conv.subscriber_id === (profile.subscriber_id || profile.id)
  }
  if (profile.role === ROLES.AGENTE) {
    // Agents can access the whole team's pool plus their explicit assignments
    if (conv.agent_id === profile.id) return true
    if (profile.subscriber_id && conv.subscriber_id === profile.subscriber_id) return true
    return false
  }
  return false
}

// GET — single conversation. Returns the most recent N messages by default
// (window=50). For "load older", pass ?before=<iso> to fetch the next page
// older than that timestamp. Old behavior loaded 500 messages on every open,
// which made long-running conversations heavy.
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const profile = await getUserProfile()
  if (!profile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const before = searchParams.get('before')
  const windowSize = Math.min(parseInt(searchParams.get('limit') || '50', 10) || 50, 200)

  const admin = createAdminClient()
  const { data: conv, error } = await admin
    .from('conversations')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !conv) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })
  if (!(await canAccess(profile, conv))) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  // Pull the latest window first (DESC), then re-sort ASC for the UI.
  let msgQ = admin
    .from('messages')
    .select('*')
    .eq('conversation_id', params.id)
    .order('sent_at', { ascending: false })
    .limit(windowSize)
  if (before) msgQ = msgQ.lt('sent_at', before)
  const { data: latest } = await msgQ
  const messages = (latest || []).slice().reverse()
  const hasMore = (latest?.length || 0) === windowSize

  // Mark as read (reset unread_count) only when the user is loading the
  // current head (no `before` param) — paging older shouldn't clear unreads.
  if (!before && conv.unread_count > 0) {
    await admin.from('conversations').update({ unread_count: 0 }).eq('id', params.id)
  }

  return NextResponse.json({ conversation: conv, messages, has_more: hasMore })
}

// PATCH — update conversation (assign agent, change status, toggle AI, set subscriber)
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const profile = await getUserProfile()
  if (!profile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = createAdminClient()
  const { data: conv } = await admin.from('conversations').select('*').eq('id', params.id).single()
  if (!conv) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })
  if (!(await canAccess(profile, conv))) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const body = await req.json()
  const updates: Record<string, any> = {}
  const allowed = [
    'status', 'ai_enabled', 'agent_id', 'contact_name', 'contact_phone',
    'contact_email', 'contact_rut', 'unread_count',
  ]
  for (const f of allowed) if (f in body) updates[f] = body[f]

  // SUPERADMINBOSS can also reassign subscriber_id
  if (profile.role === ROLES.SUPERADMINBOSS && 'subscriber_id' in body) {
    updates.subscriber_id = body.subscriber_id
    // If subscriber changed and no new agent specified, clear the existing agent
    // (it likely belonged to the previous subscriber).
    if (body.subscriber_id !== conv.subscriber_id && !('agent_id' in body)) {
      updates.agent_id = null
    }
  }

  // Validate agent_id belongs to the conversation's (possibly new) subscriber
  if ('agent_id' in updates && updates.agent_id) {
    const targetSub = 'subscriber_id' in updates ? updates.subscriber_id : conv.subscriber_id
    const { data: agentProfile } = await admin
      .from('profiles')
      .select('id, role, subscriber_id')
      .eq('id', updates.agent_id)
      .maybeSingle()
    if (!agentProfile || agentProfile.role !== ROLES.AGENTE || agentProfile.subscriber_id !== targetSub) {
      return NextResponse.json({ error: 'El agente no pertenece al suscriptor de esta conversación' }, { status: 400 })
    }
  }

  const { data: updated, error } = await admin
    .from('conversations')
    .update(updates)
    .eq('id', params.id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ conversation: updated })
}
