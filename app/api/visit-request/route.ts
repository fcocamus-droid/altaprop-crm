import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const { propertyId, fullName, rut, email, phone, date, time, message } = await request.json()

    if (!propertyId || !fullName || !email) {
      return NextResponse.json({ error: 'Nombre y email son obligatorios' }, { status: 400 })
    }

    // Basic shape validation — this is a public endpoint.
    if (typeof propertyId !== 'string' || !/^[0-9a-f-]{36}$/i.test(propertyId)) {
      return NextResponse.json({ error: 'Propiedad inválida' }, { status: 400 })
    }
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
    }
    if (typeof fullName !== 'string' || fullName.trim().length < 2 || fullName.length > 120) {
      return NextResponse.json({ error: 'Nombre inválido' }, { status: 400 })
    }

    const admin = createAdminClient()

    // org_id is ALWAYS derived from the property itself. The previous code
    // trusted an x-org-id cookie sent by the client which let an attacker
    // create prospects/visits in arbitrary tenants by spoofing the cookie.
    const { data: prop } = await admin
      .from('properties')
      .select('org_id')
      .eq('id', propertyId)
      .single()
    const orgId: string | null = prop?.org_id || null

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
