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
  const search  = (searchParams.get('q') || '').trim()

  const admin = createAdminClient()

  // If we have a search term, look up matching message conversations first
  // so we can OR them with contact-field matches in the main query.
  let messageMatchIds: string[] | null = null
  if (search) {
    const { data: msgs } = await admin
      .from('messages')
      .select('conversation_id')
      .ilike('content', `%${search}%`)
      .limit(500)
    messageMatchIds = Array.from(new Set((msgs || []).map(m => m.conversation_id)))
  }

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
    // Agents see the whole team's pool (subscriber_id matches their team)
    // OR conversations explicitly assigned to them.
    if (profile.subscriber_id) {
      q = q.or(`subscriber_id.eq.${profile.subscriber_id},agent_id.eq.${profile.id}`)
    } else {
      // Agent without a team yet — only shows their explicit assignments
      q = q.eq('agent_id', profile.id)
    }
  } else {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  if (channel) q = q.eq('channel', channel)
  if (status)  q = q.eq('status', status)

  if (search) {
    const like = `%${search}%`
    // Build an OR across contact fields + matched message conv ids
    const orClauses = [
      `contact_name.ilike.${like}`,
      `contact_phone.ilike.${like}`,
      `contact_email.ilike.${like}`,
      `last_message_preview.ilike.${like}`,
    ]
    if (messageMatchIds && messageMatchIds.length > 0) {
      // Limit to avoid PostgREST URL length blowup
      const idsStr = messageMatchIds.slice(0, 200).join(',')
      orClauses.push(`id.in.(${idsStr})`)
    }
    q = q.or(orClauses.join(','))
  }

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
