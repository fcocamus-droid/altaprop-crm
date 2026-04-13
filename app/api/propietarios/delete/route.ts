import { createClient } from '@supabase/supabase-js'
import { getUserProfile } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(request: NextRequest) {
  const profile = await getUserProfile()
  if (!profile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  if (
    profile.role !== 'SUPERADMIN' &&
    profile.role !== 'SUPERADMINBOSS' &&
    profile.role !== 'AGENTE'
  ) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { propietarioId } = await request.json()
  if (!propietarioId) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Safety check: propietario must have no linked properties
  const { data: props } = await admin
    .from('properties')
    .select('id')
    .eq('owner_id', propietarioId)
    .limit(1)

  if (props && props.length > 0) {
    return NextResponse.json(
      { error: 'El propietario tiene propiedades vinculadas. Desvinculalas primero.' },
      { status: 400 }
    )
  }

  // Delete auth user (cascades to profile via DB trigger/FK)
  const { error } = await admin.auth.admin.deleteUser(propietarioId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
