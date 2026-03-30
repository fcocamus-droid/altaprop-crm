import { getUserProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { isAdmin, ROLES } from '@/lib/constants'
import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/shared/page-header'
import { PropietariosDatabase } from '@/components/properties/propietarios-database'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Base de Propietarios - Altaprop' }

export default async function BasePropietariosPage() {
  const profile = await getUserProfile()
  if (!profile) redirect('/login')

  if (!isAdmin(profile.role) && profile.role !== 'AGENTE') {
    redirect('/dashboard')
  }

  // Get subscribers list for SUPERADMINBOSS assignment
  let subscribers: { id: string; full_name: string }[] = []
  if (profile.role === ROLES.SUPERADMINBOSS) {
    const admin = createAdminClient()
    const { data } = await admin
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'SUPERADMIN')
      .order('full_name')
    subscribers = (data || []).map(s => ({ id: s.id, full_name: s.full_name || 'Sin nombre' }))
  }

  return (
    <div>
      <PageHeader
        title="Base de Propietarios"
        description="Propietarios que desean publicar sus propiedades"
      />
      <PropietariosDatabase
        currentUserRole={profile.role}
        subscribers={subscribers}
      />
    </div>
  )
}
