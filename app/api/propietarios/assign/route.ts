import { createClient } from '@supabase/supabase-js'
import { getUserProfile } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const profile = await getUserProfile()
  if (!profile || profile.role !== 'SUPERADMINBOSS') {
    return NextResponse.json({ error: 'Solo SUPERADMINBOSS puede asignar propietarios' }, { status: 403 })
  }

  try {
    const { propietarioId, subscriberId } = await request.json()

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { error } = await admin
      .from('profiles')
      .update({ subscriber_id: subscriberId || null })
      .eq('id', propietarioId)
      .eq('role', 'PROPIETARIO')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
