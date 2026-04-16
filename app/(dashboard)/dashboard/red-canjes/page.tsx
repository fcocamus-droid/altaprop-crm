import { getUserProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/shared/page-header'
import { RedCanjesBrowser } from '@/components/red-canjes/red-canjes-browser'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Red de Canjes - Altaprop' }

export default async function RedCanjesPage() {
  const profile = await getUserProfile()
  if (!profile) redirect('/login')

  const allowedRoles = ['SUPERADMIN', 'AGENTE', 'SUPERADMINBOSS']
  if (!allowedRoles.includes(profile.role)) redirect('/dashboard')

  return (
    <div>
      <PageHeader
        title="Red de Canjes"
        description="Toda la red Altaprop · Hasta 3 gestiones simultáneas por organización · El cupo se libera al pagar la comisión o al vencer los 30 días"
      />
      <RedCanjesBrowser
        currentUserRole={profile.role}
        currentSubscriberId={profile.subscriber_id || profile.id}
      />
    </div>
  )
}
