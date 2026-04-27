export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getUserProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { ROLES } from '@/lib/constants'
import { sendWhatsAppTemplate } from '@/lib/whatsapp/client'

interface TemplateBody {
  name: string
  language: string                          // e.g. 'es' or 'es_CL'
  bodyParams?: string[]                     // text params for the BODY component
  headerImageUrl?: string                   // optional, for IMAGE header templates
  preview?: string                          // human-readable preview to store as message content
}

// POST — send a WhatsApp message template to the conversation contact.
// Required to (re)open conversations beyond Meta's 24h customer-service window.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const profile = await getUserProfile()
  if (!profile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = (await req.json()) as TemplateBody
  if (!body?.name || !body?.language) {
    return NextResponse.json({ error: 'Falta name o language' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: conv } = await admin.from('conversations').select('*').eq('id', params.id).single()
  if (!conv) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })

  // Access control — same rules as the regular message endpoint
  const isBoss = profile.role === ROLES.SUPERADMINBOSS
  const isSubOwner = profile.role === ROLES.SUPERADMIN && conv.subscriber_id === (profile.subscriber_id || profile.id)
  const isAgent = profile.role === ROLES.AGENTE && (conv.agent_id === profile.id || conv.subscriber_id === profile.subscriber_id)
  if (!isBoss && !isSubOwner && !isAgent) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  if (conv.channel !== 'whatsapp' || !conv.contact_phone) {
    return NextResponse.json({ error: 'La conversación no es de WhatsApp' }, { status: 400 })
  }

  // Resolve subscriber's WhatsApp creds (or fall back to global Boss creds)
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

  // Build Meta components from the body params provided
  const components: any[] = []
  if (body.headerImageUrl) {
    components.push({
      type: 'header',
      parameters: [{ type: 'image', image: { link: body.headerImageUrl } }],
    })
  }
  if (body.bodyParams && body.bodyParams.length > 0) {
    components.push({
      type: 'body',
      parameters: body.bodyParams.map(text => ({ type: 'text', text })),
    })
  }

  const send = await sendWhatsAppTemplate(conv.contact_phone, body.name, body.language, components, creds)
  const previewContent = body.preview || `[Plantilla: ${body.name}]`

  // Store outbound message regardless of success (so the agent sees the attempt + error)
  const { data: msg, error } = await admin.from('messages').insert({
    conversation_id: params.id,
    direction: 'outbound',
    sender_type: 'agent',
    sender_id: profile.id,
    content: previewContent,
    external_id: send.wamid || null,
    error: send.success ? null : send.error,
    metadata: { template: { name: body.name, language: body.language, bodyParams: body.bodyParams || [] } },
  }).select('*').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Auto-disable AI when a human sends a template (same policy as manual replies)
  if (conv.ai_enabled) {
    await admin.from('conversations')
      .update({ ai_enabled: false, status: 'human_handling' })
      .eq('id', params.id)
  }

  return NextResponse.json({ message: msg, sendError: send.success ? null : send.error })
}
