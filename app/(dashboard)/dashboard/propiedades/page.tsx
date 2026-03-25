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

      {properties.length === 0 ? (
        <EmptyState title="No tienes propiedades" description="Publica tu primera propiedad para empezar a recibir postulaciones.">
          <Button asChild><Link href="/dashboard/propiedades/nueva">Publicar Propiedad</Link></Button>
        </EmptyState>
      ) : (
        <div className="space-y-4">
          {properties.map((property) => (
            <Card key={property.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted shrink-0">
                      {property.images?.[0]?.url ? (
                        <img src={property.images[0].url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">N/A</div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold truncate">{property.title}</h3>
                      <p className="text-sm text-muted-foreground">{property.city}{property.sector ? `, ${property.sector}` : ''}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-semibold text-sm text-navy dark:text-gold">{formatPrice(property.price, property.currency)}</span>
                        <StatusBadge status={property.status} type="property" />
                      </div>
                    </div>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/dashboard/propiedades/${property.id}`}><Pencil className="mr-2 h-3 w-3" />Editar</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </RoleGuard>
  )
}
