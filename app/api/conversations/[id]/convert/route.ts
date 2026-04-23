export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getUserProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { ROLES } from '@/lib/constants'

// POST — convert a conversation into a prospecto (CRM lead)
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const profile = await getUserProfile()
  if (!profile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (![ROLES.SUPERADMINBOSS, ROLES.SUPERADMIN, ROLES.AGENTE].includes(profile.role as any)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const admin = createAdminClient()
  const { data: conv } = await admin.from('conversations').select('*').eq('id', params.id).single()
  if (!conv) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })

  // If already converted, return existing
  if (conv.prospecto_id) {
    const { data: existing } = await admin.from('prospectos').select('*').eq('id', conv.prospecto_id).single()
    return NextResponse.json({ prospecto: existing, already_converted: true })
  }

  const subscriberId = conv.subscriber_id || (profile.role === ROLES.SUPERADMIN ? profile.id : profile.subscriber_id) || null

  // Determine prospect "tipo" from channel
  const tipo = conv.channel === 'whatsapp' ? 'visita'
    : conv.channel === 'meta_ads' || conv.channel === 'google_ads' ? 'visita'
    : conv.channel === 'portal' ? 'visita'
    : null

  const { data: prospecto, error } = await admin.from('prospectos').insert({
    full_name: conv.contact_name || 'Lead sin nombre',
    rut: conv.contact_rut,
    email: conv.contact_email,
    phone: conv.contact_phone,
    tipo,
    status: 'contactado',
    priority: 'media',
    source: conv.channel === 'whatsapp' ? 'whatsapp' : 'otro',
    subscriber_id: subscriberId,
    agent_id: conv.agent_id,
    notes: `Convertido desde conversación (${conv.channel})`,
    created_by: profile.id,
  }).select('*').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await admin.from('conversations')
    .update({ prospecto_id: prospecto.id, status: 'converted' })
    .eq('id', params.id)

  return NextResponse.json({ prospecto, already_converted: false })
}
