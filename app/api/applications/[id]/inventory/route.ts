import { NextResponse } from 'next/server'
import { getUserProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

const ALLOWED_ROLES = ['SUPERADMINBOSS', 'SUPERADMIN', 'AGENTE', 'PROPIETARIO', 'POSTULANTE']

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const profile = await getUserProfile()
  if (!profile || !ALLOWED_ROLES.includes(profile.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const admin = createAdminClient()
  const applicationId = params.id

  // Verify user has access to this application
  const { data: application } = await admin
    .from('applications')
    .select('id, applicant_id, property_id, status, property:properties(id, title, address, owner_id), applicant:profiles!applications_applicant_id_fkey(id, full_name)')
    .eq('id', applicationId)
    .single()

  if (!application) {
    return NextResponse.json({ error: 'Postulación no encontrada' }, { status: 404 })
  }

  // Authorization check
  const isApplicant = profile.id === application.applicant_id
  const isOwner = profile.id === (application.property as any)?.owner_id
  const isAdmin = ['SUPERADMINBOSS', 'SUPERADMIN', 'AGENTE'].includes(profile.role)

  if (!isApplicant && !isOwner && !isAdmin) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  // Get inventory
  const { data: inventory } = await admin
    .from('property_inventories')
    .select('*')
    .eq('application_id', applicationId)
    .maybeSingle()

  return NextResponse.json({
    inventory: inventory || null,
    application: {
      id: application.id,
      property_id: application.property_id,
      property_title: (application.property as any)?.title,
      property_address: (application.property as any)?.address,
      applicant_name: (application.applicant as any)?.full_name,
      status: application.status,
    },
  })
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const profile = await getUserProfile()
  if (!profile || !ALLOWED_ROLES.includes(profile.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const admin = createAdminClient()
  const applicationId = params.id
  const body = await req.json()

  // Verify access
  const { data: application } = await admin
    .from('applications')
    .select('id, applicant_id, property_id, property:properties(owner_id)')
    .eq('id', applicationId)
    .single()

  if (!application) {
    return NextResponse.json({ error: 'Postulación no encontrada' }, { status: 404 })
  }

  const isApplicant = profile.id === application.applicant_id
  const isOwner = profile.id === (application.property as any)?.owner_id
  const isAdmin = ['SUPERADMINBOSS', 'SUPERADMIN', 'AGENTE'].includes(profile.role)

  if (!isApplicant && !isOwner && !isAdmin) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  // Build update payload based on role
  let updatePayload: Record<string, any> = { updated_at: new Date().toISOString() }

  if (isAdmin) {
    // Full edit rights
    const fullFields = [
      'estado_general', 'instalaciones', 'equipamiento',
      'medidor_electricidad', 'medidor_agua', 'medidor_gas',
      'llaves_cantidad', 'llaves_detalle', 'observaciones', 'status',
      'firma_arrendador', 'firma_arrendatario', 'firma_altaprop',
    ]
    fullFields.forEach(f => { if (f in body) updatePayload[f] = body[f] })
  } else if (isOwner) {
    // Owner can only sign as arrendador
    if ('firma_arrendador' in body) updatePayload.firma_arrendador = body.firma_arrendador
  } else if (isApplicant) {
    // Applicant can only sign as arrendatario
    if ('firma_arrendatario' in body) updatePayload.firma_arrendatario = body.firma_arrendatario
  }

  // Check if inventory exists
  const { data: existing } = await admin
    .from('property_inventories')
    .select('id')
    .eq('application_id', applicationId)
    .maybeSingle()

  if (existing) {
    const { error } = await admin
      .from('property_inventories')
      .update(updatePayload)
      .eq('id', existing.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    if (!isAdmin) {
      return NextResponse.json({ error: 'Solo admin puede crear el inventario' }, { status: 403 })
    }
    const { error } = await admin
      .from('property_inventories')
      .insert({
        application_id: applicationId,
        property_id: application.property_id,
        created_by: profile.id,
        ...updatePayload,
      })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
