import { getUserProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { RoleGuard } from '@/components/auth/role-guard'
import { PageHeader } from '@/components/shared/page-header'
import { VisitsView } from '@/components/visits/visits-view'
import { ScheduleManager } from '@/components/visits/schedule-manager'
import { getAllVisits, getVisitsByVisitor, getVisitsByPropertyOwner, getVisitsByAgent, getVisitsBySubscriber } from '@/lib/queries/visits'
import { PROPERTY_MANAGER_ROLES, isAdmin, ROLES } from '@/lib/constants'
import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Visitas - Altaprop' }

export default async function VisitasPage() {
  const profile = await getUserProfile()
  if (!profile) redirect('/login')

  let visits: any[] = []
  let properties: any[] = []

  try {
    if (profile.role === ROLES.SUPERADMINBOSS) {
      visits = await getAllVisits()
    } else if (profile.role === ROLES.SUPERADMIN) {
      visits = await getVisitsBySubscriber(profile.subscriber_id || profile.id)
    } else if (profile.role === 'AGENTE') {
      visits = await getVisitsByAgent(profile.id)
    } else if (profile.role === 'PROPIETARIO') {
      visits = await getVisitsByPropertyOwner(profile.id)
    } else {
      visits = await getVisitsByVisitor(profile.id)
    }

    // Get properties for the create form
    const supabase = createClient()
    if (profile.role === ROLES.SUPERADMINBOSS) {
      const { data } = await supabase.from('properties').select('id, title').order('title')
      properties = data || []
    } else if (profile.role === ROLES.SUPERADMIN) {
      const { data } = await supabase.from('properties').select('id, title').eq('subscriber_id', profile.subscriber_id || profile.id).order('title')
      properties = data || []
    } else if (profile.role === 'AGENTE') {
      const { data } = await supabase.from('properties').select('id, title').eq('agent_id', profile.id).order('title')
      properties = data || []
    } else if (profile.role === 'PROPIETARIO') {
      const { data } = await supabase.from('properties').select('id, title').eq('owner_id', profile.id).order('title')
      properties = data || []
    }
  } catch {
    // Supabase may not be configured yet
  }

  const canCreate = PROPERTY_MANAGER_ROLES.includes(profile.role as any)

  return (
    <RoleGuard allowedRoles={PROPERTY_MANAGER_ROLES}>
      <PageHeader title="Visitas" description="Gestiona las visitas agendadas a propiedades" />
      <VisitsView visits={visits} properties={properties} canCreate={canCreate} />
    </RoleGuard>
  )
}
