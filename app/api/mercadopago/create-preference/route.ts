import { NextRequest, NextResponse } from 'next/server'
import { Preference } from 'mercadopago'
import { mpClient as mercadopago } from '@/lib/mercadopago'

const PLANS = {
  starter: {
    title: 'Plan Starter - Altaprop',
    monthly: 18050,
    annual: 173280,
  },
  basico: {
    title: 'Plan Básico - Altaprop',
    monthly: 27550,
    annual: 263280,
  },
  pro: {
    title: 'Plan Pro - Altaprop',
    monthly: 46550,
    annual: 446880,
  },
  enterprise: {
    title: 'Plan Enterprise - Altaprop',
    monthly: 94050,
    annual: 902880,
  },
} as const

type PlanKey = keyof typeof PLANS
type BillingCycle = 'monthly' | 'annual'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { plan, billing, org_id } = body as {
      plan: PlanKey
      billing: BillingCycle
      org_id: string
    }

    if (!plan || !billing || !org_id) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos' },
        { status: 400 }
      )
    }

    const planConfig = PLANS[plan]
    if (!planConfig) {
      return NextResponse.json(
        { error: 'Plan no válido' },
        { status: 400 }
      )
    }

    const unitPrice = billing === 'annual' ? planConfig.annual : planConfig.monthly
    const billingLabel = billing === 'annual' ? '(Anual)' : '(Mensual)'

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://altaprop.cl'

    const preference = new Preference(mercadopago)

    const result = await preference.create({
      body: {
        items: [
          {
            id: `${plan}-${billing}`,
            title: `${planConfig.title} ${billingLabel}`,
            quantity: 1,
            unit_price: unitPrice,
            currency_id: 'CLP',
          },
        ],
        back_urls: {
          success: `${siteUrl}/dashboard/configuracion/billing?status=approved`,
          failure: `${siteUrl}/dashboard/configuracion/billing?status=failed`,
          pending: `${siteUrl}/dashboard/configuracion/billing?status=pending`,
        },
        auto_return: 'approved',
        notification_url: `${siteUrl}/api/mercadopago/webhook`,
        external_reference: org_id,
        metadata: {
          plan,
          billing,
          org_id,
        },
      },
    })

    return NextResponse.json({ init_point: result.init_point })
  } catch (error) {
    console.error('Error creating MercadoPago preference:', error)
    return NextResponse.json(
      { error: 'Error al crear la preferencia de pago' },
      { status: 500 }
    )
  }
}
