import { createAdminClient } from '@/lib/supabase/admin'
import { getSubscriberProfile } from '@/lib/queries/website'
import { notFound } from 'next/navigation'
import { unstable_noStore as noStore } from 'next/cache'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatPrice, formatDate } from '@/lib/utils'
import {
  Bed, Bath, Maximize, MapPin, Calendar, MessageCircle,
  ArrowLeft, Phone, Car, Package, CheckCircle2, Video,
  LayoutGrid, Building2, Ruler,
} from 'lucide-react'
import Link from 'next/link'
import { SiteVisitRequestButton } from '@/components/site/site-visit-request-button'
import { SiteApplyButton } from '@/components/site/site-apply-button'
import { SiteImageCarousel } from '@/components/site/site-image-carousel'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

async function getProperty(propertyId: string, subscriberId: string) {
  noStore()
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
  const subscriber = await getSubscriberProfile(decodeURIComponent(params.subdomain))
  if (!subscriber) return { title: 'Propiedad no encontrada' }
  const property = await getProperty(params.id, subscriber.id)
  if (!property) return { title: 'Propiedad no encontrada' }
  return {
    title: property.title,
    description: property.description || `${property.type} en ${property.operation}`,
  }
}

const OPERATION_LABELS: Record<string, string> = {
  arriendo: 'Arriendo',
  arriendo_temporal: 'Arriendo Temporal',
  venta: 'Venta',
}

const TYPE_LABELS: Record<string, string> = {
  departamento: 'Departamento', casa: 'Casa', casa_condominio: 'Casa en Condominio',
  villa: 'Villa', quinta: 'Quinta', monoambiente: 'Monoambiente',
  terreno: 'Terreno', terreno_comercial: 'Terreno Comercial', oficina: 'Oficina',
  local: 'Local Comercial', bodega: 'Bodega', edificio: 'Edificio',
  hotel: 'Hotel', nave_industrial: 'Nave Industrial',
}

const CONDITION_LABELS: Record<string, string> = {
  nuevo: 'Nuevo', en_construccion: 'En Construcción', segunda_mano: 'Segunda Mano',
  remodelada: 'Remodelada', en_planos: 'En Planos',
}

