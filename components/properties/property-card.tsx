'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { Bed, Bath, Maximize, MapPin } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatPrice } from '@/lib/utils'
import type { Property } from '@/types'

export function PropertyCard({ property }: { property: Property }) {
  const mainImage = property.images?.[0]?.url || ''
  const operationLabel = property.operation === 'arriendo' ? 'Arriendo' : 'Venta'
  const [imgError, setImgError] = useState(false)

  return (
    <Link href={`/propiedades/${property.id}`}>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow group">
        <div className="relative aspect-[4/3] overflow-hidden">
          <div className="absolute inset-0 bg-navy/20 z-10" />
          {property.images && property.images.length > 0 && !imgError ? (
            <Image
              src={mainImage}
              alt={property.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-navy/10 to-gold/10 flex items-center justify-center">
              <span className="text-muted-foreground text-sm">Sin imagen</span>
            </div>
          )}
          <div className="absolute top-3 left-3 z-20 flex gap-2">
            <Badge className="bg-gold text-navy font-semibold">{operationLabel}</Badge>
            <Badge variant="secondary" className="capitalize">{property.type}</Badge>
          </div>
        </div>
        <CardContent className="p-4">
          <p className="text-lg font-bold text-navy dark:text-gold mb-1">
            {formatPrice(property.price, property.currency)}
          </p>
          <h3 className="font-semibold text-sm line-clamp-1 mb-2">{property.title}</h3>
          {property.city && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mb-3">
              <MapPin className="h-3 w-3" />
              {property.city}{property.sector ? `, ${property.sector}` : ''}
            </p>
          )}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {property.bedrooms != null && (
              <span className="flex items-center gap-1"><Bed className="h-3.5 w-3.5" />{property.bedrooms}</span>
            )}
            {property.bathrooms != null && (
              <span className="flex items-center gap-1"><Bath className="h-3.5 w-3.5" />{property.bathrooms}</span>
            )}
            {property.sqm != null && (
              <span className="flex items-center gap-1"><Maximize className="h-3.5 w-3.5" />{property.sqm} m²</span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
