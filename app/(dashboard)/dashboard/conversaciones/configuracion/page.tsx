import { getUserProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ROLES } from '@/lib/constants'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { WhatsAppIntegrationCard } from '@/components/inbox/whatsapp-config'
import { AIConfigCard } from '@/components/inbox/ai-config'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Configuración de Conversaciones - Altaprop' }

export default async function ConversacionesConfigPage() {
  const profile = await getUserProfile()
  if (!profile) redirect('/login')

  // Only SUPERADMIN and SUPERADMINBOSS can configure their own integrations
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
        title="Configuración de Conversaciones"
        description="Conecta tus canales de mensajería y configura tu asistente IA"
      />

      <div className="space-y-5">
        <WhatsAppIntegrationCard />
        <AIConfigCard />
      </div>
    </div>
  )
}
