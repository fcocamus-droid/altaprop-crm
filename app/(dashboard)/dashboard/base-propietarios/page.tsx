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

  const admin = createAdminClient()
  let subscribers: { id: string; full_name: string }[] = []
  let agents: { id: string; full_name: string }[] = []

  // SUPERADMINBOSS: get subscribers for assignment
  if (profile.role === ROLES.SUPERADMINBOSS) {
    const { data } = await admin.from('profiles').select('id, full_name').eq('role', 'SUPERADMIN').order('full_name')
    subscribers = (data || []).map(s => ({ id: s.id, full_name: s.full_name || 'Sin nombre' }))
  }

  // SUPERADMIN/SUPERADMINBOSS: get agents for assignment
  if (profile.role === ROLES.SUPERADMIN || profile.role === ROLES.SUPERADMINBOSS) {
    let agentQuery = admin.from('profiles').select('id, full_name').in('role', ['AGENTE']).order('full_name')
    if (profile.role === ROLES.SUPERADMIN) {
      agentQuery = admin.from('profiles').select('id, full_name').eq('role', 'AGENTE').eq('subscriber_id', profile.subscriber_id || profile.id).order('full_name')
    }
    const { data } = await agentQuery
    agents = (data || []).map(a => ({ id: a.id, full_name: a.full_name || 'Sin nombre' }))
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
        agents={agents}
      />
    </div>
  )
}
