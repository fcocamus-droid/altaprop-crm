export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getUserProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { ROLES } from '@/lib/constants'
import { sendWhatsAppMedia, type WhatsAppMediaKind } from '@/lib/whatsapp/client'

const BUCKET = 'inbox-media'

// Map a MIME type to a WhatsApp media kind. Returns null if unsupported.
function mediaKindFromMime(mime: string): WhatsAppMediaKind | null {
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('audio/')) return 'audio'
  if (mime === 'application/pdf' || mime.startsWith('application/')) return 'document'
  return null
}

// Per-kind size limits (Meta WhatsApp Cloud API limits)
const SIZE_LIMITS: Record<WhatsAppMediaKind, number> = {
  image: 5 * 1024 * 1024,
  video: 16 * 1024 * 1024,
  audio: 16 * 1024 * 1024,
  document: 25 * 1024 * 1024, // we cap at 25 MB even though Meta allows up to 100
}

// POST — upload an attachment, send via WhatsApp, store the message.
// Multipart body: file (required), caption (optional)
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const profile = await getUserProfile()
  if (!profile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Formato inválido' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  const caption = (formData.get('caption') as string | null) || undefined
  if (!file) return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 })

  const kind = mediaKindFromMime(file.type)
  if (!kind) {
    return NextResponse.json({ error: `Tipo no soportado: ${file.type}` }, { status: 400 })
  }
  if (file.size > SIZE_LIMITS[kind]) {
    const mb = Math.round(SIZE_LIMITS[kind] / 1024 / 1024)
    return NextResponse.json({ error: `El archivo supera ${mb} MB` }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: conv } = await admin.from('conversations').select('*').eq('id', params.id).single()
  if (!conv) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })

  // Access control — same rules as messages POST
  const isBoss = profile.role === ROLES.SUPERADMINBOSS
  const isSubOwner = profile.role === ROLES.SUPERADMIN && conv.subscriber_id === (profile.subscriber_id || profile.id)
  const isAgent = profile.role === ROLES.AGENTE && (conv.agent_id === profile.id || conv.subscriber_id === profile.subscriber_id)
  if (!isBoss && !isSubOwner && !isAgent) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  if (conv.channel !== 'whatsapp' || !conv.contact_phone) {
    return NextResponse.json({ error: 'Solo WhatsApp soporta media por ahora' }, { status: 400 })
  }

  // Upload to Storage at inbox-media/{conversation_id}/{timestamp}-{name}
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80)
  const path = `${params.id}/${Date.now()}-${safeName}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: upErr } = await admin.storage.from(BUCKET).upload(path, buffer, {
    contentType: file.type,
    upsert: false,
  })
  if (upErr) {
    return NextResponse.json({ error: `Error subiendo archivo: ${upErr.message}` }, { status: 500 })
  }
  const { data: publicData } = admin.storage.from(BUCKET).getPublicUrl(path)
  const publicUrl = publicData.publicUrl

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

  const send = await sendWhatsAppMedia(
    conv.contact_phone,
    kind,
    publicUrl,
    { caption, filename: kind === 'document' ? file.name : undefined },
    creds,
  )

  // Store the message — even on send failure so the agent sees the attempt
  const messageContent = caption || (kind === 'document' ? file.name : null)
  const { data: msg, error } = await admin.from('messages').insert({
    conversation_id: params.id,
    direction: 'outbound',
    sender_type: 'agent',
    sender_id: profile.id,
    content: messageContent,
    media_url: publicUrl,
    media_type: kind,
    external_id: send.wamid || null,
    error: send.success ? null : send.error,
    metadata: { original_filename: file.name, mime: file.type, size: file.size },
  }).select('*').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Auto-disable AI when human sends media
  if (conv.ai_enabled) {
    await admin.from('conversations')
      .update({ ai_enabled: false, status: 'human_handling' })
      .eq('id', params.id)
  }

  return NextResponse.json({ message: msg, sendError: send.success ? null : send.error })
}
