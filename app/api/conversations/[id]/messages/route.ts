export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getUserProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { ROLES } from '@/lib/constants'
import { sendWhatsAppText } from '@/lib/whatsapp/client'

// POST — agent sends a message manually
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

  // Access control
  const isBoss = profile.role === ROLES.SUPERADMINBOSS
  const isSubOwner = profile.role === ROLES.SUPERADMIN && conv.subscriber_id === (profile.subscriber_id || profile.id)
  const isAgent    = profile.role === ROLES.AGENTE && (conv.agent_id === profile.id || conv.subscriber_id === profile.subscriber_id)
  if (!isBoss && !isSubOwner && !isAgent) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  let externalId: string | null = null
  let sendError: string | null = null

  // Send via channel — use the conversation subscriber's WhatsApp credentials
  if (conv.channel === 'whatsapp' && conv.contact_phone) {
    let creds: { phoneId?: string; token?: string } | undefined
    if (conv.subscriber_id) {
      const { data: integration } = await admin
        .from('integrations')
        .select('config')
        .eq('subscriber_id', conv.subscriber_id)
        .eq('channel', 'whatsapp')
        .eq('enabled', true)
        .maybeSingle()
      if (integration) {
        const c = (integration as any).config
        creds = { phoneId: c.phone_number_id, token: c.access_token }
      }
    }
    const res = await sendWhatsAppText(conv.contact_phone, content, creds)
    externalId = res.wamid || null
    if (!res.success) sendError = res.error || 'Error al enviar'
  }

  const { data: msg, error } = await admin.from('messages').insert({
    conversation_id: params.id,
    direction: 'outbound',
    sender_type: 'agent',
    sender_id: profile.id,
    content,
    external_id: externalId,
    error: sendError,
  }).select('*').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Auto-disable AI when a human replies (avoid AI/human collision)
  if (conv.ai_enabled) {
    await admin.from('conversations')
      .update({ ai_enabled: false, status: 'human_handling' })
      .eq('id', params.id)
  }

  return NextResponse.json({ message: msg, sendError })
}
