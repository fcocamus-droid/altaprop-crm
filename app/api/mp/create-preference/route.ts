import { NextRequest, NextResponse } from 'next/server'
import { preferenceClient } from '@/lib/mercadopago'
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

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.altaprop-app.cl'

  // Price calculation
  // Monthly: plan.price * IVA  (e.g. $19 → $22.61)
  // Annual:  plan.price * 0.80 * 12 * IVA  (e.g. $19 → $19*0.8*12*1.19 = $217.06)
  const baseMonthly = annual ? plan.price * ANNUAL_DISCOUNT : plan.price
  const unitPrice = annual
    ? Math.round(baseMonthly * 12 * IVA * 100) / 100
    : Math.round(baseMonthly * IVA * 100) / 100

  const billingLabel = annual ? 'anual' : 'mensual'
  const billingPeriod = annual ? 'annual' : 'monthly'

  const preference = await preferenceClient.create({
    body: {
      items: [
        {
          id: `${plan.id}_${billingPeriod}`,
          title: `Altaprop - Plan ${plan.name} (${billingLabel})`,
          description: annual
            ? `Suscripción anual con 20% de descuento — ${plan.agents} agentes incluidos`
            : `Suscripción mensual — ${plan.agents} agentes incluidos`,
          quantity: 1,
          unit_price: unitPrice,
          currency_id: 'USD',
        },
      ],
      payer: {
        email: profile.email || '',
      },
      back_urls: {
        success: `${siteUrl}/api/mp/callback?status=success&plan=${plan.id}&user=${profile.id}&billing=${billingPeriod}`,
        failure: `${siteUrl}/api/mp/callback?status=failure`,
        pending: `${siteUrl}/api/mp/callback?status=pending&plan=${plan.id}&user=${profile.id}&billing=${billingPeriod}`,
      },
      auto_return: 'approved',
      external_reference: `${profile.id}|${plan.id}|${billingPeriod}`,
      notification_url: `${siteUrl}/api/mp/webhook`,
    },
  })

  return NextResponse.json({ url: preference.init_point })
}
