import { NextResponse } from 'next/server'
import { getUserProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const profile = await getUserProfile()
  if (!profile) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const admin = createAdminClient()
  const applicationId = params.id

  // 1. Fetch the application
  const { data: application, error: appError } = await admin
    .from('applications')
    .select('id, applicant_id, property_id, status')
    .eq('id', applicationId)
    .single()

  if (appError || !application) {
    return NextResponse.json({ error: 'Postulación no encontrada' }, { status: 404 })
  }

  // 2. Authorization:
  //    - Postulante: must be the applicant on this application
  //    - Admins/agents/propietario: allowed to view too
  const isApplicant = profile.id === application.applicant_id
  const isAdmin = ['SUPERADMINBOSS', 'SUPERADMIN', 'AGENTE', 'PROPIETARIO'].includes(profile.role)

  if (!isApplicant && !isAdmin) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  // 3. Only show payment info if status is approved, rented or sold
  if (!['approved', 'rented', 'sold'].includes(application.status)) {
    return NextResponse.json({ error: 'La postulación no está en estado de pago' }, { status: 422 })
  }

  // 4. Fetch property to get owner_id
  const { data: property } = await admin
    .from('properties')
    .select('id, owner_id, title')
    .eq('id', application.property_id)
    .single()

  if (!property?.owner_id) {
    return NextResponse.json({ error: 'La propiedad no tiene propietario asignado' }, { status: 404 })
  }

  // 5. Fetch owner's bank details
  const { data: owner } = await admin
    .from('profiles')
    .select('full_name, bank_name, bank_account_type, bank_account_holder, bank_account_rut, bank_account_number, bank_email')
    .eq('id', property.owner_id)
    .single()

  // 6. Fetch payment receipts for this application (owner transfers only)
  const { data: receipts } = await admin
    .from('payment_receipts')
    .select('id, file_url, file_name, uploaded_at')
    .eq('application_id', applicationId)
    .like('file_url', '%/payment-receipts/%')
    .order('uploaded_at', { ascending: false })

  const hasAnyBankData = owner && (
    owner.bank_name || owner.bank_account_holder || owner.bank_account_number
  )

  return NextResponse.json({
    property_title: property.title,
    owner_name: owner?.full_name,
    bank: hasAnyBankData ? {
      bank_name: owner?.bank_name,
      bank_account_type: owner?.bank_account_type,
      bank_account_holder: owner?.bank_account_holder,
      bank_account_rut: owner?.bank_account_rut,
      bank_account_number: owner?.bank_account_number,
      bank_email: owner?.bank_email,
    } : null,
    receipts: receipts ?? [],
  })
}
