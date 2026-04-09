import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    const { propertyId, fullName, rut, email, phone, date, time, message } = await request.json()

    if (!propertyId || !fullName || !email) {
      return NextResponse.json({ error: 'Nombre y email son obligatorios' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Get org_id from cookie or from the property itself
    const cookieStore = cookies()
    let orgId = cookieStore.get('x-org-id')?.value || null
    if (!orgId) {
      const { data: prop } = await admin.from('properties').select('org_id').eq('id', propertyId).single()
      orgId = prop?.org_id || null
    }

    // Create or find prospect (scoped to org)
    let query = admin.from('prospects').select('id').eq('email', email)
    if (orgId) query = query.eq('org_id', orgId)
    const { data: existingProspect } = await query.single()

    let prospectId: string

    if (existingProspect) {
      prospectId = existingProspect.id
      await admin.from('prospects').update({
        full_name: fullName,
        rut: rut || null,
        phone: phone || null,
      }).eq('id', prospectId)
    } else {
      const { data: newProspect, error: prospectError } = await admin
        .from('prospects')
        .insert({
          full_name: fullName,
          rut: rut || null,
          email,
          phone: phone || null,
          source: 'visit_request',
          org_id: orgId,
        })
        .select('id')
        .single()

      if (prospectError) {
        return NextResponse.json({ error: 'Error al crear prospecto' }, { status: 500 })
      }
      prospectId = newProspect.id
    }

    // Create visit request
    const { error } = await admin.from('visit_requests').insert({
      property_id: propertyId,
      prospect_id: prospectId,
      preferred_date: date || null,
      preferred_time: time || null,
      message: message || null,
      status: 'pending',
      org_id: orgId,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
