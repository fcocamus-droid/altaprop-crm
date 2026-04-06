import { NextResponse } from 'next/server'
import { getUserProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const profile = await getUserProfile()
    if (!profile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    // Only admins and agents can access this endpoint
    const allowedRoles = ['SUPERADMINBOSS', 'SUPERADMIN', 'AGENTE']
    if (!allowedRoles.includes(profile.role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const admin = createAdminClient()

    let applicantIds: string[] | null = null // null = no restriction (SUPERADMINBOSS)

    if (profile.role === 'AGENTE') {
      // Only postulantes who applied to properties assigned to this agent
      const { data: apps } = await admin
        .from('applications')
        .select('applicant_id, property:properties!inner(agent_id)')
        .eq('property.agent_id', profile.id)
      applicantIds = Array.from(new Set((apps || []).map((a: any) => a.applicant_id as string)))

    } else if (profile.role === 'SUPERADMIN') {
      // Only postulantes who applied to properties in this subscriber's org
      const subscriberId = profile.subscriber_id || profile.id
      const { data: apps } = await admin
        .from('applications')
        .select('applicant_id, property:properties!inner(subscriber_id)')
        .eq('property.subscriber_id', subscriberId)
      applicantIds = Array.from(new Set((apps || []).map((a: any) => a.applicant_id as string)))
    }
    // SUPERADMINBOSS: applicantIds stays null → fetch all

    let query = admin
      .from('profiles')
      .select('id, full_name, phone, rut, birth_date, marital_status, nationality, occupation, employer, employment_years, monthly_income, housing_status, created_at')
      .eq('role', 'POSTULANTE')
      .order('created_at', { ascending: false })

    if (applicantIds !== null) {
      if (applicantIds.length === 0) {
        // No postulantes for this agent/admin yet
        return NextResponse.json([])
      }
      query = query.in('id', applicantIds)
    }

    const { data: profiles, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Enrich with emails from Auth
    const { data: authData } = await admin.auth.admin.listUsers({ perPage: 1000 })
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
