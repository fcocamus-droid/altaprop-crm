import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
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

  const subscriberId = profile.role === 'SUPERADMIN'
    ? (profile.subscriber_id || profile.id)
    : null

  let query = supabase
    .from('properties')
    .select('id, title, city, sector, status, operation, price, currency, website_visible, images:property_images(url)')
    .order('created_at', { ascending: false })

  if (subscriberId) {
    query = query.eq('subscriber_id', subscriberId)
  }

  const { data, error } = await query
  if (error) return NextResponse.json([], { status: 500 })

  return NextResponse.json(data || [])
}