export default async function SitePropertyDetailPage({
  params,
}: {
  params: { subdomain: string; id: string }
}) {
  const subscriber = await getSubscriberProfile(decodeURIComponent(params.subdomain))
  if (!subscriber) notFound()

  const property = await getProperty(params.id, subscriber.id)
  if (!property) notFound()

  const primaryColor = subscriber.website_primary_color || '#1a2332'
  const accentColor  = subscriber.website_accent_color  || '#c9a84c'

  const location = [property.address, property.sector, property.city, property.region]
    .filter(Boolean).join(', ')

  const waText = encodeURIComponent(
    `Hola! Me interesa la propiedad "${property.title}"${location ? ` en ${location}` : ''}. ¿Está disponible?`
  )
  const waUrl = subscriber.website_whatsapp
    ? `https://wa.me/${subscriber.website_whatsapp.replace(/\D/g, '')}?text=${waText}`
    : null

  const carouselImages = (property.images || [])
    .sort((a: any, b: any) => a.order - b.order)
    .map((img: any) => ({ url: img.url, alt: property.title }))

  return (
    <div className="container py-8 max-w-6xl">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          href="/"
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

          {/* Image carousel */}
          <SiteImageCarousel images={carouselImages} title={property.title} />

          {/* Title & badges */}
          <div>
            <div className="flex flex-wrap gap-2 mb-3">
              <Badge style={{ background: accentColor, color: primaryColor }} className="font-semibold">
                {OPERATION_LABELS[property.operation] || property.operation}
              </Badge>
              <Badge variant="secondary" className="capitalize">
                {TYPE_LABELS[property.type] || property.type}
              </Badge>
              {property.condition && (
                <Badge variant="outline">{CONDITION_LABELS[property.condition] || property.condition}</Badge>
              )}
              {property.exclusive && (
                <Badge className="bg-amber-100 text-amber-800 border-amber-200">Exclusiva</Badge>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">{property.title}</h1>
            {location && (
              <p className="text-muted-foreground flex items-center gap-1 mb-1">
                <MapPin className="h-4 w-4 flex-shrink-0" />{location}
              </p>
            )}
            {property.internal_code && (
              <p className="text-xs text-muted-foreground">Ref: {property.internal_code}</p>
            )}
          </div>

          {/* Key stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {property.bedrooms != null && (
              <StatCard icon={<Bed className="h-5 w-5" />} value={property.bedrooms} label="Dormitorios" color={primaryColor} />
            )}
            {property.bathrooms != null && (
              <StatCard icon={<Bath className="h-5 w-5" />} value={property.bathrooms} label="Baños" color={primaryColor} />
            )}
            {property.sqm != null && (
              <StatCard icon={<Maximize className="h-5 w-5" />} value={`${property.sqm} m²`} label="Superficie" color={primaryColor} />
            )}
            {property.covered_sqm != null && (
              <StatCard icon={<Ruler className="h-5 w-5" />} value={`${property.covered_sqm} m²`} label="Construida" color={primaryColor} />
            )}
            {property.terrace_sqm != null && (
              <StatCard icon={<LayoutGrid className="h-5 w-5" />} value={`${property.terrace_sqm} m²`} label="Terraza/Logia" color={primaryColor} />
            )}
            {property.parking != null && property.parking > 0 && (
              <StatCard icon={<Car className="h-5 w-5" />} value={property.parking} label="Estacionam." color={primaryColor} />
            )}
            {property.storage != null && property.storage > 0 && (
              <StatCard icon={<Package className="h-5 w-5" />} value={property.storage} label="Bodega(s)" color={primaryColor} />
            )}
            {property.floor_level != null && (
              <StatCard icon={<Building2 className="h-5 w-5" />} value={`Piso ${property.floor_level}`} label={property.floor_count ? `de ${property.floor_count}` : 'Piso'} color={primaryColor} />
            )}
          </div>

          {/* Description */}
          {property.description && (
            <Card>
              <CardHeader><CardTitle className="text-base">Descripción</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{property.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Amenities */}
          {property.amenities && property.amenities.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Amenidades</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {property.amenities.map((a: string) => (
                    <span key={a} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border bg-muted/50">
                      <CheckCircle2 className="h-3 w-3 text-green-600 flex-shrink-0" />
                      {a}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Video */}
          {property.video_url && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Video className="h-4 w-4" /> Video
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg overflow-hidden aspect-video">
                  <iframe src={property.video_url} className="w-full h-full" allowFullScreen title="Video propiedad" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Virtual tour */}
          {property.virtual_tour_url && (
            <Card>
              <CardHeader><CardTitle className="text-base">Tour Virtual 360°</CardTitle></CardHeader>
              <CardContent>
                <div className="rounded-lg overflow-hidden aspect-video">
                  <iframe src={property.virtual_tour_url} className="w-full h-full" allowFullScreen title="Tour virtual" />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div>
          <div className="sticky top-20 space-y-4">
            {/* Price card */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <p className="text-3xl font-bold" style={{ color: primaryColor }}>
                    {formatPrice(property.price, property.currency)}
                  </p>
                  {(property.operation === 'arriendo' || property.operation === 'arriendo_temporal') && (
                    <p className="text-sm text-muted-foreground">mensual</p>
                  )}
                  {property.common_expenses > 0 && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      + {formatPrice(property.common_expenses, 'CLP')} gastos comunes
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Publicado {formatDate(property.created_at)}
                </div>

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

                <p className="text-xs text-muted-foreground text-center border-t pt-2">
                  Powered by{' '}
                  <a href="https://altaprop-app.cl" target="_blank" rel="noopener noreferrer" className="hover:underline">
                    Altaprop
                  </a>
                </p>
              </CardContent>
            </Card>

            {/* Apply */}
            <SiteApplyButton
              propertyId={property.id}
              subdomain={decodeURIComponent(params.subdomain)}
              primaryColor={primaryColor}
              accentColor={accentColor}
            />

            {/* Visit */}
            <SiteVisitRequestButton
              propertyId={property.id}
              primaryColor={primaryColor}
              accentColor={accentColor}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, value, label, color }: {
  icon: React.ReactNode; value: string | number; label: string; color: string
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3 text-center">
        <div style={{ color }} className="flex justify-center mb-1">{icon}</div>
        <p className="font-bold text-base">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  )
}
