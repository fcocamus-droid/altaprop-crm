import { NextRequest, NextResponse } from 'next/server'
import { getUserProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const profile = await getUserProfile()
  if (!profile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const allowedRoles = ['SUPERADMIN', 'AGENTE', 'SUPERADMINBOSS']
  if (!allowedRoles.includes(profile.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { propietario_id, property_id, notes } = await request.json()
  if (!propietario_id) return NextResponse.json({ error: 'propietario_id requerido' }, { status: 400 })

  const admin = createAdminClient()

  // Determine subscriber_id: SUPERADMIN uses their own org, AGENTE uses their org
  const subscriberId = profile.subscriber_id || profile.id
  // SUPERADMINBOSS also gets a subscriber_id = their own id for tracking
  const effectiveSubscriberId = profile.role === 'SUPERADMINBOSS' ? profile.id : subscriberId

  // Get subscriber name for display
  let subscriberName = profile.full_name || 'Sin nombre'
  if (profile.role === 'AGENTE' && profile.subscriber_id) {
    const { data: sub } = await admin.from('profiles').select('full_name').eq('id', profile.subscriber_id).single()
    if (sub?.full_name) subscriberName = sub.full_name
  }

  // Check if there's already an active claim — per property_id if provided, else per propietario_id
  let existingQuery = admin
    .from('red_canjes_claims')
    .select('id, subscriber_name, claimed_by_name, expires_at')
    .eq('status', 'active')

  if (property_id) {
    existingQuery = existingQuery.eq('property_id', property_id)
  } else {
    existingQuery = existingQuery.eq('propietario_id', propietario_id).is('property_id', null)
  }

  const { data: existing } = await existingQuery.maybeSingle()

  if (existing) {
    if (new Date(existing.expires_at) < new Date()) {
      await admin.from('red_canjes_claims').update({ status: 'expired' }).eq('id', existing.id)
    } else {
      return NextResponse.json({
        error: `Esta propiedad ya está siendo gestionada por ${existing.subscriber_name || existing.claimed_by_name || 'otra organización'}.`,
        alreadyClaimed: true,
        claimedBy: existing.subscriber_name || existing.claimed_by_name,
        expiresAt: existing.expires_at,
      }, { status: 409 })
    }
  }

  // Read the property's current subscriber_id so we can restore it on release/expire
  let originalSubscriberId: string | null = null
  if (property_id) {
    const { data: prop } = await admin
      .from('properties')
      .select('subscriber_id')
      .eq('id', property_id)
      .single()
    originalSubscriberId = prop?.subscriber_id ?? null
  }

  // Insert new claim (storing original_subscriber_id for later restoration)
  const { data, error } = await admin
    .from('red_canjes_claims')
    .insert({
      propietario_id,
      property_id: property_id || null,
      subscriber_id: effectiveSubscriberId,
      claimed_by_user_id: profile.id,
      claimed_by_name: profile.full_name || '',
      subscriber_name: subscriberName,
      notes: notes || null,
      status: 'active',
      original_subscriber_id: originalSubscriberId,
    })
    .select()
    .single()

  if (error) {
    // Unique constraint violation means another claim was just created concurrently
    if (error.code === '23505') {
      return NextResponse.json({
        error: 'Este propietario acaba de ser tomado por otra organización.',
        alreadyClaimed: true,
      }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Transfer the property into the claimant's subscriber org so it appears in their panel
  if (property_id) {
    await admin
      .from('properties')
      .update({ subscriber_id: effectiveSubscriberId })
      .eq('id', property_id)
  }

  return NextResponse.json({ success: true, claim: data })
}
