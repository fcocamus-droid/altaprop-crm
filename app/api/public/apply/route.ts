import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { findOrCreatePostulante } from '@/lib/actions/guest-profile'

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
