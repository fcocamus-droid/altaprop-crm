'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Settings, Home as HomeIcon, BarChart3, ExternalLink, Globe, AlertCircle, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { WebsiteConfigTab } from './website-config-tab'
import { WebsitePropiedadesTab } from './website-propiedades-tab'
import { WebsiteEstadisticasTab } from './website-estadisticas-tab'
import { WebsiteNosotrosTab } from './website-nosotros-tab'
import { WebsitePaginaExtraTab } from './website-pagina-extra-tab'

type Tab = 'configuracion' | 'propiedades' | 'estadisticas' | 'nosotros' | 'pagina-extra'

const TABS: { id: Tab; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'configuracion', label: 'Configuración', icon: Settings },
  { id: 'propiedades',   label: 'Propiedades',   icon: HomeIcon },
  { id: 'estadisticas',  label: 'Estadísticas',  icon: BarChart3 },
  { id: 'nosotros',      label: 'Nosotros',       icon: Users },
  { id: 'pagina-extra',  label: 'Página Extra',   icon: ExternalLink },
]

interface MiSitioTabsProps {
  defaultTab?: Tab
  websiteEnabled?: boolean
  websiteSubdomain?: string | null
}

export function MiSitioTabs({ defaultTab = 'configuracion', websiteEnabled, websiteSubdomain }: MiSitioTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>(defaultTab)
  const router = useRouter()
  const pathname = usePathname()

  function changeTab(tab: Tab) {
    setActiveTab(tab)
    router.replace(`${pathname}?tab=${tab}`, { scroll: false })
  }

  const APP_DOMAIN = 'altaprop-app.cl'
  const siteUrl = websiteSubdomain ? `https://${websiteSubdomain}.${APP_DOMAIN}` : null

  return (
    <div>
      {/* Site status + preview link */}
      {siteUrl && (
        <div className={`mb-6 flex items-center gap-3 p-3 rounded-xl border text-sm ${websiteEnabled ? 'bg-green-50 border-green-200 text-green-800' : 'bg-muted/50 border-muted-foreground/20 text-muted-foreground'}`}>
          <Globe className="h-4 w-4 shrink-0" />
          <span>
            {websiteEnabled
              ? <>Tu sitio está <strong>activo</strong> en </>
              : <>Tu sitio está <strong>desactivado</strong> — </>
            }
            <a href={siteUrl} target="_blank" rel="noopener noreferrer"
              className="underline underline-offset-2 hover:opacity-80 inline-flex items-center gap-1 font-medium">
              {siteUrl} <ExternalLink className="h-3 w-3" />
            </a>
          </span>
        </div>
      )}

      {!websiteSubdomain && (
        <div className="mb-6 flex items-start gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>Configura un <strong>subdominio</strong> en la pestaña Configuración para activar tu sitio.</span>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-1 border-b mb-6">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => changeTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === id
                ? 'border-navy text-navy'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/40'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'configuracion' && <WebsiteConfigTab />}
      {activeTab === 'propiedades'   && <WebsitePropiedadesTab />}
      {activeTab === 'estadisticas'  && <WebsiteEstadisticasTab />}
      {activeTab === 'nosotros'      && <WebsiteNosotrosTab />}
      {activeTab === 'pagina-extra'  && <WebsitePaginaExtraTab />}
    </div>
  )
}
