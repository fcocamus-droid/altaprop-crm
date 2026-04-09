import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function findOrCreatePostulante(
  email: string,
  fullName: string,
  phone: string | null,
  rut: string | null,
) {
  const listRes = await fetch(
    `${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}&page=1&per_page=1`,
    { headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY } },
  )
  const listData = await listRes.json()
  const existing = listData.users?.[0]

  if (existing) return existing.id as string

  const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, email_confirm: true, user_metadata: { full_name: fullName } }),
  })
  const created = await createRes.json()
  if (!created.id) throw new Error('Error al crear perfil de postulante')

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
 * POST /api/public/apply
 * Creates an anonymous application that surfaces in the subscriber's CRM
 * "Panel de Postulaciones" as a pending application.
 */
export async function POST(req: NextRequest) {
  try {
    const { propertyId, fullName, rut, email, phone, message } = await req.json()

    if (!propertyId || !fullName || !email) {
      return NextResponse.json({ error: 'Nombre y email son obligatorios' }, { status: 400 })
    }

    const admin = createAdminClient()

    const applicantId = await findOrCreatePostulante(email, fullName, phone ?? null, rut ?? null)

    // Prevent duplicate application for same person + property
    const { data: existing } = await admin
      .from('applications')
      .select('id')
      .eq('property_id', propertyId)
      .eq('applicant_id', applicantId)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'Ya tienes una postulación activa para esta propiedad' }, { status: 409 })
    }

    const { error } = await admin.from('applications').insert({
      property_id:  propertyId,
      applicant_id: applicantId,
      status:       'pending',
      message:      [
        message ? message : null,
        `Teléfono: ${phone || 'no indicado'}`,
        rut ? `RUT: ${rut}` : null,
      ].filter(Boolean).join('\n') || null,
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('public/apply error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
