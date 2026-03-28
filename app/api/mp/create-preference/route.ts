import { NextRequest, NextResponse } from 'next/server'
import { preferenceClient } from '@/lib/mercadopago'
import { getUserProfile } from '@/lib/auth'
import { PLANS } from '@/lib/constants'

export async function POST(request: NextRequest) {
  const profile = await getUserProfile()
  if (!profile) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { planId } = await request.json()
  const plan = PLANS.find(p => p.id === planId)
  if (!plan) {
    return NextResponse.json({ error: 'Plan no encontrado' }, { status: 400 })
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.altaprop-app.cl'

  const preference = await preferenceClient.create({
    body: {
      items: [
        {
          id: plan.id,
          title: `Altaprop - Plan ${plan.name}`,
          description: `Suscripcion mensual - ${plan.agents} agentes incluidos`,
          quantity: 1,
          unit_price: plan.price,
          currency_id: 'USD',
        },
      ],
      payer: {
        email: profile.email || '',
      },
      back_urls: {
        success: `${siteUrl}/api/mp/callback?status=success&plan=${plan.id}&user=${profile.id}`,
        failure: `${siteUrl}/api/mp/callback?status=failure`,
        pending: `${siteUrl}/api/mp/callback?status=pending&plan=${plan.id}&user=${profile.id}`,
      },
      auto_return: 'approved',
      external_reference: `${profile.id}|${plan.id}`,
      notification_url: `${siteUrl}/api/mp/webhook`,
    },
  })

  return NextResponse.json({ url: preference.init_point })
}
