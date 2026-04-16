import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PLANS } from '@/lib/constants'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const planId = searchParams.get('plan')
  const userId = searchParams.get('user')
  // Always redirect to the canonical production domain.
  // Prevents landing on the Vercel preview URL after payment.
  const siteUrl =
    process.env.NODE_ENV === 'development'
      ? (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')
      : 'https://www.altaprop-app.cl'

  if (status === 'success' && planId && userId) {
    const plan = PLANS.find(p => p.id === planId)
    if (plan) {
      const admin = createAdminClient()
      const now = new Date()

      if (plan.trial) {
        const trialEndsAt = new Date(now)
        trialEndsAt.setDate(trialEndsAt.getDate() + (plan.trialDays || 14))

        await admin.from('profiles').update({
          plan: plan.id,
          subscription_status: 'trialing',
          trial_ends_at: trialEndsAt.toISOString(),
          max_agents: plan.agents,
        }).eq('id', userId)
      } else {
        const subscriptionEndsAt = new Date(now)
        subscriptionEndsAt.setMonth(subscriptionEndsAt.getMonth() + 1)

        await admin.from('profiles').update({
          plan: plan.id,
          subscription_status: 'active',
          subscription_ends_at: subscriptionEndsAt.toISOString(),
          max_agents: plan.agents,
        }).eq('id', userId)
      }
    }

    return NextResponse.redirect(`${siteUrl}/dashboard/plan?success=true`)
  }

  if (status === 'failure') {
    return NextResponse.redirect(`${siteUrl}/dashboard/plan?error=payment_failed`)
  }

  return NextResponse.redirect(`${siteUrl}/dashboard/plan`)
}
