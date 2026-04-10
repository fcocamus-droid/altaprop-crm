'use client'

import { useUser } from '@/hooks/use-user'
import { PageHeader } from '@/components/shared/page-header'
import { MLConnectButton } from '@/components/portals/ml-connect-button'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ExternalLink, Zap } from 'lucide-react'

export default function PortalesPage() {
  const { profile } = useUser()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Portales"
        description="Vincula tu cuenta para publicar tus propiedades en otros portales inmobiliarios automáticamente."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">

        {/* ── MercadoLibre / Portal Inmobiliario ── */}
        <PortalCard>
          <div className="flex items-start justify-between mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-[#FFE600] bg-[#FFE600] p-2">
              <MLLogo />
            </div>
            <TogglePill active={Boolean(profile?.ml_access_token && profile?.ml_user_id)} />
          </div>

          <div className="mb-4">
            <h3 className="font-semibold text-sm">MercadoLibre / Portal Inmobiliario</h3>
            {profile?.ml_access_token && profile?.ml_user_id ? (
              <p className="text-xs text-muted-foreground mt-0.5">{profile?.ml_user_id}</p>
            ) : (
              <p className="text-xs text-muted-foreground mt-0.5">No vinculado</p>
            )}
          </div>

          <div className="border-t pt-4">
            <MLConnectButton profile={profile ?? {}} />
          </div>
        </PortalCard>

        {/* ── Portal Inmobiliario standalone (info) ── */}
        <PortalCard>
          <div className="flex items-start justify-between mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border bg-white p-1.5">
              <PILogo />
            </div>
            <Badge className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
              Incluido con ML
            </Badge>
          </div>

          <div className="mb-4">
            <h3 className="font-semibold text-sm">Portal Inmobiliario</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Se publica automáticamente al conectar MercadoLibre
            </p>
          </div>

          <div className="border-t pt-4">
            <a
              href="https://www.portalinmobiliario.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline font-medium"
            >
              Ver portal <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </PortalCard>

        {/* ── Yapo ── */}
        <PortalCard comingSoon>
          <div className="flex items-start justify-between mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border bg-[#FF6B00]/10 p-2">
              <YapoLogo />
            </div>
            <Badge className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 gap-1">
              <Zap className="h-2.5 w-2.5" /> Muy Pronto
            </Badge>
          </div>

          <div className="mb-4">
            <h3 className="font-semibold text-sm">Yapo</h3>
            <p className="text-xs text-muted-foreground mt-0.5">No vinculado</p>
          </div>

          <div className="border-t pt-4">
            <Button variant="ghost" size="sm" disabled className="text-xs h-7 px-2 text-muted-foreground">
              Próximamente
            </Button>
          </div>
        </PortalCard>

        {/* ── GoPlaceit ── */}
        <PortalCard comingSoon>
          <div className="flex items-start justify-between mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border bg-red-50 p-2">
              <GoPlaceitLogo />
            </div>
            <Badge className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 gap-1">
              <Zap className="h-2.5 w-2.5" /> Muy Pronto
            </Badge>
          </div>

          <div className="mb-4">
            <h3 className="font-semibold text-sm">GoPlaceit</h3>
            <p className="text-xs text-muted-foreground mt-0.5">No vinculado</p>
          </div>

          <div className="border-t pt-4">
            <Button variant="ghost" size="sm" disabled className="text-xs h-7 px-2 text-muted-foreground">
              Próximamente
            </Button>
          </div>
        </PortalCard>

        {/* ── TocToc ── */}
        <PortalCard comingSoon>
          <div className="flex items-start justify-between mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border bg-violet-50 p-2">
              <TocTocLogo />
            </div>
            <Badge className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 gap-1">
              <Zap className="h-2.5 w-2.5" /> Muy Pronto
            </Badge>
          </div>

          <div className="mb-4">
            <h3 className="font-semibold text-sm">TocToc</h3>
            <p className="text-xs text-muted-foreground mt-0.5">No vinculado</p>
          </div>

          <div className="border-t pt-4">
            <Button variant="ghost" size="sm" disabled className="text-xs h-7 px-2 text-muted-foreground">
              Próximamente
            </Button>
          </div>
        </PortalCard>

      </div>
    </div>
  )
}

// ─── Portal Card wrapper ───────────────────────────────────────────────────────

function PortalCard({ children, comingSoon = false }: { children: React.ReactNode; comingSoon?: boolean }) {
  return (
    <div className={`rounded-xl border bg-card p-5 flex flex-col ${comingSoon ? 'opacity-70' : ''}`}>
      {children}
    </div>
  )
}

// ─── Toggle pill ──────────────────────────────────────────────────────────────

function TogglePill({ active }: { active: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-medium border ${
      active
        ? 'bg-green-50 text-green-700 border-green-200'
        : 'bg-gray-100 text-gray-500 border-gray-200'
    }`}>
      <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-green-500' : 'bg-gray-400'}`} />
      {active ? 'Activo' : 'Inactivo'}
    </div>
  )
}

// ─── Logo SVGs ────────────────────────────────────────────────────────────────

function MLLogo() {
  return (
    <svg viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-7 w-auto">
      <path d="M16 8l4 8 4-8 4 8 4-8" stroke="#1a1a1a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  )
}

function PILogo() {
  return (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-8 w-auto">
      <rect width="40" height="40" rx="8" fill="#0070C0" />
      <path d="M8 30L20 10L32 30" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="20" cy="22" r="3" fill="white" />
    </svg>
  )
}

function YapoLogo() {
  return (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-8 w-auto">
      <rect width="40" height="40" rx="8" fill="#FF6B00" />
      <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold" fontFamily="Arial">Y</text>
    </svg>
  )
}

function GoPlaceitLogo() {
  return (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-8 w-auto">
      <rect width="40" height="40" rx="8" fill="#E53935" />
      <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold" fontFamily="Arial">GP</text>
    </svg>
  )
}

function TocTocLogo() {
  return (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-8 w-auto">
      <rect width="40" height="40" rx="8" fill="#7C3AED" />
      <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold" fontFamily="Arial">TT</text>
    </svg>
  )
}
