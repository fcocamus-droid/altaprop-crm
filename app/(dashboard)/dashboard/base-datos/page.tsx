import { getUserProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/shared/page-header'
import { ContactsDatabase } from '@/components/crm/contacts-database'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Base de Datos CRM - Altaprop' }

export default async function BaseDatosPage() {
  const profile = await getUserProfile()
  if (!profile) redirect('/login')

  // Exclusive to SUPERADMINBOSS
  if (profile.role !== 'SUPERADMINBOSS') redirect('/dashboard')

  return (
    <div>
      <PageHeader
        title="Base de Datos"
        description="Todos los contactos del sistema · campañas de email y WhatsApp"
      />
      <ContactsDatabase />
    </div>
  )
}
