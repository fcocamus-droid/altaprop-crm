import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const admin = createAdminClient()
    const { error } = await admin
      .from('profiles')
      .update({
        ml_user_id: null,
        ml_access_token: null,
        ml_refresh_token: null,
        ml_token_expires_at: null,
        ml_connected_at: null,
      })
      .eq('id', user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('ML disconnect error:', err)
    return NextResponse.json({ error: 'Error inesperado' }, { status: 500 })
  }
}
