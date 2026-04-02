import { NextRequest, NextResponse } from 'next/server'
import { getUserProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { preferenceClient } from '@/lib/mercadopago'

export const dynamic = 'force-dynamic'

// GET: list other service payments for an application
// - POSTULANTE  → only their own charges (payer_type = 'applicant')
// - PROPIETARIO → only the owner charges  (payer_type = 'owner')
// - Admin/AGENTE → all charges
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const profile = await getUserProfile()
  if (!profile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = createAdminClient()
  let query = admin
    .from('other_service_payments')
    .select('*')
    .eq('application_id', params.id)
    .order('created_at', { ascending: true })

  // Restrict visible charges based on the caller's role
  if (profile.role === 'POSTULANTE') {
    query = query.eq('payer_type', 'applicant')
  } else if (profile.role === 'PROPIETARIO') {
    query = query.eq('payer_type', 'owner')
  }
  // Admin / AGENTE / SUPERADMIN see everything — no filter applied

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ payments: data ?? [] })
}

// POST: create a new other service payment and return MP checkout URL
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const profile = await getUserProfile()
  if (!profile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  // Only admins and agents can create charges
  if (['POSTULANTE', 'PROPIETARIO'].includes(profile.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const body = await request.json()
  const { description, amount, payerType, fileUrl, fileName, currency } = body

  if (!description || !description.trim()) {
    return NextResponse.json({ error: 'La descripción es requerida' }, { status: 400 })
  }
  if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
    return NextResponse.json({ error: 'Monto inválido' }, { status: 400 })
  }
  if (!payerType || !['applicant', 'owner'].includes(payerType)) {
    return NextResponse.json({ error: 'Tipo de pagador inválido' }, { status: 400 })
  }

  const applicationId = params.id
  const admin = createAdminClient()
  const numAmount = Number(amount)
  const usedCurrency = currency || 'CLP'

  // Verify the application exists
  const { data: app } = await admin
    .from('applications')
    .select('id, property:properties(title)')
    .eq('id', applicationId)
    .single()

  if (!app) return NextResponse.json({ error: 'Postulación no encontrada' }, { status: 404 })

  const property = app.property as any

  // Create the payment record first
  const { data: payment, error: insertError } = await admin
    .from('other_service_payments')
    .insert({
      application_id: applicationId,
      description: description.trim(),
      amount: numAmount,
      currency: usedCurrency,
      payer_type: payerType,
      file_url: fileUrl || null,
      file_name: fileName || null,
      paid: false,
      created_by: profile.id,
    })
    .select()
    .single()

  if (insertError || !payment) {
    return NextResponse.json({ error: insertError?.message || 'Error al crear el cobro' }, { status: 500 })
  }

  // Create MercadoPago preference
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.altaprop-app.cl'
  const payerLabel = payerType === 'applicant' ? 'Postulante' : 'Propietario'

  try {
    const preference = await preferenceClient.create({
      body: {
        items: [
          {
            id: `other-service-${payment.id}`,
            title: `Altaprop - ${description.trim()}`,
            description: `Cobro a ${payerLabel} - ${property?.title || 'Propiedad'}`,
            quantity: 1,
            unit_price: numAmount,
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

    // Save the preference id for reference
    await admin
      .from('other_service_payments')
      .update({ mp_preference_id: preference.id || null })
      .eq('id', payment.id)

    return NextResponse.json({ url: preference.init_point, payment })
  } catch (err: any) {
    // Rollback: delete the payment record if preference creation failed
    await admin.from('other_service_payments').delete().eq('id', payment.id)
    return NextResponse.json({ error: err?.message || 'Error al crear preferencia MP' }, { status: 500 })
  }
}

// PATCH: mark a payment as paid manually (admin override)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const profile = await getUserProfile()
  if (!profile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (profile.role === 'POSTULANTE') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { paymentId, paid } = await request.json()
  if (!paymentId) return NextResponse.json({ error: 'paymentId requerido' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin
    .from('other_service_payments')
    .update({ paid: Boolean(paid) })
    .eq('id', paymentId)
    .eq('application_id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE: remove a payment record (only if not yet paid)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const profile = await getUserProfile()
  if (!profile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (profile.role === 'POSTULANTE') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const paymentId = searchParams.get('paymentId')
  if (!paymentId) return NextResponse.json({ error: 'paymentId requerido' }, { status: 400 })

  const admin = createAdminClient()

  // Only allow deletion if not yet paid
  const { data: existing } = await admin
    .from('other_service_payments')
    .select('id, paid')
    .eq('id', paymentId)
    .eq('application_id', params.id)
    .single()

  if (!existing) return NextResponse.json({ error: 'Cobro no encontrado' }, { status: 404 })
  if (existing.paid) return NextResponse.json({ error: 'No se puede eliminar un cobro ya pagado' }, { status: 400 })

  const { error } = await admin
    .from('other_service_payments')
    .delete()
    .eq('id', paymentId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
