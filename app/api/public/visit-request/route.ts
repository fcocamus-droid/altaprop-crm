import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { toChileDatetime } from '@/lib/utils/chile-datetime'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!

/**
 * Finds an existing auth user by email, or creates a new POSTULANTE account.
 * Returns the profile id (= auth user id).
 */
async function findOrCreatePostulante(
  email: string,
  fullName: string,
  phone: string | null,
  rut: string | null,
) {
  // ── 1. Look up existing auth user by email ──
  const listRes = await fetch(
    `${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}&page=1&per_page=1`,
    { headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY } },
  )
  const listData = await listRes.json()
  const existing = listData.users?.[0]

  if (existing) return existing.id as string

  // ── 2. Create new auth user (confirmed, no password) ──
  const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    }),
  })
  const created = await createRes.json()
  if (!created.id) throw new Error('Error al crear perfil de visitante')

  // ── 3. Upsert profile row (trigger may not fire synchronously) ──
  const admin = createAdminClient()
  await admin.from('profiles').upsert({
    id:        created.id,
    full_name: fullName,
    phone:     phone ?? null,
    rut:       rut ?? null,
    role:      'POSTULANTE',
    plan:      'free',
    subscription_status: 'inactive',
    max_agents: 0,
  }, { onConflict: 'id' })

  return created.id as string
}

/**
 * POST /api/public/visit-request
 * Creates an anonymous visit request that surfaces in the subscriber's CRM
 * "Panel de Visitas" as a pending visit.
 */
export async function POST(req: NextRequest) {
  try {
    const { propertyId, fullName, rut, email, phone, date, time, message } = await req.json()

    if (!propertyId || !fullName || !email || !date || !time) {
      return NextResponse.json({ error: 'Nombre, email, fecha y hora son obligatorios' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Get property to resolve subscriber_id
    const { data: property } = await admin
      .from('properties')
      .select('id, subscriber_id')
      .eq('id', propertyId)
      .single()

    if (!property) return NextResponse.json({ error: 'Propiedad no encontrada' }, { status: 404 })

    const visitorId = await findOrCreatePostulante(email, fullName, phone ?? null, rut ?? null)

    const scheduledAt = toChileDatetime(date, time)

    const { error } = await admin.from('visits').insert({
      property_id:   propertyId,
      visitor_id:    visitorId,
      subscriber_id: property.subscriber_id,
      scheduled_at:  scheduledAt,
      status:        'pending',
      notes:         [
        `Nombre: ${fullName}`,
        rut   ? `RUT: ${rut}`     : null,
        `Email: ${email}`,
        phone ? `Tel: ${phone}`   : null,
        message ? `Mensaje: ${message}` : null,
      ].filter(Boolean).join('\n'),
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('public/visit-request error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
