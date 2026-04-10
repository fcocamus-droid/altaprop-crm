'use client'

import { useState } from 'react'
import { useUser } from '@/hooks/use-user'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { ExternalLink, Loader2, Zap } from 'lucide-react'

export default function PortalesPage() {
  const { profile } = useUser()
  const mlConnected = Boolean(profile?.ml_access_token && profile?.ml_user_id)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Portales"
        description="Vincula tu cuenta para publicar tus propiedades en otros portales inmobiliarios automáticamente."
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">

        {/* ── MercadoLibre / Portal Inmobiliario ── */}
        <MLCard
          connected={mlConnected}
          userId={profile?.ml_user_id}
          connectedAt={profile?.ml_connected_at}
        />

        {/* ── Portal Inmobiliario ── */}
        <PortalCard
          logo={<PILogo />}
          logoBg="bg-white border-2 border-green-100"
          name="Portal Inmobiliario"
          description="Se publica automáticamente junto con MercadoLibre con un solo clic."
          badge={{ label: 'Incluido con ML', color: 'blue' }}
          footer={
            <a
              href="https://www.portalinmobiliario.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:underline"
            >
              Ver portal <ExternalLink className="h-3 w-3" />
            </a>
          }
        />

        {/* ── Yapo ── */}
        <PortalCard
          logo={<YapoLogo />}
          logoBg="bg-[#F7941D]"
          name="Yapo"
          description="Portal de clasificados líder en Chile para arriendo y venta de propiedades."
          badge={{ label: 'Próximamente', color: 'amber' }}
          comingSoon
        />

        {/* ── GoPlaceit ── */}
        <PortalCard
          logo={<GoPlaceitLogo />}
          logoBg="bg-[#E8432D]"
          name="GoPlaceit"
          description="Plataforma inmobiliaria con búsqueda avanzada y datos de mercado en Chile."
          badge={{ label: 'Próximamente', color: 'amber' }}
          comingSoon
        />

        {/* ── TocToc ── */}
        <PortalCard
          logo={<TocTocLogo />}
          logoBg="bg-[#0A0A5C]"
          name="TocToc"
          description="Portal inmobiliario especializado en nuevos proyectos y propiedades usadas."
          badge={{ label: 'Próximamente', color: 'amber' }}
          comingSoon
        />

      </div>
    </div>
  )
}

// ─── ML Card (with live connect / disconnect) ─────────────────────────────────

