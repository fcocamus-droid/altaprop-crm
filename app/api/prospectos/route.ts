export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getUserProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { ROLES } from '@/lib/constants'

// ── GET: list prospectos for current user (role-filtered) ────────────────────
export async function GET() {
  const profile = await getUserProfile()
  if (!profile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (![ROLES.SUPERADMINBOSS, ROLES.SUPERADMIN, ROLES.AGENTE].includes(profile.role as any)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const admin = createAdminClient()

  let query = admin
    .from('prospectos')
    .select('*')

  if (profile.role === ROLES.SUPERADMIN) {
    const subscriberId = profile.subscriber_id || profile.id
    query = query.eq('subscriber_id', subscriberId)
  } else if (profile.role === ROLES.AGENTE) {
    const subscriberId = profile.subscriber_id
    // Agent sees: anything assigned to them OR unassigned in their org
    if (subscriberId) {
      query = query.or(`agent_id.eq.${profile.id},and(agent_id.is.null,subscriber_id.eq.${subscriberId})`)
    } else {
      query = query.eq('agent_id', profile.id)
    }
  }
  // SUPERADMINBOSS sees all

  // Smart ordering: pinned → open status → overdue tasks → priority → recent
  // We do the full sort in SQL with a large ORDER BY chain
  query = query
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data || data.length === 0) return NextResponse.json([])

  // Fetch agent names
  const agentIds = Array.from(new Set(data.map(p => p.agent_id).filter(Boolean))) as string[]
  const agentMap = new Map<string, string>()
  if (agentIds.length) {
    const { data: agents } = await admin
      .from('profiles').select('id, full_name').in('id', agentIds)
    if (agents) agents.forEach(a => agentMap.set(a.id, a.full_name || 'Sin nombre'))
  }

  // Fetch subscriber names (for SUPERADMINBOSS view)
  const subIds = Array.from(new Set(data.map(p => p.subscriber_id).filter(Boolean))) as string[]
  const subMap = new Map<string, string>()
  if (subIds.length) {
    const { data: subs } = await admin
      .from('profiles').select('id, full_name').in('id', subIds)
    if (subs) subs.forEach(s => subMap.set(s.id, s.full_name || 'Sin nombre'))
  }

  // Count open tasks per prospecto + find most recent activity date
  const ids = data.map(p => p.id)
  const { data: actData } = await admin
    .from('prospecto_activities')
    .select('prospecto_id, type, is_completed, due_at, created_at')
    .in('prospecto_id', ids)

  const openTasksMap = new Map<string, number>()
  const overdueTasksMap = new Map<string, number>()
  const lastActivityMap = new Map<string, string>()
  if (actData) {
    const now = new Date().toISOString()
    for (const a of actData) {
      // last activity
      const prev = lastActivityMap.get(a.prospecto_id)
      if (!prev || a.created_at > prev) lastActivityMap.set(a.prospecto_id, a.created_at)

      // open tasks
      if (a.type === 'tarea' && !a.is_completed) {
        openTasksMap.set(a.prospecto_id, (openTasksMap.get(a.prospecto_id) || 0) + 1)
        if (a.due_at && a.due_at < now) {
          overdueTasksMap.set(a.prospecto_id, (overdueTasksMap.get(a.prospecto_id) || 0) + 1)
        }
      }
    }
  }

  // Fetch property summaries for linked prospectos
  const propertyIds = Array.from(new Set(data.map(p => p.property_id).filter(Boolean))) as string[]
  const propMap = new Map<string, any>()
  if (propertyIds.length) {
    const { data: props } = await admin
      .from('properties')
      .select('id, title, address, city, operation, price, currency, status')
      .in('id', propertyIds)
    if (props) props.forEach(p => propMap.set(p.id, p))
  }

  const enriched = data.map(p => ({
    ...p,
    agent_name: p.agent_id ? agentMap.get(p.agent_id) || '' : '',
    subscriber_name: p.subscriber_id ? subMap.get(p.subscriber_id) || '' : '',
    property: p.property_id ? propMap.get(p.property_id) || null : null,
    open_tasks: openTasksMap.get(p.id) || 0,
    overdue_tasks: overdueTasksMap.get(p.id) || 0,
    last_activity_at: lastActivityMap.get(p.id) || null,
  }))

  // Sort with priority logic:
  //  1) is_pinned
  //  2) status not closed (ganado/perdido at bottom)
  //  3) overdue tasks count desc
  //  4) priority (alta > media > baja)
  //  5) next_action_at asc (soonest first, nulls last)
  //  6) created_at desc
  const priorityOrder: Record<string, number> = { alta: 0, media: 1, baja: 2 }
  const closedStatuses = new Set(['ganado', 'perdido'])
  enriched.sort((a, b) => {
    if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1
    const aClosed = closedStatuses.has(a.status) ? 1 : 0
    const bClosed = closedStatuses.has(b.status) ? 1 : 0
    if (aClosed !== bClosed) return aClosed - bClosed
    if (a.overdue_tasks !== b.overdue_tasks) return b.overdue_tasks - a.overdue_tasks
    const ap = priorityOrder[a.priority] ?? 3
    const bp = priorityOrder[b.priority] ?? 3
    if (ap !== bp) return ap - bp
    const an = a.next_action_at ? new Date(a.next_action_at).getTime() : Infinity
    const bn = b.next_action_at ? new Date(b.next_action_at).getTime() : Infinity
    if (an !== bn) return an - bn
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  return NextResponse.json(enriched)
}


// ── POST: create a new prospecto ─────────────────────────────────────────────
export async function POST(req: Request) {
  const profile = await getUserProfile()
  if (!profile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (![ROLES.SUPERADMINBOSS, ROLES.SUPERADMIN, ROLES.AGENTE].includes(profile.role as any)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const body = await req.json()
  if (!body.full_name) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })

  const admin = createAdminClient()

  // Derive subscriber_id from role
  let subscriberId: string | null = body.subscriber_id || null
  if (profile.role === ROLES.SUPERADMIN) {
    subscriberId = profile.subscriber_id || profile.id
  } else if (profile.role === ROLES.AGENTE) {
    subscriberId = profile.subscriber_id || null
  }
  // SUPERADMINBOSS can pass any subscriber_id (or null for internal leads)

  const insert = {
    subscriber_id: subscriberId,
    agent_id: body.agent_id || (profile.role === ROLES.AGENTE ? profile.id : null),
    created_by: profile.id,
    full_name: body.full_name.trim(),
    company: body.company?.trim() || null,
    rut: body.rut?.trim() || null,
    email: body.email?.trim() || null,
    phone: body.phone?.trim() || null,
    status: body.status || 'nuevo',
    priority: body.priority || 'media',
    source: body.source || null,
    interest: body.interest || null,
    property_type: body.property_type || null,
    budget_min: body.budget_min != null ? Number(body.budget_min) : null,
    budget_max: body.budget_max != null ? Number(body.budget_max) : null,
    budget_currency: body.budget_currency || 'CLP',
    notes: body.notes?.trim() || null,
    next_action_at: body.next_action_at || null,
    next_action_note: body.next_action_note?.trim() || null,
    property_id: body.property_id || null,
    is_pinned: !!body.is_pinned,
  }

  const { data, error } = await admin
    .from('prospectos')
    .insert(insert)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, prospecto: data })
}
