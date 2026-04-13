import { createClient } from '@supabase/supabase-js'
import { getUserProfile } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

const ALLOWED_ROLES = ['SUPERADMIN', 'SUPERADMINBOSS', 'AGENTE']

// GET /api/propietarios/bitacora?propietarioId=xxx
export async function GET(request: NextRequest) {
  const profile = await getUserProfile()
  if (!profile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!ALLOWED_ROLES.includes(profile.role)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const propietarioId = searchParams.get('propietarioId')
  if (!propietarioId) return NextResponse.json({ error: 'propietarioId requerido' }, { status: 400 })

  const admin = adminClient()

  const { data, error } = await admin
    .from('bitacora_gestion')
    .select('id, content, agent_id, agent_name, created_at')
    .eq('propietario_id', propietarioId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

// POST /api/propietarios/bitacora
export async function POST(request: NextRequest) {
  const profile = await getUserProfile()
  if (!profile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!ALLOWED_ROLES.includes(profile.role)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const body = await request.json()
  const { propietarioId, content } = body

  if (!propietarioId) return NextResponse.json({ error: 'propietarioId requerido' }, { status: 400 })
  if (!content || !content.trim()) return NextResponse.json({ error: 'El contenido no puede estar vacío' }, { status: 400 })
  if (content.trim().length > 2000) return NextResponse.json({ error: 'Máximo 2000 caracteres' }, { status: 400 })

  const subscriberId =
    profile.role === 'SUPERADMIN' ? (profile.subscriber_id || profile.id) :
    profile.role === 'AGENTE'     ? (profile.subscriber_id || null) :
    null // SUPERADMINBOSS

  const admin = adminClient()

  const { data, error } = await admin
    .from('bitacora_gestion')
    .insert({
      propietario_id: propietarioId,
      agent_id:       profile.id,
      agent_name:     profile.full_name || 'Agente',
      content:        content.trim(),
      subscriber_id:  subscriberId,
    })
    .select('id, content, agent_id, agent_name, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, entry: data })
}
