export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getUserProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { ROLES } from '@/lib/constants'

// GET — list assignable subscribers and agents for the inbox dropdowns.
//   - Boss: returns all subscribers + all agents (grouped by subscriber).
//   - Subscriber: returns only its own agents (no subscribers list).
//   - Agente: forbidden.
export async function GET() {
  const profile = await getUserProfile()
  if (!profile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = createAdminClient()

  if (profile.role === ROLES.SUPERADMINBOSS) {
    const [{ data: subs }, { data: ags }] = await Promise.all([
      admin
        .from('profiles')
        .select('id, full_name, email')
        .eq('role', ROLES.SUPERADMIN)
        .order('full_name', { ascending: true }),
      admin
        .from('profiles')
        .select('id, full_name, email, subscriber_id')
        .eq('role', ROLES.AGENTE)
        .order('full_name', { ascending: true }),
    ])
    return NextResponse.json({
      subscribers: subs || [],
      agents: ags || [],
    })
  }

  if (profile.role === ROLES.SUPERADMIN) {
    const subId = profile.subscriber_id || profile.id
    const { data: ags } = await admin
      .from('profiles')
      .select('id, full_name, email, subscriber_id')
      .eq('role', ROLES.AGENTE)
      .eq('subscriber_id', subId)
      .order('full_name', { ascending: true })
    return NextResponse.json({
      subscribers: [],
      agents: ags || [],
    })
  }

  return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
}
