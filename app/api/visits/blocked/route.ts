import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserProfile } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month')
  const year = searchParams.get('year')

  const profile = await getUserProfile()
  if (!profile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const subscriberId = profile.subscriber_id || profile.id
  const supabase = createClient()

  let query = supabase.from('blocked_slots').select('*').eq('subscriber_id', subscriberId)

  if (month && year) {
    const startDate = `${year}-${month.padStart(2, '0')}-01`
    const endDate = `${year}-${month.padStart(2, '0')}-31`
    query = query.gte('blocked_date', startDate).lte('blocked_date', endDate)
  }

  const { data } = await query.order('blocked_date')
  return NextResponse.json({ blocked: data || [] })
}

export async function POST(request: NextRequest) {
  const profile = await getUserProfile()
  if (!profile || (profile.role !== 'SUPERADMINBOSS' && profile.role !== 'SUPERADMIN')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { date, time, fullDay } = await request.json()
  const subscriberId = profile.subscriber_id || profile.id
  const supabase = createClient()

  if (fullDay) {
    // Block entire day - remove individual blocks first
    await supabase.from('blocked_slots').delete().eq('subscriber_id', subscriberId).eq('blocked_date', date)
    await supabase.from('blocked_slots').insert({ subscriber_id: subscriberId, blocked_date: date, full_day: true })
  } else if (time) {
    await supabase.from('blocked_slots').insert({ subscriber_id: subscriberId, blocked_date: date, blocked_time: time + ':00' })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest) {
  const profile = await getUserProfile()
  if (!profile || (profile.role !== 'SUPERADMINBOSS' && profile.role !== 'SUPERADMIN')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')
  const time = searchParams.get('time')
  const subscriberId = profile.subscriber_id || profile.id
  const supabase = createClient()

  if (date && time) {
    await supabase.from('blocked_slots').delete().eq('subscriber_id', subscriberId).eq('blocked_date', date).eq('blocked_time', time + ':00')
  } else if (date) {
    await supabase.from('blocked_slots').delete().eq('subscriber_id', subscriberId).eq('blocked_date', date)
  }

  return NextResponse.json({ success: true })
}
