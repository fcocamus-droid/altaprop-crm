import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // 1. Get all profiles with role POSTULANTE
  const { data: postulantes, error: e1 } = await admin
    .from('profiles')
    .select('id, role, full_name, phone, rut')
    .eq('role', 'POSTULANTE')

  // 2. Get all applications
  const { data: apps, error: e2 } = await admin
    .from('applications')
    .select('id, applicant_id, property_id, status')

  // 3. Get all profiles (any role)
  const { data: allProfiles, error: e3 } = await admin
    .from('profiles')
    .select('id, role, full_name')
    .order('created_at', { ascending: false })
    .limit(20)

  // 4. Get applicant_ids from applications
  const applicantIds = (apps || []).map((a: any) => a.applicant_id)

  // 5. Check if applicant profiles exist
  let applicantProfiles: any[] = []
  if (applicantIds.length > 0) {
    const { data } = await admin
      .from('profiles')
      .select('id, role, full_name')
      .in('id', applicantIds)
    applicantProfiles = data || []
  }

  return NextResponse.json({
    postulantes_count: postulantes?.length || 0,
    postulantes: postulantes,
    postulantes_error: e1?.message,
    applications_count: apps?.length || 0,
    applications: apps,
    applications_error: e2?.message,
    recent_profiles: allProfiles,
    profiles_error: e3?.message,
    applicant_ids_from_apps: applicantIds,
    applicant_profiles: applicantProfiles,
  })
}
