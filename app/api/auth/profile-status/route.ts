import { getUserProfile } from '@/lib/auth'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const profile = await getUserProfile()
  if (!profile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  return NextResponse.json({
    trialEndsAt: profile.trial_ends_at ?? null,
    subscriptionStatus: profile.subscription_status ?? 'none',
    plan: profile.plan ?? null,
  })
}
