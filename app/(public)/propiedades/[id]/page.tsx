import { getPropertyById } from '@/lib/queries/properties'
import { getUserProfile } from '@/lib/auth'
import { notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ApplyButton } from '@/components/applications/apply-button'
import { VisitCalendarToggle } from '@/components/visits/visit-calendar-toggle'
import { formatPrice, formatDate } from '@/lib/utils'
import { Bed, Bath, Maximize, MapPin, Calendar, User, Phone } from 'lucide-react'
import Link from 'next/link'
import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const property = await getPropertyById(params.id)
  if (!property) return { title: 'Propiedad no encontrada' }
  return { title: property.title, description: property.description || `${property.type} en ${property.operation}` }
}

export default async function PropertyDetailPage({ params }: { params: { id: string } }) {
  const property = await getPropertyById(params.id)
  if (!property) notFound()

  const profile = await getUserProfile()
  const canApply = profile?.role === 'POSTULANTE'

  return (
    <div className="container py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Image Gallery */}
          <div className="grid grid-cols-1 gap-2">
            {property.images && property.images.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {property.images.map((img, i) => (
                  <div key={img.id} className={`relative overflow-hidden rounded-lg ${i === 0 ? 'col-span-2 row-span-2 aspect-[4/3]' : 'aspect-square'}`}>
                    <img src={img.url} alt={`${property.title} - ${i + 1}`} className="object-cover w-full h-full" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                <p className="text-muted-foreground">Sin imagenes disponibles</p>
              </div>
            )}
          </div>

          {/* Details */}
          <div>
            <div className="flex gap-2 mb-3">
              <Badge className="bg-gold text-navy">{property.operation === 'arriendo' ? 'Arriendo' : 'Venta'}</Badge>
              <Badge variant="secondary" className="capitalize">{property.type}</Badge>
            </div>
            <h1 className="text-3xl font-bold mb-2">{property.title}</h1>
            {property.city && (
              <p className="text-muted-foreground flex items-center gap-1 mb-4">
                <MapPin className="h-4 w-4" />{property.address && `${property.address}, `}{property.city}{property.sector ? `, ${property.sector}` : ''}
              </p>
            )}
          </div>

          {/* Features */}
          <div className="grid grid-cols-3 gap-4">
            {property.bedrooms != null && (
              <Card><CardContent className="pt-4 text-center"><Bed className="h-5 w-5 mx-auto mb-1 text-navy dark:text-gold" /><p className="font-semibold">{property.bedrooms}</p><p className="text-xs text-muted-foreground">Dormitorios</p></CardContent></Card>
            )}
            {property.bathrooms != null && (
              <Card><CardContent className="pt-4 text-center"><Bath className="h-5 w-5 mx-auto mb-1 text-navy dark:text-gold" /><p className="font-semibold">{property.bathrooms}</p><p className="text-xs text-muted-foreground">Banos</p></CardContent></Card>
            )}
            {property.sqm != null && (
              <Card><CardContent className="pt-4 text-center"><Maximize className="h-5 w-5 mx-auto mb-1 text-navy dark:text-gold" /><p className="font-semibold">{property.sqm} m²</p><p className="text-xs text-muted-foreground">Superficie</p></CardContent></Card>
            )}
          </div>

          {/* Description */}
          {property.description && (
            <Card>
              <CardHeader><CardTitle>Descripcion</CardTitle></CardHeader>
              <CardContent><p className="text-sm whitespace-pre-wrap">{property.description}</p></CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card className="sticky top-20">
            <CardContent className="pt-6">
              <p className="text-3xl font-bold text-navy dark:text-gold mb-1">{formatPrice(property.price, property.currency)}</p>
              <p className="text-sm text-muted-foreground mb-4">{property.operation === 'arriendo' ? 'mensual' : ''}</p>

              <div className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
                <Calendar className="h-4 w-4" />Publicado {formatDate(property.created_at)}
              </div>

              {property.owner && (
                <div className="border-t pt-4 mb-4">
                  <p className="text-sm font-medium flex items-center gap-2"><User className="h-4 w-4" />{(property.owner as any).full_name}</p>
                  {(property.owner as any).phone && (
                    <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1"><Phone className="h-4 w-4" />{(property.owner as any).phone}</p>
                  )}
                </div>
              )}

              {canApply ? (
                <ApplyButton propertyId={property.id} propertyTitle={property.title} />
              ) : profile ? (
                <p className="text-sm text-muted-foreground text-center">Solo postulantes pueden aplicar</p>
              ) : (
                <>
                  <Button asChild className="w-full" size="lg">
                    <Link href={`/registro-postulante?property=${property.id}`}>Inicia sesion para postular</Link>
                  </Button>
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    ¿Ya tienes cuenta?{' '}
                    <Link href={`/login?redirect=/propiedades/${property.id}`} className="text-primary hover:underline">
                      Inicia sesión aquí
                    </Link>
                  </p>
                </>
              )}

              <VisitCalendarToggle propertyId={property.id} propertyTitle={property.title} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
