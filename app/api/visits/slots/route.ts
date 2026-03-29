import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const propertyId = searchParams.get('propertyId')
  const date = searchParams.get('date')

  if (!propertyId || !date) {
    return NextResponse.json({ error: 'propertyId and date required' }, { status: 400 })
  }

  const supabase = createClient()

  // Get the property's subscriber_id
  const { data: property } = await supabase
    .from('properties')
    .select('subscriber_id')
    .eq('id', propertyId)
    .single()

  if (!property?.subscriber_id) {
    return NextResponse.json({ slots: generateAllSlots() })
  }

  // Get blocked slots for this date
  const { data: blocked } = await supabase
    .from('blocked_slots')
    .select('blocked_time, full_day')
    .eq('subscriber_id', property.subscriber_id)
    .eq('blocked_date', date)

  // Get existing visits for this date on this property
  const dayStart = `${date}T00:00:00`
  const dayEnd = `${date}T23:59:59`
  const { data: visits } = await supabase
    .from('visits')
    .select('scheduled_at')
    .eq('property_id', propertyId)
    .gte('scheduled_at', dayStart)
    .lte('scheduled_at', dayEnd)
    .neq('status', 'canceled')

  const allSlots = generateAllSlots()
  const isFullDayBlocked = blocked?.some(b => b.full_day)

  if (isFullDayBlocked) {
    return NextResponse.json({ slots: allSlots.map(s => ({ ...s, available: false })) })
  }

  const blockedTimes = new Set((blocked || []).map(b => b.blocked_time?.substring(0, 5)))
  const bookedTimes = new Set((visits || []).map(v => {
    const d = new Date(v.scheduled_at)
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }))

  const slots = allSlots.map(slot => ({
    ...slot,
    available: !blockedTimes.has(slot.time) && !bookedTimes.has(slot.time),
  }))

  return NextResponse.json({ slots })
}

function generateAllSlots() {
  const slots = []
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 30]) {
      const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      slots.push({ time, available: true })
    }
  }
  return slots
}
