import { getPropertyById } from '@/lib/queries/properties'
import { notFound } from 'next/navigation'
import { VisitRequestForm } from '@/components/visits/visit-request-form'
import { formatPrice } from '@/lib/utils'
import { MapPin, Bed, Bath, Maximize } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const property = await getPropertyById(params.id)
  return { title: property ? `Solicitar Visita - ${property.title}` : 'Solicitar Visita' }
}

export default async function VisitRequestPage({ params }: { params: { id: string } }) {
  const property = await getPropertyById(params.id)
  if (!property) notFound()

  const mainImage = property.images?.[0]?.url || ''
  const thumbUrl = mainImage.replace(/-F\.(jpg|webp|png)/g, '-D.$1').replace(/-O\.(jpg|webp|png)/g, '-D.$1')

  return (
    <div className="container py-8 max-w-4xl">
      <Link href={`/propiedades/${property.id}`} className="text-sm text-muted-foreground hover:text-navy mb-4 inline-block">
        ← Volver a la propiedad
      </Link>

      <h1 className="text-2xl font-bold text-navy mb-6">Solicitar Orden de Visita</h1>

      {/* Property summary */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex gap-4">
            {thumbUrl && (
              <div className="w-24 h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                <img src={thumbUrl} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex gap-2 mb-1">
                <Badge className="bg-gold text-navy text-xs">{property.operation === 'arriendo' ? 'Arriendo' : 'Venta'}</Badge>
                <Badge variant="secondary" className="capitalize text-xs">{property.type}</Badge>
              </div>
              <h2 className="font-semibold truncate">{property.title}</h2>
              {property.city && (
                <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{property.address && `${property.address}, `}{property.city}</p>
              )}
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                <span className="font-bold text-navy text-sm">{formatPrice(property.price, property.currency)}</span>
                {property.bedrooms != null && <span className="flex items-center gap-1"><Bed className="h-3 w-3" />{property.bedrooms}</span>}
                {property.bathrooms != null && <span className="flex items-center gap-1"><Bath className="h-3 w-3" />{property.bathrooms}</span>}
                {property.sqm != null && <span className="flex items-center gap-1"><Maximize className="h-3 w-3" />{property.sqm}m²</span>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Visit request form with calendar */}
      <VisitRequestForm propertyId={property.id} />
    </div>
  )
}
