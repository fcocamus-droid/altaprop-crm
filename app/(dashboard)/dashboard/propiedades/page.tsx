import { getUserProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getPropertiesByOwner, getPropertiesByAgent, getAllProperties, getPropertiesBySubscriber } from '@/lib/queries/properties'
import { RoleGuard } from '@/components/auth/role-guard'
import { isAdmin, ROLES, PROPERTY_MANAGER_ROLES } from '@/lib/constants'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { ImportProperty } from '@/components/properties/import-property'
import { PropertyList } from '@/components/properties/property-list'
import { UpgradeBanner } from '@/components/shared/upgrade-banner'
import { canImportProperties } from '@/lib/plan-features'
import { getEffectivePlan } from '@/lib/plan-features-server'
import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Mis Propiedades' }

export default async function PropiedadesDashboardPage() {
  const profile = await getUserProfile()
  if (!profile) redirect('/login')

  // ── Helper: build the agents query for this profile ───────────────────────
  function fetchAgents() {
    if (!isAdmin(profile!.role)) return Promise.resolve([])
    const supabase = createClient()
    const query = profile!.role === ROLES.SUPERADMIN
      ? supabase.from('profiles').select('id, full_name')
          .eq('subscriber_id', profile!.subscriber_id || profile!.id)
          .in('role', ['AGENTE', 'SUPERADMIN']).order('full_name')
      : supabase.from('profiles').select('id, full_name')
          .in('role', ['AGENTE', 'SUPERADMIN']).order('full_name')
    return query.then(({ data }) => data || [])
  }

  // ── Helper: fetch properties for this profile ─────────────────────────────
  function fetchProperties() {
    if (profile!.role === ROLES.SUPERADMINBOSS) return getAllProperties()
    if (profile!.role === ROLES.SUPERADMIN) return getPropertiesBySubscriber(profile!.subscriber_id || profile!.id)
    if (profile!.role === 'AGENTE') return getPropertiesByAgent(profile!.id)
    return getPropertiesByOwner(profile!.id)
  }

  // ── Fetch everything in parallel ─────────────────────────────────────────
  let properties: any[] = []
  let agents:     any[] = []
  let effectivePlan: string | null = null

  try {
    ;[effectivePlan, properties, agents] = await Promise.all([
      getEffectivePlan(profile),
      fetchProperties(),
      fetchAgents(),
    ])
  } catch {
    // Supabase may not be configured yet
  }

  return (
    <RoleGuard allowedRoles={PROPERTY_MANAGER_ROLES}>
      <PageHeader title="Propiedades" description="Gestiona tus propiedades publicadas">
        <Button asChild>
          <Link href="/dashboard/propiedades/nueva"><Plus className="mr-2 h-4 w-4" />Nueva Propiedad</Link>
        </Button>
      </PageHeader>

      {canImportProperties(effectivePlan) ? (
        <ImportProperty />
      ) : (
        <UpgradeBanner feature="Importar propiedades desde tu sitio web" requiredPlan="Básico" />
      )}

      {properties.length === 0 ? (
        <EmptyState title="No tienes propiedades" description="Publica tu primera propiedad para empezar a recibir postulaciones.">
          <Button asChild><Link href="/dashboard/propiedades/nueva">Publicar Propiedad</Link></Button>
        </EmptyState>
      ) : (
        <PropertyList properties={properties} agents={agents} currentUserRole={profile.role} />
      )}
    </RoleGuard>
  )
}
