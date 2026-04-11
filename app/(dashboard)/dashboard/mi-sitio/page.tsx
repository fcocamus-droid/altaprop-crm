import { getUserProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/shared/page-header'
import { MiSitioTabs } from '@/components/website/mi-sitio-tabs'
import { ExternalLink } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Mi Sitio Web - Altaprop' }

type TabParam = 'configuracion' | 'propiedades' | 'estadisticas' | 'nosotros'

export default async function MiSitioPage({
  searchParams,
}: {
  searchParams: { tab?: string }
}) {
  const profile = await getUserProfile()
  if (!profile) redirect('/login')

  // Only SUPERADMIN and SUPERADMINBOSS have a website
  if (!['SUPERADMIN', 'SUPERADMINBOSS'].includes(profile.role)) {
    redirect('/dashboard')
  }

  const validTabs: TabParam[] = ['configuracion', 'propiedades', 'estadisticas', 'nosotros']
  const tab = validTabs.includes(searchParams.tab as TabParam)
    ? (searchParams.tab as TabParam)
    : 'configuracion'

  const APP_DOMAIN = 'altaprop-app.cl'
  const siteUrl = profile.website_subdomain
    ? `https://${profile.website_subdomain}.${APP_DOMAIN}`
    : null

  return (
    <div>
      <PageHeader
        title="Mi Sitio Web"
        description="Gestiona tu portal público de propiedades bajo tu propio dominio"
      >
        {siteUrl && profile.website_enabled && (
          <a
            href={siteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-gold hover:text-gold/80 transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            Ver sitio
          </a>
        )}
      </PageHeader>

      <MiSitioTabs
        defaultTab={tab}
        websiteEnabled={profile.website_enabled}
        websiteSubdomain={profile.website_subdomain}
      />
    </div>
  )
}
