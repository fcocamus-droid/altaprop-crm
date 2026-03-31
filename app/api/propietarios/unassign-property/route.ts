import { NextResponse } from 'next/server'
import { getUserProfile } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  const profile = await getUserProfile()
  if (!profile || !['SUPERADMINBOSS', 'SUPERADMIN', 'AGENTE'].includes(profile.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { propertyId } = await req.json()
  if (!propertyId) return NextResponse.json({ error: 'propertyId requerido' }, { status: 400 })

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { error } = await admin
    .from('properties')
    .update({ owner_id: null })
    .eq('id', propertyId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
