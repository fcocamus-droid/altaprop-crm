import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PLANS } from '@/lib/constants'

export async function POST(request: NextRequest) {
  const body = await request.json()

  if (body.type === 'payment' && body.action === 'payment.created') {
    const paymentId = body.data?.id
    if (!paymentId) return NextResponse.json({ ok: true })

    const mpToken = process.env.MERCADOPAGO_ACCESS_TOKEN!
    const paymentRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${mpToken}` },
    })
    const payment = await paymentRes.json()

    if (payment.status === 'approved' && payment.external_reference) {
      const ref: string = payment.external_reference
      const admin = createAdminClient()

      if (ref.startsWith('commission:')) {
        // Commission payment: "commission:{applicationId}:{payerType}"
        const parts = ref.split(':')
        const applicationId = parts[1]
        const payerType = parts[2]
        if (applicationId && payerType) {
          const field =
            payerType === 'applicant'
              ? 'commission_paid_applicant'
              : 'commission_paid_owner'
          await admin
            .from('applications')
            .update({ [field]: true })
            .eq('id', applicationId)
        }
      } else {
        // Subscription payment: "{userId}|{planId}"
        const [userId, planId] = ref.split('|')
        const plan = PLANS.find(p => p.id === planId)
        if (userId && plan) {
          const now = new Date()
          const subscriptionEndsAt = new Date(now)
          subscriptionEndsAt.setMonth(subscriptionEndsAt.getMonth() + 1)
          await admin.from('profiles').update({
            plan: plan.id,
            subscription_status: 'active',
            max_agents: plan.agents,
            subscription_ends_at: subscriptionEndsAt.toISOString(),
            mp_subscription_id: String(paymentId),
          }).eq('id', userId)
        }
      }
    }
  }

  return NextResponse.json({ ok: true })
}
