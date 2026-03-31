import { createClient } from '@supabase/supabase-js'
import { getUserProfile } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const profile = await getUserProfile()
  if (!profile || (profile.role !== 'SUPERADMIN' && profile.role !== 'SUPERADMINBOSS')) {
    return NextResponse.json({ error: 'Solo SUPERADMIN puede asignar agentes' }, { status: 403 })
  }

  const { propietarioId, agentId } = await request.json()

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { error } = await admin
    .from('profiles')
    .update({ agent_id: agentId || null })
    .eq('id', propietarioId)
    .eq('role', 'PROPIETARIO')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
