import { createClient } from '@supabase/supabase-js'
import { getUserProfile } from '@/lib/auth'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const profile = await getUserProfile()
  if (!profile) return NextResponse.json([], { status: 401 })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return NextResponse.json({ error: 'Missing env' }, { status: 500 })

  try {
    const admin = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Determine the subscriber_id to filter by
    let subscriberId: string | null = null
    if (profile.role === 'SUPERADMIN') {
      subscriberId = profile.subscriber_id || profile.id
    } else if (profile.role === 'AGENTE') {
      subscriberId = profile.subscriber_id || null
    } else if (profile.role === 'SUPERADMINBOSS') {
      subscriberId = null // all
    }

    let query = admin
      .from('properties')
      .select('id, title, address, city, sector, status, operation, price, currency, owner_id, images:property_images(url)')
      .is('owner_id', null)   // only unowned properties
      .order('created_at', { ascending: false })

    if (subscriberId) {
      query = query.eq('subscriber_id', subscriberId)
    }

    const { data: properties, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Get owner names (to show who currently owns each property)
    const ownerIds = Array.from(new Set((properties || []).map((p: any) => p.owner_id).filter(Boolean)))
    const ownerMap = new Map<string, string>()
    if (ownerIds.length > 0) {
      const { data: owners } = await admin
        .from('profiles')
        .select('id, full_name, role')
        .in('id', ownerIds)
      if (owners) {
        owners.forEach(o => ownerMap.set(o.id, o.full_name || 'Sin nombre'))
      }
    }

    const result = (properties || []).map(p => ({
      id: p.id,
      title: p.title,
      address: p.address,
      city: p.city,
      sector: p.sector,
      status: p.status,
      operation: p.operation,
      price: p.price,
      currency: p.currency,
      owner_id: p.owner_id,
      owner_name: ownerMap.get(p.owner_id) || '',
      images: p.images,
    }))

    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
