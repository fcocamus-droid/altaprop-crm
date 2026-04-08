import { NextRequest, NextResponse } from 'next/server'
import { getUserProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// POST: upload a payment receipt and mark commission as paid
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const profile = await getUserProfile()
  if (!profile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const payerType = formData.get('payerType') as string | null

  if (!file) return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 })
  if (!payerType || !['applicant', 'owner'].includes(payerType)) {
    return NextResponse.json({ error: 'payerType inválido' }, { status: 400 })
  }

  // Role check: applicant can only upload their own, owner only their own, admin can upload both
  if (profile.role === 'POSTULANTE' && payerType !== 'applicant') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  if (profile.role === 'PROPIETARIO' && payerType !== 'owner') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'El archivo supera los 10 MB' }, { status: 400 })
  }

  const admin = createAdminClient()
  const applicationId = params.id

  // Upload receipt to storage
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const filePath = `commission-receipts/${applicationId}/${payerType}-${Date.now()}-${safeName}`

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

  // Mark commission as paid for this payer type
  const field = payerType === 'applicant' ? 'commission_paid_applicant' : 'commission_paid_owner'
  const receiptField = payerType === 'applicant'
    ? 'commission_receipt_applicant_url'
    : 'commission_receipt_owner_url'

  // Try to update with receipt URL (column may not exist yet if migration not run)
  const { error: updateError } = await admin
    .from('applications')
    .update({ [field]: true, [receiptField]: receiptUrl })
    .eq('id', applicationId)

  if (updateError) {
    // Column may not exist yet — fall back to just marking paid
    const { error: fallbackError } = await admin
      .from('applications')
      .update({ [field]: true })
      .eq('id', applicationId)

    if (fallbackError) {
      return NextResponse.json({ error: fallbackError.message }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true, receiptUrl })
}
