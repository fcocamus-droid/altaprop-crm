export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getUserProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { ROLES } from '@/lib/constants'

type RangeKey = 'today' | 'week' | 'month'

function rangeStart(range: RangeKey): Date {
  const now = new Date()
  const d = new Date(now)
  if (range === 'today') {
    d.setHours(0, 0, 0, 0)
  } else if (range === 'week') {
    d.setDate(d.getDate() - 7)
  } else {
    d.setDate(d.getDate() - 30)
  }
  return d
}

// GET /api/conversations/stats?range=today|week|month
export async function GET(req: Request) {
  const profile = await getUserProfile()
  if (!profile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const range = (searchParams.get('range') || 'week') as RangeKey
  const since = rangeStart(range).toISOString()

  const admin = createAdminClient()

  // Scope: Boss sees all, subscribers see their own, agents see what they own
  let convQ = admin
    .from('conversations')
    .select('id, status, ai_enabled, subscriber_id, agent_id, contact_email, prospecto_id, created_at')
    .gte('created_at', since)

  if (profile.role === ROLES.SUPERADMIN) {
    convQ = convQ.eq('subscriber_id', profile.subscriber_id || profile.id)
  } else if (profile.role === ROLES.AGENTE) {
    if (profile.subscriber_id) {
      convQ = convQ.or(`subscriber_id.eq.${profile.subscriber_id},agent_id.eq.${profile.id}`)
    } else {
      convQ = convQ.eq('agent_id', profile.id)
    }
  } else if (profile.role !== ROLES.SUPERADMINBOSS) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { data: convs, error } = await convQ
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const conversations = convs || []

  // Aggregate counts
  const total = conversations.length
  const byStatus: Record<string, number> = {}
  for (const c of conversations) byStatus[c.status] = (byStatus[c.status] || 0) + 1
  const conversions = conversations.filter(c => c.prospecto_id).length
  const captured = conversations.filter(c => c.contact_email).length
  const captureRate = total > 0 ? Math.round((captured / total) * 100) : 0
  const conversionRate = total > 0 ? Math.round((conversions / total) * 100) : 0

  // Messages stats — pull only sender_type counts for the period
  const convIds = conversations.map(c => c.id)
  let bySender = { ai: 0, agent: 0, contact: 0, system: 0 }
  if (convIds.length) {
    const { data: msgs } = await admin
      .from('messages')
      .select('sender_type, conversation_id')
      .in('conversation_id', convIds)
    for (const m of msgs || []) {
      const k = (m.sender_type as keyof typeof bySender) || 'contact'
      if (k in bySender) bySender[k]++
    }
  }

  // Daily count for chart (last 7 or 30 days)
  const days = range === 'month' ? 30 : range === 'today' ? 1 : 7
  const byDay: { date: string; count: number }[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const start = d.toISOString().slice(0, 10)
    const count = conversations.filter(c => (c.created_at || '').slice(0, 10) === start).length
    byDay.push({ date: start, count })
  }

  // Per-subscriber breakdown (Boss only)
  let perSubscriber: { subscriber_id: string | null; name: string | null; count: number; conversions: number }[] = []
  if (profile.role === ROLES.SUPERADMINBOSS) {
    const subIds = Array.from(new Set(conversations.map(c => c.subscriber_id).filter((x): x is string => !!x)))
    let nameMap = new Map<string, string>()
    if (subIds.length) {
      const { data: profiles } = await admin
        .from('profiles')
        .select('id, full_name')
        .in('id', subIds)
      ;(profiles || []).forEach(p => nameMap.set(p.id, p.full_name || ''))
    }
    const counts = new Map<string | null, { count: number; conversions: number }>()
    for (const c of conversations) {
      const key = c.subscriber_id || null
      const cur = counts.get(key) || { count: 0, conversions: 0 }
      cur.count++
      if (c.prospecto_id) cur.conversions++
      counts.set(key, cur)
    }
    perSubscriber = Array.from(counts.entries()).map(([id, v]) => ({
      subscriber_id: id,
      name: id ? nameMap.get(id) || null : null,
      count: v.count,
      conversions: v.conversions,
    }))
    perSubscriber.sort((a, b) => b.count - a.count)
  }

  return NextResponse.json({
    range,
    total,
    byStatus,
    bySender,
    conversions,
    conversionRate,
    captured,
    captureRate,
    byDay,
    perSubscriber,
  })
}
