import { getUserProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ROLES } from '@/lib/constants'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { ConversationsMetrics } from '@/components/inbox/metrics'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Métricas de Conversaciones - Altaprop' }

export default async function ConversacionesMetricsPage() {
  const profile = await getUserProfile()
  if (!profile) redirect('/login')
  if (profile.role !== ROLES.SUPERADMIN && profile.role !== ROLES.SUPERADMINBOSS) {
    redirect('/dashboard/conversaciones')
  }

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/conversaciones"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-navy"
      >
        <ChevronLeft className="h-4 w-4" /> Volver al Inbox
      </Link>

      <PageHeader
        title="Métricas de Conversaciones"
        description="Volumen, conversiones y captura de leads del módulo de mensajería"
      />

      <ConversationsMetrics isBoss={profile.role === ROLES.SUPERADMINBOSS} />
    </div>
  )
}
