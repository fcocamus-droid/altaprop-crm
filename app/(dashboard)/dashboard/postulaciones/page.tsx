import { getUserProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getApplicationsByApplicant, getApplicationsByOwner, getAllApplications, getApplicationsBySubscriber, getApplicationsByAgent } from '@/lib/queries/applications'
import { ROLES, isAdmin } from '@/lib/constants'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { Button } from '@/components/ui/button'
import { ApplicationList } from '@/components/applications/application-list'
import { PostulacionesTabs } from '@/components/applications/postulaciones-tabs'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Postulaciones' }

export default async function PostulacionesPage() {
  const profile = await getUserProfile()
  if (!profile) redirect('/login')

  let applications: any[] = []
  let applicants: any[] = []
  const canManage = isAdmin(profile.role) || profile.role === 'AGENTE'

  // Load applications
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
  } catch {
    // query error
  }

  // Load applicants database separately (won't be caught by applications error)
  if (canManage && applications.length > 0) {
    try {
      const admin = createAdminClient()

      // Extract applicant IDs - try applicant_id field first, then applicant.id from join
      const ids = applications.map((a: any) => a.applicant_id || (a.applicant as any)?.id).filter(Boolean)
      const applicantIds = Array.from(new Set(ids))

      if (applicantIds.length > 0) {
        const [profilesResult, authResult] = await Promise.all([
          admin.from('profiles')
            .select('id, full_name, phone, rut, birth_date, marital_status, nationality, occupation, employer, employment_years, monthly_income, housing_status, created_at')
            .in('id', applicantIds),
          admin.auth.admin.listUsers({ perPage: 500 }),
        ])

        const emailMap = new Map<string, string>()
        if (authResult.data?.users) {
          for (const u of authResult.data.users) {
            emailMap.set(u.id, u.email || '')
          }
        }

        const appCounts = new Map<string, number>()
        ids.forEach((id: string) => {
          appCounts.set(id, (appCounts.get(id) || 0) + 1)
        })

        applicants = (profilesResult.data || []).map(p => ({
          ...p,
          email: emailMap.get(p.id) || '',
          application_count: appCounts.get(p.id) || 0,
        }))
      }
    } catch {
      // applicants load error - non-blocking
    }
  }

  const isApplicant = profile.role === 'POSTULANTE'

  return (
    <div>
      <PageHeader
        title="Postulaciones"
        description={isApplicant ? 'Revisa el estado de tus postulaciones' : 'Gestiona las postulaciones recibidas'}
      />

      {isApplicant ? (
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
        <PostulacionesTabs
          applications={applications}
          applicants={applicants}
          showApplicantsTab={canManage}
        />
      )}
    </div>
  )
}
