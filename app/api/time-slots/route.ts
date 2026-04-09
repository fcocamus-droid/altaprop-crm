import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const propertyId = searchParams.get('propertyId')
  const date = searchParams.get('date')
  const month = searchParams.get('month') // YYYY-MM format for blocked days

  if (!propertyId) return NextResponse.json({ slots: [], blockedDays: [] })

  const admin = createAdminClient()

  // Get blocked days for the month
  let blockedDays: string[] = []
  if (month) {
    const startDate = `${month}-01`
    const [y, m] = month.split('-').map(Number)
    const endDate = `${y}-${String(m).padStart(2, '0')}-${new Date(y, m, 0).getDate()}`
    const { data: days } = await admin
      .from('visit_blocked_days')
      .select('date')
      .eq('property_id', propertyId)
      .gte('date', startDate)
      .lte('date', endDate)
    blockedDays = (days || []).map(d => d.date)
  }

  // Get time slots for specific date
  let slots: any[] = []
  if (date) {
    const { data } = await admin
      .from('visit_time_slots')
      .select('*')
      .eq('property_id', propertyId)
      .eq('date', date)
    slots = data || []
  }

  return NextResponse.json({ slots, blockedDays })
}
