import { NextRequest, NextResponse } from 'next/server'
import { getUserProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const profile = await getUserProfile()
  if (!profile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { propietario_id, property_id } = await request.json()
  if (!propietario_id && !property_id) {
    return NextResponse.json({ error: 'propietario_id o property_id requerido' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Find the active claim — by property_id when available, else by propietario_id
  let claimQuery = admin
    .from('red_canjes_claims')
    .select('id, subscriber_id, claimed_by_user_id, property_id, propietario_id, original_subscriber_id')
    .eq('status', 'active')

  if (property_id) {
    claimQuery = claimQuery.eq('property_id', property_id)
  } else {
    claimQuery = claimQuery.eq('propietario_id', propietario_id).is('property_id', null)
  }

  const { data: claim } = await claimQuery.maybeSingle()

  if (!claim) {
    return NextResponse.json({ error: 'No existe una gestión activa para este propietario' }, { status: 404 })
  }

  // Only the subscriber org or SUPERADMINBOSS can release
  const subscriberId = profile.subscriber_id || profile.id
  const canRelease =
    profile.role === 'SUPERADMINBOSS' ||
    claim.subscriber_id === subscriberId ||
    claim.claimed_by_user_id === profile.id

  if (!canRelease) {
    return NextResponse.json({ error: 'No tienes permisos para liberar esta gestión' }, { status: 403 })
  }

  // Mark claim as released
  const { error } = await admin
    .from('red_canjes_claims')
    .update({ status: 'released', released_at: new Date().toISOString() })
    .eq('id', claim.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Restore the property's original subscriber_id so it leaves the claimant's panel.
  // If original_subscriber_id is null (claim created before migration 036), fall back
  // to the propietario's own subscriber_id — never blindly set null.
  if (claim.property_id) {
    let restoreSubscriberId: string | null = claim.original_subscriber_id ?? null

    if (!restoreSubscriberId && claim.propietario_id) {
      const { data: propietario } = await admin
        .from('profiles')
        .select('subscriber_id')
        .eq('id', claim.propietario_id)
        .single()
      restoreSubscriberId = propietario?.subscriber_id ?? null
    }

    await admin
      .from('properties')
      .update({ subscriber_id: restoreSubscriberId })
      .eq('id', claim.property_id)
  }

  return NextResponse.json({ success: true })
}
