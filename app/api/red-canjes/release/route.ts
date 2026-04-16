import { NextRequest, NextResponse } from 'next/server'
import { getUserProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const profile = await getUserProfile()
  if (!profile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { propietario_id } = await request.json()
  if (!propietario_id) return NextResponse.json({ error: 'propietario_id requerido' }, { status: 400 })

  const admin = createAdminClient()

  // Find the active claim
  const { data: claim } = await admin
    .from('red_canjes_claims')
    .select('id, subscriber_id, claimed_by_user_id')
    .eq('propietario_id', propietario_id)
    .eq('status', 'active')
    .maybeSingle()

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

  const { error } = await admin
    .from('red_canjes_claims')
    .update({ status: 'released', released_at: new Date().toISOString() })
    .eq('id', claim.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
