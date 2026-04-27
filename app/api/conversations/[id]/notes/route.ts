export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getUserProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { ROLES } from '@/lib/constants'

// POST — add an internal note to a conversation. Stays local: never goes out
// over WhatsApp/email/etc., only visible to subscribers, agents, and the boss
// in the inbox UI.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const profile = await getUserProfile()
  if (!profile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { content } = await req.json()
  if (!content || !String(content).trim()) {
    return NextResponse.json({ error: 'Contenido vacío' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: conv } = await admin.from('conversations').select('*').eq('id', params.id).single()
  if (!conv) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })

  // Same access control as messages
  const isBoss = profile.role === ROLES.SUPERADMINBOSS
  const isSubOwner = profile.role === ROLES.SUPERADMIN && conv.subscriber_id === (profile.subscriber_id || profile.id)
  const isAgent = profile.role === ROLES.AGENTE && (conv.agent_id === profile.id || conv.subscriber_id === profile.subscriber_id)
  if (!isBoss && !isSubOwner && !isAgent) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  // Notes ride on the messages table with is_internal = true.
  // We use sender_type = 'agent' even for boss/subscriber so the UI groups them
  // under "staff" — sender_id keeps the actual author.
  const { data: msg, error } = await admin.from('messages').insert({
    conversation_id: params.id,
    direction: 'outbound',
    sender_type: 'agent',
    sender_id: profile.id,
    content: String(content).trim(),
    is_internal: true,
  }).select('*').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ message: msg })
}
