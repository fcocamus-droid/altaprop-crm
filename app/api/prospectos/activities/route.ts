export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getUserProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { ROLES } from '@/lib/constants'

// ── GET activities for a prospecto ───────────────────────────────────────────
export async function GET(req: Request) {
  const profile = await getUserProfile()
  if (!profile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const url = new URL(req.url)
  const prospectoId = url.searchParams.get('prospectoId')
  if (!prospectoId) return NextResponse.json({ error: 'prospectoId requerido' }, { status: 400 })

  const admin = createAdminClient()

  // Verify access via prospecto
  const { data: pros } = await admin
    .from('prospectos').select('subscriber_id, agent_id').eq('id', prospectoId).single()
  if (!pros) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const isBoss = profile.role === ROLES.SUPERADMINBOSS
  const isSuperAdminOwner = profile.role === ROLES.SUPERADMIN &&
    pros.subscriber_id === (profile.subscriber_id || profile.id)
  const isAgentOwner = profile.role === ROLES.AGENTE &&
    (pros.agent_id === profile.id || pros.subscriber_id === profile.subscriber_id)
  if (!isBoss && !isSuperAdminOwner && !isAgentOwner) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  // Sort: important first, then tasks not done, then newest
  const { data, error } = await admin
    .from('prospecto_activities')
    .select('*')
    .eq('prospecto_id', prospectoId)
    .order('is_important', { ascending: false })
    .order('is_completed', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}


// ── POST: create activity/task ───────────────────────────────────────────────
export async function POST(req: Request) {
  const profile = await getUserProfile()
  if (!profile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (![ROLES.SUPERADMINBOSS, ROLES.SUPERADMIN, ROLES.AGENTE].includes(profile.role as any)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const body = await req.json()
  if (!body.prospectoId || !body.content) {
    return NextResponse.json({ error: 'Datos requeridos' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: pros } = await admin
    .from('prospectos').select('subscriber_id').eq('id', body.prospectoId).single()
  if (!pros) return NextResponse.json({ error: 'Prospecto no encontrado' }, { status: 404 })

  const insert = {
    prospecto_id: body.prospectoId,
    agent_id: profile.id,
    agent_name: profile.full_name || 'Agente',
    subscriber_id: pros.subscriber_id,
    type: body.type || 'nota',
    content: body.content.trim().substring(0, 2000),
    is_important: !!body.is_important,
    is_completed: false,
    due_at: body.due_at || null,
  }

  const { data, error } = await admin
    .from('prospecto_activities')
    .insert(insert)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Update prospecto's last_contact_at if this is a meaningful touch
  if (['llamada', 'email', 'reunion', 'whatsapp', 'visita'].includes(insert.type)) {
    await admin.from('prospectos')
      .update({ last_contact_at: new Date().toISOString() })
      .eq('id', body.prospectoId)
  }

  return NextResponse.json({ success: true, activity: data })
}


// ── PATCH: update activity (toggle completion, edit) ─────────────────────────
export async function PATCH(req: Request) {
  const profile = await getUserProfile()
  if (!profile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  if (!body.id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })

  const admin = createAdminClient()
  const updates: Record<string, any> = {}
  if ('is_important' in body)  updates.is_important  = !!body.is_important
  if ('is_completed' in body)  updates.is_completed  = !!body.is_completed
  if ('content' in body)       updates.content       = body.content.substring(0, 2000)
  if ('due_at' in body)        updates.due_at        = body.due_at || null

  const { data, error } = await admin
    .from('prospecto_activities')
    .update(updates)
    .eq('id', body.id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, activity: data })
}


// ── DELETE: remove activity ──────────────────────────────────────────────────
export async function DELETE(req: Request) {
  const profile = await getUserProfile()
  if (!profile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  if (!body.id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin.from('prospecto_activities').delete().eq('id', body.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
