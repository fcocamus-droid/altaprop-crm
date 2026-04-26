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
      business_hours: { mon:[9,19], tue:[9,19], wed:[9,19], thu:[9,19], fri:[9,19], sat:[10,14] },
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

  const personaName = String(body.persona_name || '').trim() || 'Sofía'
  const greeting = String(body.greeting || '').trim() || '¡Hola! Soy Sofía, asistente virtual.'
  const systemPrompt = body.system_prompt ? String(body.system_prompt).trim() : null

  if (personaName.length > 50) {
    return NextResponse.json({ error: 'Nombre de persona demasiado largo (máx 50 caracteres)' }, { status: 400 })
  }
  if (greeting.length > 500) {
    return NextResponse.json({ error: 'Saludo demasiado largo (máx 500 caracteres)' }, { status: 400 })
  }
  if (systemPrompt && systemPrompt.length > 4000) {
    return NextResponse.json({ error: 'Prompt personalizado demasiado largo (máx 4000 caracteres)' }, { status: 400 })
  }

  const handoffKeywords: string[] = Array.isArray(body.handoff_keywords)
    ? body.handoff_keywords.map((k: any) => String(k).trim()).filter(Boolean)
    : ['humano','persona real','agente','operador']

  const businessHours = (body.business_hours && typeof body.business_hours === 'object')
    ? body.business_hours
    : { mon:[9,19], tue:[9,19], wed:[9,19], thu:[9,19], fri:[9,19], sat:[10,14] }

  const admin = createAdminClient()

  const upsert = {
    subscriber_id: id,
    enabled: body.enabled !== false,
    persona_name: personaName,
    greeting,
    system_prompt: systemPrompt,
    business_hours: businessHours,
    handoff_keywords: handoffKeywords,
    timezone: String(body.timezone || 'America/Santiago').trim() || 'America/Santiago',
  }

  const { data, error } = await admin
    .from('ai_configs')
    .upsert(upsert, { onConflict: 'subscriber_id' })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ config: data })
}
