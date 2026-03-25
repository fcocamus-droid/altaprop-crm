import { getUserProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getApplicationsByApplicant, getApplicationsByOwner, getAllApplications } from '@/lib/queries/applications'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { StatusBadge } from '@/components/shared/status-badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { FileText, ArrowRight } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Postulaciones' }

export default async function PostulacionesPage() {
  const profile = await getUserProfile()
  if (!profile) redirect('/login')

  let applications: any[] = []
  try {
    if (profile.role === 'SUPERADMIN' || profile.role === 'AGENTE') {
      applications = await getAllApplications()
    } else if (profile.role === 'PROPIETARIO') {
      applications = await getApplicationsByOwner(profile.id)
    } else {
      applications = await getApplicationsByApplicant(profile.id)
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

      {applications.length === 0 ? (
        <EmptyState
          title={isApplicant ? 'No tienes postulaciones' : 'No hay postulaciones'}
          description={isApplicant ? 'Explora propiedades disponibles y postula.' : 'Las postulaciones a tus propiedades apareceran aqui.'}
        >
          {isApplicant && (
            <Button asChild><Link href="/propiedades">Explorar Propiedades</Link></Button>
          )}
        </EmptyState>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => (
            <Card key={app.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-navy/10 flex items-center justify-center shrink-0">
                      <FileText className="h-5 w-5 text-navy dark:text-gold" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold truncate">{app.property?.title || 'Propiedad'}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {!isApplicant && <span>{app.applicant?.full_name || 'Postulante'}</span>}
                        <span>{formatDate(app.created_at)}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <StatusBadge status={app.status} type="application" />
                        {app.documents && <span className="text-xs text-muted-foreground">{app.documents.length} doc(s)</span>}
                      </div>
                    </div>
                  </div>
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/dashboard/postulaciones/${app.id}`}><ArrowRight className="h-4 w-4" /></Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
