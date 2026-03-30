import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !key) {
      return NextResponse.json({ error: 'Missing env vars' }, { status: 500 })
    }

    const admin = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const { data: profiles, error } = await admin
      .from('profiles')
      .select('id, full_name, phone, rut, birth_date, marital_status, nationality, occupation, employer, employment_years, monthly_income, housing_status, created_at')
      .eq('role', 'POSTULANTE')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get emails
    const { data: authData } = await admin.auth.admin.listUsers({ perPage: 500 })
    const emailMap = new Map<string, string>()
    if (authData?.users) {
      for (const u of authData.users) {
        emailMap.set(u.id, u.email || '')
      }
    }

    const applicants = (profiles || []).map(p => ({
      ...p,
      email: emailMap.get(p.id) || '',
      application_count: 0,
    }))

    return NextResponse.json(applicants)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
