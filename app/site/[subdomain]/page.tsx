import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { PropertyCard } from '@/components/properties/property-card'
import { EmptyState } from '@/components/shared/empty-state'
import { PROPERTY_TYPES, OPERATION_TYPES } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { MessageCircle, ChevronRight } from 'lucide-react'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

async function getSubscriberBySubdomain(subdomain: string) {
  const admin = createAdminClient()
  const { data: bySubdomain } = await admin
    .from('profiles')
    .select('id, full_name, website_enabled, website_primary_color, website_accent_color, website_hero_title, website_hero_subtitle, website_about_text, website_whatsapp, website_subdomain, website_domain')
    .eq('website_subdomain', subdomain)
    .eq('website_enabled', true)
    .maybeSingle()
  if (bySubdomain) return bySubdomain

  const { data: byDomain } = await admin
    .from('profiles')
    .select('id, full_name, website_enabled, website_primary_color, website_accent_color, website_hero_title, website_hero_subtitle, website_about_text, website_whatsapp, website_subdomain, website_domain')
    .eq('website_domain', subdomain)
    .eq('website_enabled', true)
    .maybeSingle()
  return byDomain
}

async function getSubscriberProperties(subscriberId: string, filters: Record<string, string | undefined>) {
  const admin = createAdminClient()

  const buildQuery = (withVisibility: boolean) => {
    let q = admin
      .from('properties')
      .select('*, images:property_images(*)')
      .eq('subscriber_id', subscriberId)
      .eq('status', 'available')
      .order('created_at', { ascending: false })
    if (withVisibility) q = q.eq('website_visible', true)
    if (filters.operation) q = q.eq('operation', filters.operation)
    if (filters.type) q = q.eq('type', filters.type)
    if (filters.city) q = q.ilike('city', `%${filters.city}%`)
    return q
  }

  let { data, error } = await buildQuery(true)

  // Fallback if website_visible column doesn't exist yet
  if (error && error.message?.includes('website_visible')) {
    const res = await buildQuery(false)
    data = res.data
  }

  return data || []
}

export async function generateMetadata({ params }: { params: { subdomain: string } }): Promise<Metadata> {
  const subscriber = await getSubscriberBySubdomain(decodeURIComponent(params.subdomain))
  if (!subscriber) return { title: 'Portal Inmobiliario' }
  const name = subscriber.full_name || 'Portal Inmobiliario'
  return {
    title: subscriber.website_hero_title || `Propiedades | ${name}`,
    description: subscriber.website_hero_subtitle || `Encuentra las mejores propiedades con ${name}`,
  }
}

export default async function SitePage({
  params,
  searchParams,
}: {
  params: { subdomain: string }
  searchParams: { [key: string]: string | undefined }
}) {
  const subscriber = await getSubscriberBySubdomain(decodeURIComponent(params.subdomain))
  if (!subscriber) notFound()

  const properties = await getSubscriberProperties(subscriber.id, {
    operation: searchParams.operation,
    type: searchParams.type,
    city: searchParams.city,
  })

  const primaryColor = subscriber.website_primary_color || '#1a2332'
  const accentColor  = subscriber.website_accent_color  || '#c9a84c'
  const companyName  = subscriber.full_name || 'Portal Inmobiliario'
  const heroTitle    = subscriber.website_hero_title    || `Bienvenido a ${companyName}`
  const heroSubtitle = subscriber.website_hero_subtitle || 'Encuentra la propiedad perfecta para ti'

  const hasFilters = searchParams.operation || searchParams.type || searchParams.city

  return (
    <>
      {/* Hero — only on main listing page without filters */}
      {!hasFilters && (
        <section
          className="relative py-20 text-white overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 60%, ${accentColor}33 100%)` }}
        >
          <div className="container relative z-10 text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">{heroTitle}</h1>
            <p className="text-white/75 text-lg mb-8">{heroSubtitle}</p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <a
                href="#propiedades"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm transition-opacity hover:opacity-90"
                style={{ background: accentColor, color: primaryColor }}
              >
                Ver Propiedades <ChevronRight className="h-4 w-4" />
              </a>
              {subscriber.website_whatsapp && (
                <a
                  href={`https://wa.me/${subscriber.website_whatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm border-2 border-white/40 text-white hover:bg-white/10 transition-colors"
                >
                  <MessageCircle className="h-4 w-4" /> Contáctanos
                </a>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Properties section */}
      <div id="propiedades" className="container py-10">
        {/* Filter bar */}
        <form className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8 p-4 bg-muted/50 rounded-xl">
          <select name="operation" defaultValue={searchParams.operation || ''} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
            <option value="">Operación</option>
            {OPERATION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select name="type" defaultValue={searchParams.type || ''} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
            <option value="">Tipo</option>
            {PROPERTY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <input
            name="city"
            defaultValue={searchParams.city || ''}
            placeholder="Ciudad"
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          />
          <button
            type="submit"
            className="h-10 rounded-md px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: primaryColor }}
          >
            Buscar
          </button>
        </form>

        {hasFilters && (
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{properties.length} propiedad{properties.length !== 1 ? 'es' : ''} encontrada{properties.length !== 1 ? 's' : ''}</p>
            <a href="/" className="text-sm font-medium hover:underline" style={{ color: primaryColor }}>Limpiar filtros</a>
          </div>
        )}

        {properties.length === 0 ? (
          <EmptyState
            title="No hay propiedades disponibles"
            description="Vuelve a intentar con otros filtros o contáctanos para más información."
          >
            {subscriber.website_whatsapp && (
              <a
                href={`https://wa.me/${subscriber.website_whatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm text-white"
                style={{ background: primaryColor }}
              >
                <MessageCircle className="h-4 w-4" /> Contáctanos
              </a>
            )}
          </EmptyState>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((property: any) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
