import { createClient } from '@supabase/supabase-js'
import { getUserProfile } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const profile = await getUserProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const allowedRoles = ['SUPERADMINBOSS', 'SUPERADMIN', 'AGENTE']
  if (!allowedRoles.includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { propietarioId, propertyId } = await req.json()
  if (!propietarioId || !propertyId) {
    return NextResponse.json({ error: 'Missing propietarioId or propertyId' }, { status: 400 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return NextResponse.json({ error: 'Missing env' }, { status: 500 })

  try {
    const admin = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Verify the propietario exists and has role PROPIETARIO
    const { data: propietario } = await admin
      .from('profiles')
      .select('id, role, subscriber_id')
      .eq('id', propietarioId)
      .eq('role', 'PROPIETARIO')
      .single()

    if (!propietario) return NextResponse.json({ error: 'Propietario not found' }, { status: 404 })

    // Verify property belongs to same org (for SUPERADMIN/AGENTE)
    if (profile.role !== 'SUPERADMINBOSS') {
      const subscriberId = profile.subscriber_id || profile.id
      const { data: prop } = await admin
        .from('properties')
        .select('id, subscriber_id')
        .eq('id', propertyId)
        .eq('subscriber_id', subscriberId)
        .single()
      if (!prop) return NextResponse.json({ error: 'Property not found in your organization' }, { status: 404 })
    }

    // Update the property's owner_id to the propietario
    const { error } = await admin
      .from('properties')
      .update({ owner_id: propietarioId })
      .eq('id', propertyId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
