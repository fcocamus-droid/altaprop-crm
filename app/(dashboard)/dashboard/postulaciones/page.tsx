import { getUserProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getApplicationsByApplicant, getApplicationsByOwner, getAllApplications, getApplicationsBySubscriber, getApplicationsByAgent } from '@/lib/queries/applications'
import { ROLES, isAdmin } from '@/lib/constants'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { Button } from '@/components/ui/button'
import { ApplicationList } from '@/components/applications/application-list'
import { PostulacionesTabs } from '@/components/applications/postulaciones-tabs'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Postulaciones' }

export default async function PostulacionesPage() {
  const profile = await getUserProfile()
  if (!profile) redirect('/login')

  let applications: any[] = []
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
          <ApplicationList applications={applications} isApplicant={true} userRole={profile.role} />
        )
      ) : (
        <PostulacionesTabs
          applications={applications}
          showApplicantsTab={canManage}
          userRole={profile.role}
        />
      )}
    </div>
  )
}
