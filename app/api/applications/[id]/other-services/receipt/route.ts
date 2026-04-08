import { NextRequest, NextResponse } from 'next/server'
import { getUserProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// POST: upload a payment receipt for an other-service charge and mark it as paid
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const profile = await getUserProfile()
  if (!profile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const paymentId = formData.get('paymentId') as string | null

  if (!file) return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 })
  if (!paymentId) return NextResponse.json({ error: 'paymentId requerido' }, { status: 400 })

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'El archivo supera los 10 MB' }, { status: 400 })
  }

  const admin = createAdminClient()
  const applicationId = params.id

  // Verify the charge exists and belongs to this application
  const { data: payment } = await admin
    .from('other_service_payments')
    .select('id, payer_type, paid')
    .eq('id', paymentId)
    .eq('application_id', applicationId)
    .single()

  if (!payment) return NextResponse.json({ error: 'Cobro no encontrado' }, { status: 404 })

  // Role check: postulante can only pay applicant charges, owner only owner charges
  if (profile.role === 'POSTULANTE' && payment.payer_type !== 'applicant') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  if (profile.role === 'PROPIETARIO' && payment.payer_type !== 'owner') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  // Upload receipt to storage
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const filePath = `other-services/${applicationId}/receipt-${paymentId}-${Date.now()}-${safeName}`

  const { error: uploadError } = await admin.storage
    .from('property-images')
    .upload(filePath, file, { contentType: file.type, upsert: false })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: urlData } = admin.storage
    .from('property-images')
    .getPublicUrl(filePath)

  const receiptUrl = urlData.publicUrl

  // Try to mark paid + store receipt URL (column may not exist yet if migration not applied)
  const { error: updateError } = await admin
    .from('other_service_payments')
    .update({ paid: true, receipt_url: receiptUrl, receipt_name: file.name })
    .eq('id', paymentId)

  if (updateError) {
    // Fall back: just mark as paid
    const { error: fallbackError } = await admin
      .from('other_service_payments')
      .update({ paid: true })
      .eq('id', paymentId)

    if (fallbackError) {
      return NextResponse.json({ error: fallbackError.message }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true, receiptUrl })
}
