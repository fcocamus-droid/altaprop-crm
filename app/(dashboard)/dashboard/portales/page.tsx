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
          logoBg="bg-white border border-gray-100"
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
          logoBg="bg-white border border-gray-100"
          name="Yapo"
          description="Portal de clasificados líder en Chile para arriendo y venta de propiedades."
          badge={{ label: 'Próximamente', color: 'amber' }}
          comingSoon
        />

        {/* ── GoPlaceit ── */}
        <PortalCard
          logo={<GoPlaceitLogo />}
          logoBg="bg-white border border-gray-100"
          name="GoPlaceit"
          description="Plataforma inmobiliaria con búsqueda avanzada y datos de mercado en Chile."
          badge={{ label: 'Próximamente', color: 'amber' }}
          comingSoon
        />

        {/* ── TocToc ── */}
        <PortalCard
          logo={<TocTocLogo />}
          logoBg="bg-white border border-gray-100"
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
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
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

/** MercadoLibre — favicon oficial */
function MLLogoFull() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="https://www.google.com/s2/favicons?domain=mercadolibre.cl&sz=128"
      alt="MercadoLibre"
      className="h-9 w-9 object-contain rounded-lg"
    />
  )
}

/** Portal Inmobiliario — logo oficial */
function PILogo() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="https://www.google.com/s2/favicons?domain=portalinmobiliario.com&sz=128"
      alt="Portal Inmobiliario"
      className="h-9 w-9 object-contain rounded-lg"
    />
  )
}

/** Yapo — logo oficial */
function YapoLogo() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="https://www.google.com/s2/favicons?domain=yapo.cl&sz=128"
      alt="Yapo"
      className="h-9 w-9 object-contain rounded-lg"
    />
  )
}

/** GoPlaceit — logo oficial */
function GoPlaceitLogo() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="https://www.google.com/s2/favicons?domain=goplaceit.com&sz=128"
      alt="GoPlaceit"
      className="h-9 w-9 object-contain rounded-lg"
    />
  )
}

/** TocToc — logo oficial */
function TocTocLogo() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="https://www.google.com/s2/favicons?domain=toctoc.com&sz=128"
      alt="TocToc"
      className="h-9 w-9 object-contain rounded-lg"
    />
  )
}
