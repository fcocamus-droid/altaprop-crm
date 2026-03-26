import { getUserProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getPropertiesByOwner, getPropertiesByAgent, getAllProperties } from '@/lib/queries/properties'
import { RoleGuard } from '@/components/auth/role-guard'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { StatusBadge } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { Plus, Pencil } from 'lucide-react'
import { ImportProperty } from '@/components/properties/import-property'
import { PropertyList } from '@/components/properties/property-list'
import { formatPrice } from '@/lib/utils'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Mis Propiedades' }

export default async function PropiedadesDashboardPage() {
  const profile = await getUserProfile()
  if (!profile) redirect('/login')

  let properties: any[] = []
  try {
    if (profile.role === 'SUPERADMIN') {
      properties = await getAllProperties()
    } else if (profile.role === 'AGENTE') {
      properties = await getPropertiesByAgent(profile.id)
    } else {
      properties = await getPropertiesByOwner(profile.id)
    }
  } catch {
    // Supabase may not be configured yet
  }

  return (
    <RoleGuard allowedRoles={['SUPERADMIN', 'AGENTE', 'PROPIETARIO']}>
      <PageHeader title="Propiedades" description="Gestiona tus propiedades publicadas">
        <Button asChild>
          <Link href="/dashboard/propiedades/nueva"><Plus className="mr-2 h-4 w-4" />Nueva Propiedad</Link>
        </Button>
      </PageHeader>

      <ImportProperty />

      {properties.length === 0 ? (
        <EmptyState title="No tienes propiedades" description="Publica tu primera propiedad para empezar a recibir postulaciones.">
          <Button asChild><Link href="/dashboard/propiedades/nueva">Publicar Propiedad</Link></Button>
        </EmptyState>
      ) : (
        <PropertyList properties={properties} />
      )}
    </RoleGuard>
  )
}
