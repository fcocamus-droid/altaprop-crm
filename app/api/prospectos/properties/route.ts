export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getUserProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { ROLES } from '@/lib/constants'

// ── GET: list properties visible to the current user for prospecto selection ──
// Scope:
//   SUPERADMINBOSS → all
//   SUPERADMIN     → their org
//   AGENTE         → their org (same as SUPERADMIN — any property of their agency)
export async function GET() {
  const profile = await getUserProfile()
  if (!profile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (![ROLES.SUPERADMINBOSS, ROLES.SUPERADMIN, ROLES.AGENTE].includes(profile.role as any)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const admin = createAdminClient()

  let q = admin
    .from('properties')
    .select('id, title, address, city, sector, status, operation, price, currency, subscriber_id')
    .order('created_at', { ascending: false })
    .limit(500)

  if (profile.role === ROLES.SUPERADMIN) {
    q = q.eq('subscriber_id', profile.subscriber_id || profile.id)
  } else if (profile.role === ROLES.AGENTE) {
    if (profile.subscriber_id) {
      q = q.eq('subscriber_id', profile.subscriber_id)
    }
  }

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}
