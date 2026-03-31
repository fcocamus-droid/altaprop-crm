import { createClient } from '@supabase/supabase-js'
import { getUserProfile } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const profile = await getUserProfile()
  if (!profile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  if (profile.role !== 'SUPERADMIN' && profile.role !== 'SUPERADMINBOSS' && profile.role !== 'AGENTE') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { email, password, full_name, rut, phone } = await request.json()
  if (!email || !password || !full_name) {
    return NextResponse.json({ error: 'Nombre, email y contraseña son requeridos' }, { status: 400 })
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const subscriberId = profile.role === 'SUPERADMIN' ? (profile.subscriber_id || profile.id) : profile.subscriber_id

  // Create user
  const { data: newUser, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, rut, phone, role: 'PROPIETARIO' },
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Assign subscriber_id
  if (subscriberId) {
    await admin.from('profiles').update({ subscriber_id: subscriberId }).eq('id', newUser.user.id)
  }

  return NextResponse.json({ success: true, userId: newUser.user.id })
}
