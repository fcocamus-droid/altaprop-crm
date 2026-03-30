import { getUserProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getApplicationsByApplicant, getApplicationsByOwner, getAllApplications, getApplicationsBySubscriber, getApplicationsByAgent } from '@/lib/queries/applications'
import { ROLES, isAdmin } from '@/lib/constants'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { Button } from '@/components/ui/button'
import { ApplicationList } from '@/components/applications/application-list'
import { ApplicantsDatabase } from '@/components/applications/applicants-database'
import { PostulacionesTabs } from '@/components/applications/postulaciones-tabs'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Postulaciones' }

export default async function PostulacionesPage() {
  const profile = await getUserProfile()
  if (!profile) redirect('/login')

  let applications: any[] = []
  let applicants: any[] = []
  const canManage = isAdmin(profile.role) || profile.role === 'AGENTE'

  try {
    if (profile.role === ROLES.SUPERADMINBOSS) {
      applications = await getAllApplications()
    } else if (profile.role === ROLES.SUPERADMIN) {
      applications = await getApplicationsBySubscriber(profile.subscriber_id || profile.id)
    } else if (profile.role === 'AGENTE') {
      applications = await getApplicationsByAgent(profile.id)
    } else if (profile.role === 'PROPIETARIO') {
      applications = await getApplicationsByOwner(profile.id)
    } else {
      applications = await getApplicationsByApplicant(profile.id)
    }

    // Fetch applicants database for admins/agents using admin client to bypass RLS
    if (canManage) {
      const { createAdminClient } = await import('@/lib/supabase/admin')
      const admin = createAdminClient()

      // Get ALL postulantes who have applied (via admin to bypass RLS)
      let allApps: any[] = []
      if (profile.role === ROLES.SUPERADMINBOSS) {
        const { data } = await admin.from('applications').select('applicant_id')
        allApps = data || []
      } else if (profile.role === ROLES.SUPERADMIN) {
        const { data } = await admin.from('applications').select('applicant_id, property:properties!inner(subscriber_id)').eq('property.subscriber_id', profile.subscriber_id || profile.id)
        allApps = data || []
      } else if (profile.role === 'AGENTE') {
        const { data } = await admin.from('applications').select('applicant_id, property:properties!inner(agent_id)').eq('property.agent_id', profile.id)
        allApps = data || []
      }
      const applicantIds = Array.from(new Set((allApps || []).map((a: any) => a.applicant_id).filter(Boolean)))

      if (applicantIds.length > 0) {
        const { data } = await admin
          .from('profiles')
          .select('id, full_name, phone, rut, birth_date, marital_status, nationality, occupation, employer, employment_years, monthly_income, housing_status, created_at')
          .in('id', applicantIds)
          .order('created_at', { ascending: false })

        // Get emails
        const { data: authData } = await admin.auth.admin.listUsers({ perPage: 500 })
        const emailMap = new Map<string, string>()
        if (authData?.users) {
          for (const u of authData.users) {
            emailMap.set(u.id, u.email || '')
          }
        }

        // Count applications per applicant
        const appCounts = new Map<string, number>()
        ;(allApps || []).forEach((a: any) => {
          appCounts.set(a.applicant_id, (appCounts.get(a.applicant_id) || 0) + 1)
        })

        applicants = (data || []).map(p => ({
          ...p,
          email: emailMap.get(p.id) || '',
          application_count: appCounts.get(p.id) || 0,
        }))
      }
    }
  } catch {
    // Supabase may not be configured yet
  }

  const isApplicant = profile.role === 'POSTULANTE'

  return (
    <div>
      <PageHeader
        title="Postulaciones"
        description={isApplicant ? 'Revisa el estado de tus postulaciones' : 'Gestiona las postulaciones recibidas'}
      />

      {isApplicant ? (
        // POSTULANTE view - just the list
        applications.length === 0 ? (
          <EmptyState
            title="No tienes postulaciones"
            description="Explora propiedades disponibles y postula."
          >
            <Button asChild><Link href="/propiedades">Explorar Propiedades</Link></Button>
          </EmptyState>
        ) : (
          <ApplicationList applications={applications} isApplicant={true} />
        )
      ) : (
        // ADMIN/AGENT view - tabs
        <PostulacionesTabs
          applications={applications}
          applicants={applicants}
          showApplicantsTab={canManage}
        />
      )}
    </div>
  )
}
