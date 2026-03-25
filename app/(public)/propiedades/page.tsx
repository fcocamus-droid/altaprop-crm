import { getProperties } from '@/lib/queries/properties'
import { PropertyCard } from '@/components/properties/property-card'
import { PROPERTY_TYPES, OPERATION_TYPES } from '@/lib/constants'
import { EmptyState } from '@/components/shared/empty-state'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Propiedades' }

export default async function PropiedadesPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined }
}) {
  let properties: any[] = []
  try {
    properties = await getProperties({
      type: searchParams.type,
      operation: searchParams.operation,
      city: searchParams.city,
      minPrice: searchParams.minPrice ? Number(searchParams.minPrice) : undefined,
      maxPrice: searchParams.maxPrice ? Number(searchParams.maxPrice) : undefined,
      bedrooms: searchParams.bedrooms ? Number(searchParams.bedrooms) : undefined,
    })
  } catch {
    // Supabase may not be configured yet
  }

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Propiedades</h1>
        <p className="text-muted-foreground">Encuentra tu propiedad ideal en arriendo o venta.</p>
      </div>

      {/* Filters */}
      <form className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8 p-4 bg-muted/50 rounded-lg">
        <select name="operation" defaultValue={searchParams.operation || ''} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
          <option value="">Operacion</option>
          {OPERATION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select name="type" defaultValue={searchParams.type || ''} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
          <option value="">Tipo</option>
          {PROPERTY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <input name="city" defaultValue={searchParams.city || ''} placeholder="Ciudad" className="h-10 rounded-md border border-input bg-background px-3 text-sm" />
        <input name="bedrooms" type="number" defaultValue={searchParams.bedrooms || ''} placeholder="Dormitorios min." className="h-10 rounded-md border border-input bg-background px-3 text-sm" min={0} />
        <Button type="submit">Buscar</Button>
      </form>

      {properties.length === 0 ? (
        <EmptyState title="No hay propiedades disponibles" description="Vuelve a intentar con otros filtros o registrate para publicar tu propiedad.">
          <Button asChild><Link href="/register">Publicar Propiedad</Link></Button>
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map(property => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      )}
    </div>
  )
}
