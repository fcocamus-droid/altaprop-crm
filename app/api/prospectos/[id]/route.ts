export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getUserProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { ROLES } from '@/lib/constants'

// ── PATCH: update a prospecto ────────────────────────────────────────────────
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const profile = await getUserProfile()
  if (!profile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (![ROLES.SUPERADMINBOSS, ROLES.SUPERADMIN, ROLES.AGENTE].includes(profile.role as any)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const admin = createAdminClient()
  const { data: existing, error: fetchErr } = await admin
    .from('prospectos')
    .select('*')
    .eq('id', params.id)
    .single()

  if (fetchErr || !existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  // Access control
  const isBoss = profile.role === ROLES.SUPERADMINBOSS
  const isSuperAdminOwner = profile.role === ROLES.SUPERADMIN &&
    existing.subscriber_id === (profile.subscriber_id || profile.id)
  const isAgentOwner = profile.role === ROLES.AGENTE &&
    (existing.agent_id === profile.id || existing.subscriber_id === profile.subscriber_id)
  if (!isBoss && !isSuperAdminOwner && !isAgentOwner) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const body = await req.json()
  const updates: Record<string, any> = {}

  const allowedFields = [
    'full_name', 'company', 'rut', 'email', 'phone',
    'status', 'priority', 'source', 'interest', 'property_type',
    'budget_min', 'budget_max', 'budget_currency',
    'notes', 'next_action_at', 'next_action_note', 'last_contact_at',
    'is_pinned', 'agent_id', 'property_id',
  ]

  for (const field of allowedFields) {
    if (field in body) updates[field] = body[field]
  }

  // SUPERADMINBOSS can reassign subscriber_id
  if (isBoss && 'subscriber_id' in body) updates.subscriber_id = body.subscriber_id

  // If status changed to contactado/calificado/etc set last_contact_at
  if (body.status && body.status !== existing.status && body.status !== 'nuevo') {
    updates.last_contact_at = new Date().toISOString()
  }

  const { data, error } = await admin
    .from('prospectos')
    .update(updates)
    .eq('id', params.id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, prospecto: data })
}


// ── DELETE: delete a prospecto (SUPERADMINBOSS / SUPERADMIN only) ────────────
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const profile = await getUserProfile()
  if (!profile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (![ROLES.SUPERADMINBOSS, ROLES.SUPERADMIN].includes(profile.role as any)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const admin = createAdminClient()

  // Scope check for SUPERADMIN
  if (profile.role === ROLES.SUPERADMIN) {
    const { data: existing } = await admin
      .from('prospectos').select('subscriber_id').eq('id', params.id).single()
    if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    if (existing.subscriber_id !== (profile.subscriber_id || profile.id)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }
  }

  const { error } = await admin.from('prospectos').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
