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
    return conv.agent_id === profile.id || conv.subscriber_id === profile.subscriber_id
  }
  return false
}

// GET — single conversation with messages
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const profile = await getUserProfile()
  if (!profile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = createAdminClient()
  const { data: conv, error } = await admin
    .from('conversations')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !conv) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })
  if (!(await canAccess(profile, conv))) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { data: messages } = await admin
    .from('messages')
    .select('*')
    .eq('conversation_id', params.id)
    .order('sent_at', { ascending: true })
    .limit(500)

  // Mark as read (reset unread_count)
  if (conv.unread_count > 0) {
    await admin.from('conversations').update({ unread_count: 0 }).eq('id', params.id)
  }

  return NextResponse.json({ conversation: conv, messages: messages || [] })
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
