import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { PLANS } from '@/lib/constants'

// Validate the x-signature header MercadoPago sends. Without this anyone could
// POST `subscription_preapproval` events and toggle plans / commission flags
// in our DB without paying.
//
// Spec: https://www.mercadopago.cl/developers/es/docs/your-integrations/notifications/webhooks
//
// Manifest: id:<id>;request-id:<requestId>;ts:<ts>;
// HMAC-SHA256 signed with MP_WEBHOOK_SECRET.
function isValidMpSignature(
  rawSignature: string | null,
  rawRequestId: string | null,
  dataId: string | null,
): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET
  if (!secret) {
    // If no secret configured AND we're in production, fail closed.
    return process.env.NODE_ENV !== 'production'
  }
  if (!rawSignature) return false
  const parts = rawSignature.split(',').reduce<Record<string, string>>((acc, p) => {
    const [k, v] = p.split('=').map(s => s.trim())
    if (k && v) acc[k] = v
    return acc
  }, {})
  const ts = parts.ts
  const v1 = parts.v1
  if (!ts || !v1 || !dataId || !rawRequestId) return false
  const manifest = `id:${dataId};request-id:${rawRequestId};ts:${ts};`
  const expected = crypto.createHmac('sha256', secret).update(manifest).digest('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(v1, 'hex'))
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const admin = createAdminClient()
  const mpToken = process.env.MERCADOPAGO_ACCESS_TOKEN!

  // Signature verification — skip when MP_WEBHOOK_SECRET is unset in dev so
  // local testing still works, but enforce in production.
  const dataId = body?.data?.id ? String(body.data.id) : null
  if (!isValidMpSignature(
    request.headers.get('x-signature'),
    request.headers.get('x-request-id'),
    dataId,
  )) {
    return new NextResponse('invalid signature', { status: 401 })
  }

  // ─── 1. Recurring subscription: status changed ──────────────────────────────
  // Fired when the PreApproval subscription is authorized, paused or cancelled.
  if (body.type === 'subscription_preapproval') {
    const preapprovalId = body.data?.id
    if (!preapprovalId) return NextResponse.json({ ok: true })

    const res = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
      headers: { Authorization: `Bearer ${mpToken}` },
    })
    const preapproval = await res.json()

    if (preapproval.external_reference) {
      const [userId, planId, billingPeriod] = preapproval.external_reference.split('|')
      const plan = PLANS.find(p => p.id === planId)
      if (userId && plan) {
        const mpStatus: string = preapproval.status // authorized | paused | cancelled | pending

        if (mpStatus === 'authorized') {
          // First authorization — activate the subscription
          const now = new Date()
          const subscriptionEndsAt = new Date(now)
          if (billingPeriod === 'annual') {
            subscriptionEndsAt.setFullYear(subscriptionEndsAt.getFullYear() + 1)
          } else {
            subscriptionEndsAt.setMonth(subscriptionEndsAt.getMonth() + 1)
          }
          await admin.from('profiles').update({
            plan: plan.id,
            subscription_status: 'active',
            max_agents: plan.agents,
            subscription_ends_at: subscriptionEndsAt.toISOString(),
            mp_subscription_id: preapprovalId,
          }).eq('id', userId)

        } else if (mpStatus === 'paused') {
          await admin.from('profiles')
            .update({ subscription_status: 'paused' })
            .eq('id', userId)

        } else if (mpStatus === 'cancelled') {
          await admin.from('profiles')
            .update({ subscription_status: 'canceled' })
            .eq('id', userId)
        }
      }
    }

    return NextResponse.json({ ok: true })
  }

  // ─── 2. Recurring subscription: each automatic payment ──────────────────────
  // Fired every billing cycle when MP charges the card automatically.
  if (body.type === 'subscription_authorized_payment') {
    const authorizedPaymentId = body.data?.id
    if (!authorizedPaymentId) return NextResponse.json({ ok: true })

    const res = await fetch(`https://api.mercadopago.com/authorized_payments/${authorizedPaymentId}`, {
      headers: { Authorization: `Bearer ${mpToken}` },
    })
    const authorizedPayment = await res.json()

    if (authorizedPayment.status === 'processed' && authorizedPayment.preapproval_id) {
      // Fetch the preapproval to get external_reference and billing period
      const paRes = await fetch(`https://api.mercadopago.com/preapproval/${authorizedPayment.preapproval_id}`, {
        headers: { Authorization: `Bearer ${mpToken}` },
      })
      const preapproval = await paRes.json()

      if (preapproval.external_reference) {
        const [userId, planId, billingPeriod] = preapproval.external_reference.split('|')
        const plan = PLANS.find(p => p.id === planId)
        if (userId && plan) {
          // Extend subscription_ends_at from current value (never reset to today)
          const { data: profileData } = await admin
            .from('profiles')
            .select('subscription_ends_at')
            .eq('id', userId)
            .single()

          const currentEnd = profileData?.subscription_ends_at
            ? new Date(profileData.subscription_ends_at)
            : new Date()
          // Extend from current end (in case of early payment) or from now
          const base = currentEnd > new Date() ? currentEnd : new Date()
          const newEnd = new Date(base)
          if (billingPeriod === 'annual') {
            newEnd.setFullYear(newEnd.getFullYear() + 1)
          } else {
            newEnd.setMonth(newEnd.getMonth() + 1)
          }

          await admin.from('profiles').update({
            subscription_status: 'active',
            subscription_ends_at: newEnd.toISOString(),
          }).eq('id', userId)
        }
      }
    }

    return NextResponse.json({ ok: true })
  }

  // ─── 3. One-time payment (commissions, services, etc.) ──────────────────────
  if (body.type === 'payment' && body.action === 'payment.created') {
    const paymentId = body.data?.id
    if (!paymentId) return NextResponse.json({ ok: true })

    const paymentRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${mpToken}` },
    })
    const payment = await paymentRes.json()

    if (payment.status === 'approved' && payment.external_reference) {
      const ref: string = payment.external_reference

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
      } else if (ref.startsWith('red_canjes_commission:')) {
        // Red de Canjes commission: "red_canjes_commission:{claimId}"
        const claimId = ref.split(':')[1]
        if (claimId) {
          await admin
            .from('red_canjes_claims')
            .update({ commission_paid: true, commission_paid_at: new Date().toISOString() })
            .eq('id', claimId)
        }
      } else if (ref.startsWith('other_service:')) {
        // Other service payment: "other_service:{paymentId}"
        const svcPaymentId = ref.split(':')[1]
        if (svcPaymentId) {
          await admin
            .from('other_service_payments')
            .update({ paid: true })
            .eq('id', svcPaymentId)
        }
      }
      // Note: subscription payments via PreApproval are handled by
      // subscription_preapproval / subscription_authorized_payment above.
    }
  }

  return NextResponse.json({ ok: true })
}
