export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getUserProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { ROLES } from '@/lib/constants'

function getScopeId(profile: any): string | null {
  if (profile.role === ROLES.SUPERADMIN) return profile.id
  if (profile.role === ROLES.AGENTE)     return profile.subscriber_id
  if (profile.role === ROLES.SUPERADMINBOSS) return profile.id
  return null
}

// GET — AI config for current user's subscriber
export async function GET() {
  const profile = await getUserProfile()
  if (!profile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const id = getScopeId(profile)
  if (!id) return NextResponse.json({ error: 'Sin subscriber_id' }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin.from('ai_configs').select('*').eq('subscriber_id', id).maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Default config if none exists yet
  if (!data) {
    const defaults = {
      subscriber_id: id,
      enabled: true,
      persona_name: 'Sofía',
      greeting: '¡Hola! Soy Sofía, asistente virtual. ¿En qué te puedo ayudar?',
      system_prompt: null,
      handoff_keywords: ['humano','persona real','agente','operador'],
      timezone: 'America/Santiago',
    }
    return NextResponse.json({ config: defaults, is_default: true })
  }
  return NextResponse.json({ config: data, is_default: false })
}

// PATCH — upsert AI config
export async function PATCH(req: Request) {
  const profile = await getUserProfile()
  if (!profile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (![ROLES.SUPERADMIN, ROLES.SUPERADMINBOSS].includes(profile.role as any)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  const id = getScopeId(profile)
  if (!id) return NextResponse.json({ error: 'Sin subscriber_id' }, { status: 400 })

  const body = await req.json()
  const admin = createAdminClient()

  const upsert = {
    subscriber_id: id,
    enabled: body.enabled ?? true,
    persona_name: body.persona_name || 'Sofía',
    greeting: body.greeting || '¡Hola! Soy Sofía, asistente virtual.',
    system_prompt: body.system_prompt || null,
    handoff_keywords: body.handoff_keywords || ['humano','persona real','agente','operador'],
    timezone: body.timezone || 'America/Santiago',
  }

  const { data, error } = await admin
    .from('ai_configs')
    .upsert(upsert, { onConflict: 'subscriber_id' })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ config: data })
}
