import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const [profilesResult, authResult] = await Promise.all([
    admin.from('profiles')
      .select('id, full_name, phone, rut, birth_date, marital_status, nationality, occupation, employer, employment_years, monthly_income, housing_status, created_at')
      .eq('role', 'POSTULANTE')
      .order('created_at', { ascending: false }),
    admin.auth.admin.listUsers({ perPage: 500 }),
  ])

  const emailMap = new Map<string, string>()
  if (authResult.data?.users) {
    for (const u of authResult.data.users) {
      emailMap.set(u.id, u.email || '')
    }
  }

  const applicants = (profilesResult.data || []).map(p => ({
    ...p,
    email: emailMap.get(p.id) || '',
    application_count: 0,
  }))

  return NextResponse.json(applicants)
}
