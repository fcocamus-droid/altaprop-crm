import { NextRequest, NextResponse } from 'next/server'
import { getUserProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { preferenceClient } from '@/lib/mercadopago'

export const dynamic = 'force-dynamic'

// POST: generate a MercadoPago checkout URL for an existing other_service_payments record
// Any role (POSTULANTE, PROPIETARIO, AGENTE, ADMIN) can call this as long as
// the payment belongs to them (payer_type matches their role)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const profile = await getUserProfile()
  if (!profile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { paymentId } = await request.json()
  if (!paymentId) return NextResponse.json({ error: 'paymentId requerido' }, { status: 400 })

  const admin = createAdminClient()

  // Fetch the payment record
  const { data: payment } = await admin
    .from('other_service_payments')
    .select('*')
    .eq('id', paymentId)
    .eq('application_id', params.id)
    .single()

  if (!payment) return NextResponse.json({ error: 'Cobro no encontrado' }, { status: 404 })
  if (payment.paid) return NextResponse.json({ error: 'Este cobro ya fue pagado' }, { status: 400 })

  // Role-based access check: POSTULANTE can only pay applicant charges, PROPIETARIO only owner charges
  if (profile.role === 'POSTULANTE' && payment.payer_type !== 'applicant') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  if (profile.role === 'PROPIETARIO' && payment.payer_type !== 'owner') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  // Fetch the property title for the preference description
  const { data: app } = await admin
    .from('applications')
    .select('id, property:properties(title)')
    .eq('id', params.id)
    .single()

  const property = (app?.property as any)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.altaprop-app.cl'
  const payerLabel = payment.payer_type === 'applicant' ? 'Postulante' : 'Propietario'
  const usedCurrency = payment.currency || 'CLP'

  try {
    const preference = await preferenceClient.create({
      body: {
        items: [
          {
            id: `other-service-${payment.id}`,
            title: `Altaprop - ${payment.description}`,
            description: `Cobro a ${payerLabel} - ${property?.title || 'Propiedad'}`,
            quantity: 1,
            unit_price: payment.amount,
            currency_id: usedCurrency === 'USD' ? 'USD' : 'CLP',
          },
        ],
        payer: {
          email: profile.email || '',
        },
        back_urls: {
          success: `${siteUrl}/api/mp/commission-callback?status=success&type=other_service&payment_id=${payment.id}`,
          failure: `${siteUrl}/api/mp/commission-callback?status=failure&type=other_service&payment_id=${payment.id}`,
          pending: `${siteUrl}/api/mp/commission-callback?status=pending&type=other_service&payment_id=${payment.id}`,
        },
        auto_return: 'approved',
        external_reference: `other_service:${payment.id}`,
        notification_url: `${siteUrl}/api/mp/webhook`,
      },
    })

    // Update mp_preference_id
    await admin
      .from('other_service_payments')
      .update({ mp_preference_id: preference.id || null })
      .eq('id', payment.id)

    return NextResponse.json({ url: preference.init_point })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Error al crear preferencia MP' }, { status: 500 })
  }
}
