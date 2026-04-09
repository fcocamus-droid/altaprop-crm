import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const MIGRATION_SQL =
  'ALTER TABLE properties ADD COLUMN IF NOT EXISTS website_visible BOOLEAN NOT NULL DEFAULT true;'

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

  const subscriberId = profile.role === 'SUPERADMIN'
    ? (profile.subscriber_id || profile.id)
    : null

  let query = supabase
    .from('properties')
    .update({ website_visible } as any)
    .eq('id', property_id)

  if (subscriberId) query = query.eq('subscriber_id', subscriberId)

  const { error } = await query

  if (error) {
    // Detect missing column — migration 028 not applied
    if (error.code === '42703' || error.message?.includes('website_visible')) {
      return NextResponse.json(
        { error: 'column_missing', sql: MIGRATION_SQL },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  revalidatePath('/dashboard/propiedades')
  revalidatePath('/dashboard/mi-sitio')
  return NextResponse.json({ ok: true })
}
