import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getChileDayBoundsISO } from '@/lib/utils/chile-datetime'

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

  // Get existing visits for this Chile calendar day (using proper UTC bounds)
  const { start: dayStart, end: dayEnd } = getChileDayBoundsISO(date)
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

  // Extract booked times in Chile timezone (server runs UTC, so getHours() would be wrong)
  const bookedTimes = new Set((visits || []).map(v => {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'America/Santiago',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(new Date(v.scheduled_at)).substring(0, 5)
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
