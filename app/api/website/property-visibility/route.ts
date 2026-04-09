import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, id, subscriber_id')
    .eq('id', user.id)
    .single()

  if (!profile || !['SUPERADMIN', 'SUPERADMINBOSS'].includes(profile.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const body = await request.json()
  const { property_id, website_visible } = body

  if (!property_id || typeof website_visible !== 'boolean') {
    return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 })
  }

  // Verify property belongs to this subscriber
  const subscriberId = profile.role === 'SUPERADMIN'
    ? (profile.subscriber_id || profile.id)
    : null // SUPERADMINBOSS can update any

  let query = supabase
    .from('properties')
    .update({ website_visible } as any)
    .eq('id', property_id)

  if (subscriberId) {
    query = query.eq('subscriber_id', subscriberId)
  }

  const { error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