function MLCard({
  connected,
  userId,
  connectedAt,
}: {
  connected: boolean
  userId?: string | null
  connectedAt?: string | null
}) {
  const [disconnecting, setDisconnecting] = useState(false)

  async function handleDisconnect() {
    setDisconnecting(true)
    try {
      await fetch('/api/ml/disconnect', { method: 'POST' })
      window.location.reload()
    } catch {
      setDisconnecting(false)
    }
  }

  return (
    <div className="flex flex-col rounded-2xl border bg-card shadow-sm overflow-hidden">
      {/* Top accent strip when connected */}
      {connected && <div className="h-1 w-full bg-gradient-to-r from-[#FFE600] to-[#f5c400]" />}

      <div className="flex flex-col flex-1 p-5 gap-4">
        {/* Header row */}
        <div className="flex items-start justify-between">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFE600] shadow-sm overflow-hidden">
            <MLLogoFull />
          </div>
          <StatusPill active={connected} />
        </div>

        {/* Name + meta */}
        <div className="flex-1">
          <h3 className="font-semibold text-[15px] leading-tight">MercadoLibre</h3>
          <p className="text-xs text-muted-foreground mt-0.5">+ Portal Inmobiliario</p>
          {connected && userId && (
            <p className="text-[11px] text-muted-foreground mt-2 font-mono bg-muted/50 rounded px-2 py-1 inline-block">
              ID: {userId}
            </p>
          )}
          {connected && connectedAt && (
            <p className="text-[11px] text-muted-foreground mt-1">
              Conectado el {new Date(connectedAt).toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          )}
          {!connected && (
            <p className="text-xs text-muted-foreground mt-2">
              Publica en MercadoLibre y Portal Inmobiliario automáticamente.
            </p>
          )}
        </div>

        {/* Action */}
        <div className="border-t pt-4">
          {connected ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="w-full text-destructive border-destructive/30 hover:bg-destructive/5 hover:border-destructive/50"
            >
              {disconnecting
                ? <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Desconectando…</>
                : 'Desconectar cuenta'}
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => { window.location.href = '/api/ml/auth' }}
              className="w-full bg-[#FFE600] text-[#1a1a1a] hover:bg-[#f5d800] font-semibold shadow-sm"
            >
              Conectar con MercadoLibre
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Generic Portal Card ──────────────────────────────────────────────────────

type BadgeColor = 'blue' | 'green' | 'amber'

function PortalCard({
  logo,
  logoBg,
  name,
  description,
  badge,
  footer,
  comingSoon = false,
}: {
  logo: React.ReactNode
  logoBg: string
  name: string
  description: string
  badge?: { label: string; color: BadgeColor }
  footer?: React.ReactNode
  comingSoon?: boolean
}) {
  const badgeStyles: Record<BadgeColor, string> = {
    blue:  'bg-blue-50 text-blue-700 border border-blue-200',
    green: 'bg-green-50 text-green-700 border border-green-200',
    amber: 'bg-amber-50 text-amber-700 border border-amber-200',
  }

  return (
    <div className={`flex flex-col rounded-2xl border bg-card shadow-sm overflow-hidden transition-opacity ${comingSoon ? 'opacity-60' : ''}`}>
      <div className="flex flex-col flex-1 p-5 gap-4">
        {/* Header row */}
        <div className="flex items-start justify-between">
          <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${logoBg} shadow-sm`}>
            {logo}
          </div>
          {badge && (
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${badgeStyles[badge.color]}`}>
              {badge.color === 'amber' && <Zap className="h-2.5 w-2.5" />}
              {badge.label}
            </span>
          )}
        </div>

        {/* Name + description */}
        <div className="flex-1">
          <h3 className="font-semibold text-[15px]">{name}</h3>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
        </div>

        {/* Footer */}
        <div className="border-t pt-4">
          {footer ?? (
            <span className="text-xs text-muted-foreground italic">Integración en desarrollo</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Status pill ──────────────────────────────────────────────────────────────

function StatusPill({ active }: { active: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium border ${
      active
        ? 'bg-green-50 text-green-700 border-green-200'
        : 'bg-gray-100 text-gray-500 border-gray-200'
    }`}>
      <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
      {active ? 'Conectado' : 'No conectado'}
    </span>
  )
}

// ─── Logo SVGs — fiel a cada marca ───────────────────────────────────────────

/** MercadoLibre — logo oficial desde CDN */
function MLLogoFull() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="https://http2.mlstatic.com/frontend-assets/ui-navigation/5.19.1/mercadolibre/logo__large_plus.png"
      alt="MercadoLibre"
      className="h-7 w-auto object-contain"
    />
  )
}

/** Portal Inmobiliario — casa sobre pin de mapa (azul + verde) */
function PILogo() {
  return (
    <svg viewBox="0 0 48 52" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-9 w-auto">
      {/* Pin/gota verde */}
      <ellipse cx="24" cy="46" rx="7" ry="4" fill="#4CAF50" opacity="0.5" />
      <path
        d="M24 48 C24 48 8 34 8 22 C8 13.16 15.16 6 24 6 C32.84 6 40 13.16 40 22 C40 34 24 48 24 48Z"
        fill="#4CAF50"
      />
      {/* Casa dentro del pin */}
      <path d="M16 24 L24 16 L32 24" fill="white" />
      <rect x="19" y="24" width="10" height="8" rx="1" fill="white" />
      <rect x="22" y="27" width="4" height="5" rx="0.5" fill="#4CAF50" />
      {/* Techo azul */}
      <path d="M16 24 L24 16 L32 24" fill="#1565C0" />
    </svg>
  )
}

/** Yapo — cubo 3D isométrico naranja */
function YapoLogo() {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-8 w-auto">
      {/* Cara superior */}
      <path d="M24 8 L40 17 L24 26 L8 17 Z" fill="white" fillOpacity="0.95" />
      {/* Cara izquierda */}
      <path d="M8 17 L8 33 L24 42 L24 26 Z" fill="white" fillOpacity="0.6" />
      {/* Cara derecha */}
      <path d="M40 17 L40 33 L24 42 L24 26 Z" fill="white" fillOpacity="0.8" />
    </svg>
  )
}

/** GoPlaceit — lupa con pin de ubicación dentro */
function GoPlaceitLogo() {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-8 w-auto">
      {/* Círculo de lupa */}
      <circle cx="20" cy="20" r="12" stroke="white" strokeWidth="3.5" fill="none" />
      {/* Mango de lupa */}
      <line x1="29" y1="29" x2="41" y2="41" stroke="white" strokeWidth="3.5" strokeLinecap="round" />
      {/* Pin dentro */}
      <circle cx="20" cy="18" r="4" stroke="white" strokeWidth="2.5" fill="none" />
      <path d="M20 22 L20 27" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

/** TocToc — dos "cometas" o tadpoles cyan sobre fondo oscuro */
function TocTocLogo() {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-8 w-auto">
      {/* Tadpole izquierdo */}
      <circle cx="16" cy="14" r="5" fill="#00E5CC" />
      <path
        d="M16 19 C14 26 10 30 9 38"
        stroke="#00E5CC"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Tadpole derecho */}
      <circle cx="30" cy="22" r="5" fill="#00E5CC" />
      <path
        d="M30 27 C28 34 26 37 26 44"
        stroke="#00E5CC"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  )
}
