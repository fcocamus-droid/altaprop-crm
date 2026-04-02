import { NextRequest, NextResponse } from 'next/server'
import { getUserProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { preferenceClient } from '@/lib/mercadopago'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const profile = await getUserProfile()
  if (!profile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { payerType, amount } = await request.json()
  if (!payerType || !['applicant', 'owner'].includes(payerType)) {
    return NextResponse.json({ error: 'payerType inválido' }, { status: 400 })
  }
  if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
    return NextResponse.json({ error: 'Monto inválido' }, { status: 400 })
  }

  const applicationId = params.id
  const admin = createAdminClient()

  // Get application + property details
  const { data: app } = await admin
    .from('applications')
    .select('*, property:properties(id, title, price, currency, operation)')
    .eq('id', applicationId)
    .single()

  if (!app) return NextResponse.json({ error: 'Postulación no encontrada' }, { status: 404 })
  if (!['rented', 'sold'].includes(app.status)) {
    return NextResponse.json({ error: 'La postulación debe estar arrendada o vendida' }, { status: 400 })
  }

  const property = app.property as any
  const numAmount = Number(amount)

  // For sold properties: save the commission amount to DB so the applicant can see it
  if (app.status === 'sold') {
    await admin
      .from('applications')
      .update({ commission_amount: numAmount })
      .eq('id', applicationId)
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.altaprop-app.cl'
  const currency = property?.currency === 'USD' ? 'USD' : 'CLP'
  const operationLabel = app.status === 'rented' ? 'arriendo' : 'venta'
  const payerLabel = payerType === 'applicant' ? 'Postulante' : 'Propietario'

  const preference = await preferenceClient.create({
    body: {
      items: [
        {
          id: `commission-${applicationId}-${payerType}`,
          title: `Altaprop - Comisión ${payerLabel}`,
          description: `Comisión por ${operationLabel} - ${property?.title || 'Propiedad'}`,
          quantity: 1,
          unit_price: numAmount,
          currency_id: currency,
        },
      ],
      payer: {
        email: profile.email || '',
      },
      back_urls: {
        success: `${siteUrl}/api/mp/commission-callback?status=success&app_id=${applicationId}&payer=${payerType}`,
        failure: `${siteUrl}/api/mp/commission-callback?status=failure&app_id=${applicationId}&payer=${payerType}`,
        pending: `${siteUrl}/api/mp/commission-callback?status=pending&app_id=${applicationId}&payer=${payerType}`,
      },
      auto_return: 'approved',
      external_reference: `commission:${applicationId}:${payerType}`,
      notification_url: `${siteUrl}/api/mp/webhook`,
    },
  })

  return NextResponse.json({ url: preference.init_point })
}
