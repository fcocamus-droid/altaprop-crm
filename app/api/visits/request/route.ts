import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { toChileDatetime } from '@/lib/utils/chile-datetime'

export async function POST(request: NextRequest) {
  const { propertyId, date, time, name, rut, phone, email, notes } = await request.json()

  if (!propertyId || !date || !time || !name || !phone) {
    return NextResponse.json({ error: 'Completa todos los campos requeridos' }, { status: 400 })
  }

  // Store with explicit Chile timezone offset so DB receives correct UTC
  const scheduledAt = toChileDatetime(date, time)
  const supabase = createClient()
  const admin = createAdminClient()

  // Get property subscriber_id
  const { data: property } = await supabase
    .from('properties')
    .select('subscriber_id, owner_id')
    .eq('id', propertyId)
    .single()

  if (!property) {
    return NextResponse.json({ error: 'Propiedad no encontrada' }, { status: 404 })
  }

  // Check if slot is available
  const { data: existing } = await admin
    .from('visits')
    .select('id')
    .eq('property_id', propertyId)
    .eq('scheduled_at', scheduledAt)
    .neq('status', 'canceled')
    .single()

  if (existing) {
    return NextResponse.json({ error: 'Este horario ya esta reservado' })
  }

  // Create visit using the property owner as visitor_id fallback
  const { data: { user } } = await supabase.auth.getUser()
  const visitorId = user?.id || property.owner_id

  const { error } = await admin.from('visits').insert({
    property_id: propertyId,
    visitor_id: visitorId,
    subscriber_id: property.subscriber_id,
    scheduled_at: scheduledAt,
    status: 'pending',
    notes: `Solicitud de: ${name}${rut ? ` | RUT: ${rut}` : ''} | Tel: ${phone}${email ? ` | Email: ${email}` : ''}${notes ? ` | ${notes}` : ''}`,
  })

  if (error) return NextResponse.json({ error: error.message })

  return NextResponse.json({ success: true })
}
