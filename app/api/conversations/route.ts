export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getUserProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { ROLES } from '@/lib/constants'

// GET — list conversations scoped by role
export async function GET(req: Request) {
  const profile = await getUserProfile()
  if (!profile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const channel = searchParams.get('channel')
  const status  = searchParams.get('status')

  const admin = createAdminClient()
  let q = admin
    .from('conversations')
    .select('*')
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .limit(200)

  // Scope by role
  if (profile.role === ROLES.SUPERADMINBOSS) {
    // sees all
  } else if (profile.role === ROLES.SUPERADMIN) {
    q = q.eq('subscriber_id', profile.subscriber_id || profile.id)
  } else if (profile.role === ROLES.AGENTE) {
    q = q.eq('agent_id', profile.id)
  } else {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  if (channel) q = q.eq('channel', channel)
  if (status)  q = q.eq('status', status)

  const { data: conversations, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Attach subscriber and agent names
  const ids = new Set<string>()
  ;(conversations || []).forEach(c => {
    if (c.subscriber_id) ids.add(c.subscriber_id)
    if (c.agent_id)      ids.add(c.agent_id)
  })
  let nameMap = new Map<string, string>()
  if (ids.size > 0) {
    const { data: profiles } = await admin
      .from('profiles')
      .select('id, full_name')
      .in('id', Array.from(ids))
    ;(profiles || []).forEach(p => nameMap.set(p.id, p.full_name || ''))
  }

  const enriched = (conversations || []).map(c => ({
    ...c,
    subscriber_name: c.subscriber_id ? nameMap.get(c.subscriber_id) || null : null,
    agent_name:      c.agent_id ? nameMap.get(c.agent_id) || null : null,
  }))

  return NextResponse.json({ conversations: enriched })
}
