import { NextRequest, NextResponse } from 'next/server'
import { getUserProfile } from '@/lib/auth'
import { PLANS } from '@/lib/constants'

const IVA = 1.19
const ANNUAL_DISCOUNT = 0.80

export async function POST(request: NextRequest) {
  const profile = await getUserProfile()
  if (!profile) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { planId, annual = false } = await request.json()
  const plan = PLANS.find(p => p.id === planId)
  if (!plan) {
    return NextResponse.json({ error: 'Plan no encontrado' }, { status: 400 })
  }

  // Always use the canonical production domain for MercadoPago back_url.
  const siteUrl =
    process.env.NODE_ENV === 'development'
      ? (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')
      : 'https://www.altaprop-app.cl'

  // Price calculation (same logic as create-preference)
  const baseMonthly = annual ? plan.price * ANNUAL_DISCOUNT : plan.price
  const transactionAmount = annual
    ? Math.round(baseMonthly * 12 * IVA * 100) / 100
    : Math.round(baseMonthly * IVA * 100) / 100

  const billingLabel = annual ? 'anual' : 'mensual'
  const billingPeriod = annual ? 'annual' : 'monthly'
  // Annual = 1 charge per year; monthly = 1 charge per month
  const frequencyType = annual ? 'years' : 'months'

  const mpToken = process.env.MERCADOPAGO_ACCESS_TOKEN!

  try {
    const res = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mpToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reason: `Altaprop - Plan ${plan.name} (${billingLabel})`,
        external_reference: `${profile.id}|${plan.id}|${billingPeriod}`,
        payer_email: profile.email || '',
        auto_recurring: {
          frequency: 1,
          frequency_type: frequencyType,
          transaction_amount: transactionAmount,
          currency_id: 'USD',
        },
        // After user authorizes: redirect to plan page with a processing notice
        back_url: `${siteUrl}/dashboard/plan?subscription=processing`,
        notification_url: `${siteUrl}/api/mp/webhook`,
        status: 'pending',
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      console.error('[create-preapproval] MP error:', data)
      return NextResponse.json({ error: data.message || 'Error creando suscripción' }, { status: 500 })
    }

    return NextResponse.json({ url: data.init_point })
  } catch (e: any) {
    console.error('[create-preapproval] error:', e)
    return NextResponse.json({ error: e.message || 'Error creando suscripción' }, { status: 500 })
  }
}
