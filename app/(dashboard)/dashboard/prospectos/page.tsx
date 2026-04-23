import { getUserProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { isAdmin, ROLES } from '@/lib/constants'
import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/shared/page-header'
import { ProspectosCRM } from '@/components/prospectos/prospectos-crm'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Prospectos - Altaprop' }

export default async function ProspectosPage() {
  const profile = await getUserProfile()
  if (!profile) redirect('/login')

  if (!isAdmin(profile.role) && profile.role !== 'AGENTE') {
    redirect('/dashboard')
  }

  const admin = createAdminClient()
  let subscribers: { id: string; full_name: string }[] = []
  let agents: { id: string; full_name: string }[] = []

  // SUPERADMINBOSS: list all subscribers
  if (profile.role === ROLES.SUPERADMINBOSS) {
    const { data } = await admin.from('profiles').select('id, full_name').eq('role', 'SUPERADMIN').order('full_name')
    subscribers = (data || []).map(s => ({ id: s.id, full_name: s.full_name || 'Sin nombre' }))
  }

  // SUPERADMIN/SUPERADMINBOSS: list agents
  if (profile.role === ROLES.SUPERADMIN || profile.role === ROLES.SUPERADMINBOSS) {
    let q = admin.from('profiles').select('id, full_name').eq('role', 'AGENTE').order('full_name')
    if (profile.role === ROLES.SUPERADMIN) {
      q = q.eq('subscriber_id', profile.subscriber_id || profile.id)
    }
    const { data } = await q
    agents = (data || []).map(a => ({ id: a.id, full_name: a.full_name || 'Sin nombre' }))
  }

  // AGENTE: list themselves for self-assignment
  if (profile.role === ROLES.AGENTE) {
    agents = [{ id: profile.id, full_name: profile.full_name || 'Yo' }]
  }

  return (
    <div>
      <PageHeader
        title="Prospectos"
        description="Pipeline de ventas — gestiona leads, tareas y seguimiento"
      />
      <ProspectosCRM
        currentUserRole={profile.role}
        subscribers={subscribers}
        agents={agents}
      />
    </div>
  )
}
