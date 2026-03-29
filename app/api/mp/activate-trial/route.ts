import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PLANS } from '@/lib/constants'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { planId } = await request.json()
  const plan = PLANS.find(p => p.id === planId)
  if (!plan || !plan.trial) {
    return NextResponse.json({ error: 'Plan no valido para trial' }, { status: 400 })
  }

  const trialEndsAt = new Date()
  trialEndsAt.setDate(trialEndsAt.getDate() + (plan.trialDays || 7))

  const { error } = await supabase.from('profiles').update({
    plan: plan.id,
    subscription_status: 'trialing',
    trial_ends_at: trialEndsAt.toISOString(),
    max_agents: plan.agents,
  }).eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message })
  return NextResponse.json({ success: true })
}
