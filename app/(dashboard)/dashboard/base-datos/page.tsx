import { getUserProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/shared/page-header'
import { ContactsDatabase } from '@/components/crm/contacts-database'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Base de Datos CRM - Altaprop' }

export default async function BaseDatosPage() {
  const profile = await getUserProfile()
  if (!profile) redirect('/login')

  // SUPERADMINBOSS sees everything; SUPERADMIN sees only their org's data
  if (profile.role !== 'SUPERADMINBOSS' && profile.role !== 'SUPERADMIN') {
    redirect('/dashboard')
  }

  const isBoss = profile.role === 'SUPERADMINBOSS'

  return (
    <div>
      <PageHeader
        title="Base de Datos"
        description={isBoss
          ? 'Todos los contactos del sistema · campañas de email y WhatsApp'
          : 'Todos los contactos de tu organización · campañas de email y WhatsApp'}
      />
      <ContactsDatabase />
    </div>
  )
}
