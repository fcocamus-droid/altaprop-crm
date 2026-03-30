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

  // Load ALL postulantes directly from DB using admin client
  if (canManage) {
    try {
      const admin = createAdminClient()

      // Get all POSTULANTE profiles directly
      const { data: postulantProfiles } = await admin
        .from('profiles')
        .select('id, full_name, phone, rut, birth_date, marital_status, nationality, occupation, employer, employment_years, monthly_income, housing_status, created_at')
        .eq('role', 'POSTULANTE')
        .order('created_at', { ascending: false })

      if (postulantProfiles && postulantProfiles.length > 0) {
        // Get emails
        const { data: authData } = await admin.auth.admin.listUsers({ perPage: 500 })
        const emailMap = new Map<string, string>()
        if (authData?.users) {
          for (const u of authData.users) {
            emailMap.set(u.id, u.email || '')
          }
        }

        // Count applications per applicant from loaded applications
        const appCounts = new Map<string, number>()
        applications.forEach((a: any) => {
          const aid = a.applicant_id || (a.applicant as any)?.id
          if (aid) appCounts.set(aid, (appCounts.get(aid) || 0) + 1)
        })

        applicants = postulantProfiles.map(p => ({
          ...p,
          email: emailMap.get(p.id) || '',
          application_count: appCounts.get(p.id) || 0,
        }))
      }
    } catch {
      // non-blocking
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
