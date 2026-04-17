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
    const supabase = createClient()

    // Build both queries up-front and run them in parallel
    let visitsPromise: Promise<any[]>
    let propertiesPromise: Promise<{ data: any[] | null }>

    if (profile.role === ROLES.SUPERADMINBOSS) {
      visitsPromise = getAllVisits()
      propertiesPromise = supabase.from('properties').select('id, title').order('title') as any
    } else if (profile.role === ROLES.SUPERADMIN) {
      visitsPromise = getVisitsBySubscriber(profile.subscriber_id || profile.id)
      propertiesPromise = supabase.from('properties').select('id, title').eq('subscriber_id', profile.subscriber_id || profile.id).order('title') as any
    } else if (profile.role === 'AGENTE') {
      visitsPromise = getVisitsByAgent(profile.id)
      propertiesPromise = supabase.from('properties').select('id, title').eq('agent_id', profile.id).order('title') as any
    } else if (profile.role === 'PROPIETARIO') {
      visitsPromise = getVisitsByPropertyOwner(profile.id)
      propertiesPromise = supabase.from('properties').select('id, title').eq('owner_id', profile.id).order('title') as any
    } else {
      visitsPromise = getVisitsByVisitor(profile.id)
      propertiesPromise = Promise.resolve({ data: null }) as any
    }

    const [visitsData, propertiesResult] = await Promise.all([visitsPromise, propertiesPromise])
    visits = visitsData
    properties = (propertiesResult as any).data || []
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
