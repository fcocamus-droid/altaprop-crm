import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatPrice, formatDate } from '@/lib/utils'
import { Bed, Bath, Maximize, MapPin, Calendar, MessageCircle, ArrowLeft, Phone } from 'lucide-react'
import Link from 'next/link'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

async function getSubscriberBySubdomain(subdomain: string) {
  const admin = createAdminClient()
  const { data: bySubdomain } = await admin
    .from('profiles')
    .select('id, full_name, website_enabled, website_primary_color, website_accent_color, website_whatsapp, email, phone')
    .eq('website_subdomain', subdomain)
    .eq('website_enabled', true)
    .maybeSingle()
  if (bySubdomain) return bySubdomain

  const { data: byDomain } = await admin
    .from('profiles')
    .select('id, full_name, website_enabled, website_primary_color, website_accent_color, website_whatsapp, email, phone')
    .eq('website_domain', subdomain)
    .eq('website_enabled', true)
    .maybeSingle()
  return byDomain
}

async function getProperty(propertyId: string, subscriberId: string) {
  const admin = createAdminClient()
  const { data } = await admin
    .from('properties')
    .select('*, images:property_images(*)')
    .eq('id', propertyId)
    .eq('subscriber_id', subscriberId)
    .single()
  return data
}

export async function generateMetadata({
  params,
}: {
  params: { subdomain: string; id: string }
}): Promise<Metadata> {
  const subscriber = await getSubscriberBySubdomain(decodeURIComponent(params.subdomain))
  if (!subscriber) return { title: 'Propiedad no encontrada' }
  const property = await getProperty(params.id, subscriber.id)
  if (!property) return { title: 'Propiedad no encontrada' }
  return {
    title: property.title,
    description: property.description || `${property.type} en ${property.operation}`,
  }
}

export default async function SitePropertyDetailPage({
  params,
}: {
  params: { subdomain: string; id: string }
}) {
  const subscriber = await getSubscriberBySubdomain(decodeURIComponent(params.subdomain))
  if (!subscriber) notFound()

  const property = await getProperty(params.id, subscriber.id)
  if (!property) notFound()

  const primaryColor = subscriber.website_primary_color || '#1a2332'
  const accentColor  = subscriber.website_accent_color  || '#c9a84c'

  const location = [property.address, property.sector, property.city].filter(Boolean).join(', ')

  // Build WhatsApp message
  const waText = encodeURIComponent(
    `Hola! Me interesa la propiedad "${property.title}"${location ? ` en ${location}` : ''}. ¿Está disponible?`
  )
  const waUrl = subscriber.website_whatsapp
    ? `https://wa.me/${subscriber.website_whatsapp.replace(/\D/g, '')}?text=${waText}`
    : null

  return (
    <div className="container py-8">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          href="/propiedades"
          className="inline-flex items-center gap-1 text-sm font-medium hover:underline"
          style={{ color: primaryColor }}
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a propiedades
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Image gallery */}
          {property.images && property.images.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {property.images.map((img: any, i: number) => (
                <div
                  key={img.id}
                  className={`relative overflow-hidden rounded-lg ${i === 0 ? 'col-span-2 row-span-2 aspect-[4/3]' : 'aspect-square'}`}
                >
                  <img src={img.url} alt={`${property.title} - ${i + 1}`} className="object-cover w-full h-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
              <p className="text-muted-foreground">Sin imágenes disponibles</p>
            </div>
          )}

          {/* Details */}
          <div>
            <div className="flex gap-2 mb-3">
              <Badge style={{ background: accentColor, color: primaryColor }} className="font-semibold">
                {property.operation === 'arriendo' ? 'Arriendo' : 'Venta'}
              </Badge>
              <Badge variant="secondary" className="capitalize">{property.type}</Badge>
            </div>
            <h1 className="text-3xl font-bold mb-2">{property.title}</h1>
            {location && (
              <p className="text-muted-foreground flex items-center gap-1 mb-4">
                <MapPin className="h-4 w-4" />{location}
              </p>
            )}
          </div>

          {/* Features */}
          <div className="grid grid-cols-3 gap-4">
            {property.bedrooms != null && (
              <Card>
                <CardContent className="pt-4 text-center">
                  <Bed className="h-5 w-5 mx-auto mb-1" style={{ color: primaryColor }} />
                  <p className="font-semibold">{property.bedrooms}</p>
                  <p className="text-xs text-muted-foreground">Dormitorios</p>
                </CardContent>
              </Card>
            )}
            {property.bathrooms != null && (
              <Card>
                <CardContent className="pt-4 text-center">
                  <Bath className="h-5 w-5 mx-auto mb-1" style={{ color: primaryColor }} />
                  <p className="font-semibold">{property.bathrooms}</p>
                  <p className="text-xs text-muted-foreground">Baños</p>
                </CardContent>
              </Card>
            )}
            {property.sqm != null && (
              <Card>
                <CardContent className="pt-4 text-center">
                  <Maximize className="h-5 w-5 mx-auto mb-1" style={{ color: primaryColor }} />
                  <p className="font-semibold">{property.sqm} m²</p>
                  <p className="text-xs text-muted-foreground">Superficie</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Description */}
          {property.description && (
            <Card>
              <CardHeader><CardTitle>Descripción</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{property.description}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div>
          <Card className="sticky top-20">
            <CardContent className="pt-6 space-y-4">
              <p className="text-3xl font-bold mb-1" style={{ color: primaryColor }}>
                {formatPrice(property.price, property.currency)}
              </p>
              {property.operation === 'arriendo' && (
                <p className="text-sm text-muted-foreground -mt-2">mensual</p>
              )}

              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Publicado {formatDate(property.created_at)}
              </div>

              {/* Contact CTAs */}
              {waUrl && (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ background: '#25D366' }}
                >
                  <MessageCircle className="h-4 w-4" />
                  Consultar por WhatsApp
                </a>
              )}

              {subscriber.phone && (
                <a
                  href={`tel:${subscriber.phone.replace(/\s/g, '')}`}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-lg text-sm font-semibold border transition-colors hover:opacity-90"
                  style={{ borderColor: primaryColor + '40', color: primaryColor }}
                >
                  <Phone className="h-4 w-4" />
                  Llamar al agente
                </a>
              )}

              {subscriber.email && (
                <a
                  href={`mailto:${subscriber.email}?subject=Consulta por: ${property.title}`}
                  className="flex items-center justify-center gap-2 w-full py-2 text-sm text-center text-muted-foreground hover:underline"
                >
                  {subscriber.email}
                </a>
              )}

              <p className="text-xs text-muted-foreground text-center pt-2 border-t">
                Powered by{' '}
                <a href="https://altaprop-app.cl" target="_blank" rel="noopener noreferrer" className="hover:underline">
                  Altaprop
                </a>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
