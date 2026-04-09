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

  let { data, error } = await query

  // Fallback: if website_visible column doesn't exist yet, retry without it
  if (error) {
    let fallback = supabase
      .from('properties')
      .select('id, title, city, sector, status, operation, price, currency, images:property_images(url)')
      .order('created_at', { ascending: false })
    if (subscriberId) fallback = fallback.eq('subscriber_id', subscriberId)
    const res = await fallback
    data = (res.data || []).map((p: any) => ({ ...p, website_visible: true }))
    error = res.error
  }

  if (error) return NextResponse.json([], { status: 500 })

  return NextResponse.json(data || [])
}
