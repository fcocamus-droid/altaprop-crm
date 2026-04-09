'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/empty-state'
import { formatPrice } from '@/lib/utils'
import { PROPERTY_TYPES, OPERATION_TYPES } from '@/lib/constants'
import { Search, MapPin, Bed, Bath, Maximize, ArrowRight, X } from 'lucide-react'

interface Property {
  id: string
  title: string
  price: number
  currency: string
  type: string
  operation: string
  city: string | null
  sector: string | null
  bedrooms: number | null
  bathrooms: number | null
  sqm: number | null
  images?: { url: string }[]
}

export function ExplorarPropiedades({ properties }: { properties: Property[] }) {
  const [search, setSearch] = useState('')
  const [filterOperation, setFilterOperation] = useState('')
  const [filterType, setFilterType] = useState('')

  const filtered = useMemo(() => {
    return properties.filter(p => {
      // Text search
      if (search) {
        const q = search.toLowerCase()
        const matches = [p.title, p.city, p.sector, p.type]
          .filter(Boolean)
          .some(field => field!.toLowerCase().includes(q))
        if (!matches) return false
      }
      // Operation filter
      if (filterOperation && p.operation !== filterOperation) return false
      // Type filter
      if (filterType && p.type !== filterType) return false
      return true
    })
  }, [properties, search, filterOperation, filterType])

  const hasActiveFilters = search || filterOperation || filterType

  const clearFilters = () => {
    setSearch('')
    setFilterOperation('')
    setFilterType('')
  }

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, ciudad o sector..."
          className="pl-10 h-11"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap gap-2 items-center">
        <select
          value={filterOperation}
          onChange={(e) => setFilterOperation(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Todas las operaciones</option>
          {OPERATION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Todos los tipos</option>
          {PROPERTY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>

        {hasActiveFilters && (
          <button onClick={clearFilters} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
            <X className="h-3 w-3" /> Limpiar filtros
          </button>
        )}

        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length} {filtered.length === 1 ? 'propiedad' : 'propiedades'}
        </span>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <EmptyState
          title="Sin resultados"
          description={hasActiveFilters ? 'Intenta con otros filtros de búsqueda.' : 'No hay propiedades disponibles en este momento.'}
        >
          {hasActiveFilters && (
            <Button variant="outline" onClick={clearFilters}>Limpiar filtros</Button>
          )}
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(property => (
            <PropertyExploreCard key={property.id} property={property} />
          ))}
        </div>
      )}
    </div>
  )
}

function PropertyExploreCard({ property }: { property: Property }) {
  const mainImage = property.images?.[0]?.url || ''
  const thumbUrl = mainImage
    .replace(/-F\.(jpg|webp|png)/g, '-D.$1')
    .replace(/-O\.(jpg|webp|png)/g, '-D.$1')

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow group">
      <div className="flex flex-col sm:flex-row">
        {/* Image */}
        <div className="relative w-full sm:w-48 h-40 sm:h-auto flex-shrink-0 bg-muted overflow-hidden">
          {thumbUrl ? (
            <img
              src={thumbUrl}
              alt={property.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-navy/10 to-gold/10">
              <span className="text-muted-foreground text-xs">Sin imagen</span>
            </div>
          )}
          <div className="absolute top-2 left-2 flex gap-1">
            <Badge className="bg-gold text-navy text-xs font-semibold">
              {property.operation === 'arriendo' ? 'Arriendo' : 'Venta'}
            </Badge>
          </div>
        </div>

        {/* Content */}
        <CardContent className="p-4 flex-1 flex flex-col justify-between">
          <div>
            <p className="text-lg font-bold text-navy mb-1">
              {formatPrice(property.price, property.currency)}
            </p>
            <h3 className="font-semibold text-sm line-clamp-2 mb-2">{property.title}</h3>

            {property.city && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                <MapPin className="h-3 w-3" />
                {property.city}{property.sector ? `, ${property.sector}` : ''}
              </p>
            )}

            <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
              {property.bedrooms != null && property.bedrooms > 0 && (
                <span className="flex items-center gap-1"><Bed className="h-3.5 w-3.5" />{property.bedrooms} dorm.</span>
              )}
              {property.bathrooms != null && property.bathrooms > 0 && (
                <span className="flex items-center gap-1"><Bath className="h-3.5 w-3.5" />{property.bathrooms} baño</span>
              )}
              {property.sqm != null && property.sqm > 0 && (
                <span className="flex items-center gap-1"><Maximize className="h-3.5 w-3.5" />{property.sqm} m²</span>
              )}
              <Badge variant="secondary" className="capitalize text-[10px]">{property.type}</Badge>
            </div>
          </div>

          <Button asChild size="sm" className="w-full bg-navy hover:bg-navy/90">
            <Link href={`/propiedades/${property.id}`}>
              Ver y Postular <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        </CardContent>
      </div>
    </Card>
  )
}
