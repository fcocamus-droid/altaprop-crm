import { NextResponse } from 'next/server'
import { getUserProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// GET: returns the SUPERADMIN's bank data for the subscriber of this application's property,
//      plus any agency transfer receipts uploaded for this application
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const profile = await getUserProfile()
  if (!profile) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const admin = createAdminClient()
  const applicationId = params.id

  // Fetch application
  const { data: application } = await admin
    .from('applications')
    .select('id, applicant_id, property_id, status')
    .eq('id', applicationId)
    .single()

  if (!application) return NextResponse.json({ error: 'Postulación no encontrada' }, { status: 404 })

  // Auth: applicant of this application or any admin/owner role
  const isApplicant = profile.id === application.applicant_id
  const isAllowed = isApplicant || ['SUPERADMINBOSS', 'SUPERADMIN', 'AGENTE', 'PROPIETARIO'].includes(profile.role)
  if (!isAllowed) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  if (!['approved', 'rented', 'sold'].includes(application.status)) {
    return NextResponse.json({ error: 'Estado no válido' }, { status: 422 })
  }

  // Get subscriber_id from the property
  const { data: property } = await admin
    .from('properties')
    .select('subscriber_id')
    .eq('id', application.property_id)
    .single()

  if (!property?.subscriber_id) {
    return NextResponse.json({ error: 'Propiedad sin suscriptor' }, { status: 404 })
  }

  // properties.subscriber_id = profiles.id of the admin/organization
  const { data: adminProfile } = await admin
    .from('profiles')
    .select('full_name, bank_name, bank_account_type, bank_account_holder, bank_account_rut, bank_account_number, bank_email')
    .eq('id', property.subscriber_id)
    .single()

  const hasBank = adminProfile && (adminProfile.bank_name || adminProfile.bank_account_holder || adminProfile.bank_account_number)

  // Get agency transfer receipts for this application
  const { data: receipts } = await admin
    .from('payment_receipts')
    .select('id, file_url, file_name, uploaded_at')
    .eq('application_id', applicationId)
    .like('file_url', '%/agency-receipts/%')
    .order('uploaded_at', { ascending: false })

  return NextResponse.json({
    bank: hasBank ? {
      bank_name: adminProfile.bank_name,
      bank_account_type: adminProfile.bank_account_type,
      bank_account_holder: adminProfile.bank_account_holder,
      bank_account_rut: adminProfile.bank_account_rut,
      bank_account_number: adminProfile.bank_account_number,
      bank_email: adminProfile.bank_email,
    } : null,
    agency_name: adminProfile?.full_name ?? null,
    receipts: receipts ?? [],
  })
}
