import { getUserProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { isAdmin } from '@/lib/constants'
import { PageHeader } from '@/components/shared/page-header'
import { ApplicantsDatabase } from '@/components/applications/applicants-database'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Base de Postulantes - Altaprop' }

export default async function BasePostulantesPage() {
  const profile = await getUserProfile()
  if (!profile) redirect('/login')

  // Only admins and agents can see this
  if (!isAdmin(profile.role) && profile.role !== 'AGENTE') {
    redirect('/dashboard')
  }

  return (
    <div>
      <PageHeader
        title="Base de Postulantes"
        description="Consulta los datos de todos los postulantes registrados"
      />
      <ApplicantsDatabase />
    </div>
  )
}
