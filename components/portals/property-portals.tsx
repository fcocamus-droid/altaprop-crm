'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, ExternalLink, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'

interface PropertyPortalsProps {
  propertyId: string
  mlItemId?: string | null
  mlStatus?: string | null
  mlListingType?: string | null
  isOwner?: boolean
  subscriberConnected: boolean
  // Property fields for pre-publish validation
  property?: {
    title?: string | null
    price?: number | null
    sqm?: number | null
    covered_sqm?: number | null
    bedrooms?: number | null
    bathrooms?: number | null
    city?: string | null
    sector?: string | null
    address?: string | null
    images?: { url: string }[]
  }
}

interface ValidationField {
  label: string
  ok: boolean
  hint?: string
}

function getValidationFields(property?: PropertyPortalsProps['property']): ValidationField[] {
  if (!property) return []
  const hasArea = (property.sqm != null && property.sqm > 0) || (property.covered_sqm != null && property.covered_sqm > 0)
  const hasLocation = !!(property.city || property.sector || property.address)
  return [
    {
      label: 'Título',
      ok: !!(property.title && property.title.trim().length > 5),
      hint: 'El título debe tener al menos 6 caracteres',
    },
    {
      label: 'Precio',
      ok: !!(property.price && property.price > 0),
      hint: 'Ingresa el precio de la propiedad',
    },
    {
      label: 'Superficie (m²)',
      ok: hasArea,
      hint: 'Completa la superficie total o útil en m²',
    },
    {
      label: 'Dormitorios',
      ok: property.bedrooms != null && property.bedrooms >= 0,
      hint: 'Indica la cantidad de dormitorios (puede ser 0)',
    },
    {
      label: 'Baños',
      ok: property.bathrooms != null && property.bathrooms >= 0,
      hint: 'Indica la cantidad de baños (puede ser 0)',
    },
    {
      label: 'Ubicación',
      ok: hasLocation,
      hint: 'Completa ciudad, sector o dirección',
    },
    {
      label: 'Al menos una foto',
      ok: !!(property.images && property.images.length > 0),
      hint: 'Agrega al menos una imagen a la propiedad',
    },
  ]
}

const LISTING_TYPES = [
  { value: 'silver', label: 'Silver', description: 'Básico · Gratis' },
  { value: 'gold', label: 'Oro', description: 'Destacado · Con costo' },
  { value: 'gold_premium', label: 'Premium', description: 'Máxima visibilidad · Con costo' },
]

