import { NextRequest, NextResponse } from 'next/server'
import { Payment, MerchantOrder } from 'mercadopago'
import { createClient } from '@supabase/supabase-js'
import { mpClient as mercadopago } from '@/lib/mercadopago'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const PLAN_LIMITS: Record<string, number> = {
  basico: 1,
  pro: 3,
  enterprise: 10,
}

async function handlePaymentNotification(paymentId: string) {
  const payment = new Payment(mercadopago)
  const paymentData = await payment.get({ id: paymentId })

  if (!paymentData) {
    console.error('Payment not found:', paymentId)
    return
  }

  const orgId = paymentData.external_reference
  const status = paymentData.status
  const metadata = paymentData.metadata as {
    plan?: string
    billing?: string
    org_id?: string
  } | null

  const plan = metadata?.plan || null
  const billing = metadata?.billing || null

  // Log the event regardless of status
  await supabaseAdmin.from('subscription_events').insert({
    org_id: orgId,
    event_type: `payment.${status}`,
    payment_id: paymentData.id?.toString(),
    amount: paymentData.transaction_amount,
    currency: paymentData.currency_id,
    plan,
    billing_cycle: billing,
    status,
    raw_data: paymentData,
  })

  // Only update the org if payment was approved
  if (status === 'approved' && orgId && plan) {
    const maxAgents = PLAN_LIMITS[plan] || 1

    await supabaseAdmin
      .from('organizations')
      .update({
        plan,
        subscription_status: 'active',
        max_agents: maxAgents,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orgId)

    console.log(`Organization ${orgId} upgraded to plan "${plan}"`)
  }
}

async function handleMerchantOrderNotification(orderId: string) {
  const merchantOrder = new MerchantOrder(mercadopago)
  const orderData = await merchantOrder.get({ merchantOrderId: orderId })

  if (!orderData) {
    console.error('Merchant order not found:', orderId)
    return
  }

  // Check if order is fully paid
  const payments = orderData.payments || []
  const paidAmount = payments
    .filter((p) => p.status === 'approved')
    .reduce((sum, p) => sum + (p.transaction_amount || 0), 0)

  if (paidAmount >= (orderData.total_amount || 0) && paidAmount > 0) {
    // Process each approved payment
    for (const p of payments) {
      if (p.status === 'approved' && p.id) {
        await handlePaymentNotification(p.id.toString())
      }
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    // Read raw body so we can verify the signature before parsing
    const raw = await request.text()
    let body: any = {}
    try { body = JSON.parse(raw) } catch { return NextResponse.json({ received: true }) }

    const { type, data, topic, id } = body
    const dataId = data?.id ? String(data.id) : (id ? String(id) : null)

    // ── Signature check ─────────────────────────────────────────────────────
    const secret = process.env.MP_WEBHOOK_SECRET
    if (secret) {
      const sig = request.headers.get('x-signature')
      const reqId = request.headers.get('x-request-id')
      const parts = (sig || '').split(',').reduce<Record<string, string>>((acc, p) => {
        const [k, v] = p.split('=').map(s => s.trim())
        if (k && v) acc[k] = v
        return acc
      }, {})
      const ts = parts.ts
      const v1 = parts.v1
      if (!ts || !v1 || !dataId || !reqId) {
        return new NextResponse('invalid signature', { status: 401 })
      }
      const crypto = await import('crypto')
      const manifest = `id:${dataId};request-id:${reqId};ts:${ts};`
      const expected = crypto.createHmac('sha256', secret).update(manifest).digest('hex')
      let ok = false
      try {
        ok = crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(v1, 'hex'))
      } catch { /* size mismatch */ }
      if (!ok) return new NextResponse('invalid signature', { status: 401 })
    } else if (process.env.NODE_ENV === 'production') {
      // Fail closed in production when no secret is configured
      return new NextResponse('webhook not configured', { status: 503 })
    }

    // Handle v2 webhooks (type-based)
    if (type === 'payment' && data?.id) {
      await handlePaymentNotification(data.id.toString())
    }

    // Handle v1 IPN notifications (topic-based)
    if (topic === 'payment' && id) {
      await handlePaymentNotification(id.toString())
    }

    if (topic === 'merchant_order' && id) {
      await handleMerchantOrderNotification(id.toString())
    }

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (error) {
    console.error('Webhook processing error:', error)
    // Always return 200 to MercadoPago to prevent retries
    return NextResponse.json({ received: true }, { status: 200 })
  }
}

// MercadoPago also sends GET requests for webhook validation
export async function GET() {
  return NextResponse.json({ status: 'ok' }, { status: 200 })
}