export function PropertyPortals({
  propertyId,
  mlItemId,
  mlStatus,
  mlListingType,
  isOwner = false,
  subscriberConnected,
  property,
}: PropertyPortalsProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedListingType, setSelectedListingType] = useState(mlListingType || 'silver')
  const [currentStatus, setCurrentStatus] = useState(mlStatus)
  const [currentItemId, setCurrentItemId] = useState(mlItemId)

  const validationFields = getValidationFields(property)
  const missingFields = validationFields.filter(f => !f.ok)
  const canPublish = missingFields.length === 0

  const mlPermalink = currentItemId
    ? `https://inmueble.mercadolibre.cl/${currentItemId}`
    : null

  async function handlePublish() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/ml/publish/${propertyId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_type: selectedListingType }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Error al publicar')
      } else {
        setCurrentItemId(data.ml_item_id)
        // ML may return 'active', 'payment_required', or another status
        setCurrentStatus(data.ml_status || 'active')
      }
    } catch {
      setError('Error de conexión')
    }
    setLoading(false)
  }

  async function handleAction(action: 'pause' | 'reactivate') {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/ml/publish/${propertyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Error al actualizar')
      } else {
        setCurrentStatus(data.ml_status)
      }
    } catch {
      setError('Error de conexión')
    }
    setLoading(false)
  }

  async function handleDelete() {
    if (!confirm('¿Eliminar la publicación de MercadoLibre / Portal Inmobiliario? Esta acción no se puede deshacer.')) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/ml/publish/${propertyId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Error al eliminar')
      } else {
        setCurrentStatus(null)
        setCurrentItemId(null)
      }
    } catch {
      setError('Error de conexión')
    }
    setLoading(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <span>Portales de Publicación</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Portal logos row */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border p-2 bg-muted/40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://www.google.com/s2/favicons?domain=mercadolibre.cl&sz=32"
              alt="MercadoLibre"
              className="h-5 w-5 rounded object-contain"
            />
            <span className="text-xs font-medium">MercadoLibre</span>
          </div>
          <span className="text-xs text-muted-foreground font-bold">+</span>
          <div className="flex items-center gap-2 rounded-lg border p-2 bg-muted/40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://www.google.com/s2/favicons?domain=portalinmobiliario.com&sz=32"
              alt="Portal Inmobiliario"
              className="h-5 w-5 rounded object-contain"
            />
            <span className="text-xs font-medium">Portal Inmobiliario</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Se publican juntos automáticamente
          </p>
        </div>

        {/* Warning: subscriber not connected */}
        {!subscriberConnected && (
          <div className="flex items-start gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-3">
            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-yellow-800">
              El suscriptor debe conectar su cuenta de MercadoLibre primero desde{' '}
              <strong>Configuración &rsaquo; Portales de Publicación</strong>.
            </p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3">
            <p className="text-xs text-destructive">{error}</p>
          </div>
        )}

        {/* Status-based content */}
        {subscriberConnected && (
          <>
            {/* ACTIVE listing */}
            {currentStatus === 'active' && currentItemId && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge className="bg-green-100 text-green-700 border-green-200">
                    Publicado activo
                  </Badge>
                  {mlPermalink && (
                    <a
                      href={mlPermalink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                    >
                      Ver publicación <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAction('pause')}
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                    Pausar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDelete}
                    disabled={loading}
                    className="text-destructive border-destructive/40 hover:bg-destructive/10"
                  >
                    Eliminar publicación
                  </Button>
                </div>
              </div>
            )}

            {/* PAUSED listing */}
            {currentStatus === 'paused' && currentItemId && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
                    Pausado
                  </Badge>
                  {mlPermalink && (
                    <a
                      href={mlPermalink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                    >
                      Ver publicación <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleAction('reactivate')}
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                    Reactivar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDelete}
                    disabled={loading}
                    className="text-destructive border-destructive/40 hover:bg-destructive/10"
                  >
                    Eliminar publicación
                  </Button>
                </div>
              </div>
            )}

            {/* PAYMENT REQUIRED — item created but needs ML subscription */}
            {currentStatus === 'payment_required' && currentItemId && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge className="bg-orange-100 text-orange-700 border-orange-200">
                    Pendiente de pago en MercadoLibre
                  </Badge>
                  <a
                    href={`https://www.mercadolibre.cl/inmuebles`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                  >
                    Activar plan <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-xs text-orange-800 space-y-1">
                  <p>
                    Tu propiedad fue enviada a MercadoLibre (<strong>{currentItemId}</strong>) pero
                    requiere activar un plan de publicación inmobiliaria para aparecer en los portales.
                  </p>
                  <p>
                    Ve a <strong>MercadoLibre Inmuebles</strong> y activa el plan correspondiente
                    para que la publicación quede activa.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDelete}
                  disabled={loading}
                  className="text-destructive border-destructive/40 hover:bg-destructive/10"
                >
                  Cancelar publicación
                </Button>
              </div>
            )}

            {/* NOT published yet (or closed) */}
            {(!currentStatus || currentStatus === 'closed') && (
              <div className="space-y-4">

                {/* Validation checklist — always show when property data is available */}
                {validationFields.length > 0 && (
                  <div className={`rounded-lg border p-3 space-y-2 ${
                    canPublish
                      ? 'border-green-200 bg-green-50'
                      : 'border-orange-200 bg-orange-50'
                  }`}>
                    <p className={`text-xs font-semibold ${canPublish ? 'text-green-800' : 'text-orange-800'}`}>
                      {canPublish
                        ? '✓ Propiedad lista para publicar'
                        : 'Completa estos campos antes de publicar'}
                    </p>
                    <ul className="space-y-1">
                      {validationFields.map(field => (
                        <li key={field.label} className="flex items-start gap-2">
                          {field.ok ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-600 mt-0.5 flex-shrink-0" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5 text-orange-500 mt-0.5 flex-shrink-0" />
                          )}
                          <span className={`text-xs ${field.ok ? 'text-green-700' : 'text-orange-800 font-medium'}`}>
                            {field.label}
                            {!field.ok && field.hint && (
                              <span className="font-normal text-orange-600"> — {field.hint}</span>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Tipo de publicación</p>
                  <div className="grid grid-cols-3 gap-2">
                    {LISTING_TYPES.map(lt => (
                      <button
                        key={lt.value}
                        type="button"
                        onClick={() => setSelectedListingType(lt.value)}
                        className={`rounded-lg border p-2 text-left transition-colors ${
                          selectedListingType === lt.value
                            ? 'border-navy bg-navy/5 ring-1 ring-navy'
                            : 'border-border hover:border-navy/50'
                        }`}
                      >
                        <p className="text-xs font-semibold">{lt.label}</p>
                        <p className="text-[10px] text-muted-foreground">{lt.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={handlePublish}
                  disabled={loading || !canPublish}
                  className="w-full sm:w-auto"
                  title={!canPublish ? 'Completa todos los campos requeridos antes de publicar' : undefined}
                >
                  {loading ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : null}
                  Publicar en portales
                </Button>
                {!canPublish && (
                  <p className="text-[11px] text-muted-foreground">
                    Faltan {missingFields.length} campo{missingFields.length > 1 ? 's' : ''} requerido{missingFields.length > 1 ? 's' : ''}.
                    Edita la propiedad y guarda los cambios.
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

