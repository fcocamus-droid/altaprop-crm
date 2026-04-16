'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  MapPin, Phone, Mail, User, Home, Search, Filter,
  ChevronDown, ChevronUp, Building2, Tag, Globe,
  Loader2, RefreshCw, X, Eye, EyeOff, Lock, Unlock, Clock,
  CheckCircle2, AlertCircle,
} from 'lucide-react'
import {
  CHILE_REGIONS, OPERATION_TYPES, PROPERTY_TYPES,
} from '@/lib/constants'

interface Propietario {
  id: string
  full_name: string
  phone: string
  email: string
  rut: string
}

interface Claim {
  subscriber_name: string
  claimed_by_name: string
  expires_at: string
  is_mine: boolean
}

interface Listing {
  id: string
  title: string
  address: string
  city: string
  sector: string
  region: string
  status: string
  operation: string
  type: string
  price: number | null
  currency: string | null
  owner_id: string
  created_at: string
  images: { url: string }[]
  pais: string
  is_metadata_only?: boolean
  propietario: Propietario | null
  claim: Claim | null
}

interface FiltersState {
  region: string
  city: string
  operation: string
  type: string
  status: string
  search: string
}

const EMPTY_FILTERS: FiltersState = { region: '', city: '', operation: '', type: '', status: 'available', search: '' }

function formatPrice(price: number | null, currency: string | null) {
  if (!price) return null
  if (currency === 'UF') return `UF ${price.toLocaleString('es-CL')}`
  if (currency === 'USD') return `USD ${price.toLocaleString('en-US')}`
  return `$${price.toLocaleString('es-CL')} CLP`
}

function getOperationLabel(op: string) {
  return OPERATION_TYPES.find(o => o.value === op)?.label || op
}

function getTypeLabel(t: string) {
  return PROPERTY_TYPES.find(pt => pt.value === t)?.label || t
}

function getStatusConfig(s: string) {
  return PROPERTY_STATUSES.find(ps => ps.value === s) || { label: s, color: 'bg-gray-100 text-gray-800' }
}

function operationColor(op: string) {
  switch (op) {
    case 'arriendo': return 'bg-blue-100 text-blue-800'
    case 'arriendo_temporal': return 'bg-cyan-100 text-cyan-800'
    case 'venta': return 'bg-purple-100 text-purple-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

function getDaysLeft(expiresAt: string) {
  const diff = new Date(expiresAt).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

// ─── ListingCard ─────────────────────────────────────────────────────────────

interface ListingCardProps {
  listing: Listing
  showContact: boolean
  onToggleContact: () => void
  onClaim: (propietarioId: string, propertyId: string | null) => Promise<void>
  onRelease: (propietarioId: string) => Promise<void>
  claimLoading: boolean
}

function ListingCard({ listing, showContact, onToggleContact, onClaim, onRelease, claimLoading }: ListingCardProps) {
  const statusCfg = getStatusConfig(listing.status)
  const priceStr = formatPrice(listing.price, listing.currency)
  const mainImage = listing.images?.[0]?.url
  const claim = listing.claim
  const isClaimed = !!claim
  const isMineClaim = claim?.is_mine

  return (
    <Card className={`overflow-hidden hover:shadow-md transition-shadow ${isClaimed && !isMineClaim ? 'opacity-75' : ''}`}>
      {/* Image */}
      <div className="relative h-44 bg-gray-100">
        {mainImage ? (
          <img src={mainImage} alt={listing.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <Building2 className="h-16 w-16" />
          </div>
        )}
        {/* Badges overlay */}
        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
          {listing.operation && (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${operationColor(listing.operation)}`}>
              {getOperationLabel(listing.operation)}
            </span>
          )}
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusCfg.color}`}>
            {statusCfg.label}
          </span>
        </div>
        {/* Claim badge overlay */}
        {isClaimed && (
          <div className="absolute top-2 right-2">
            {isMineClaim ? (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-800 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> En tu gestión
              </span>
            ) : (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-800 flex items-center gap-1">
                <Lock className="h-3 w-3" /> En gestión
              </span>
            )}
          </div>
        )}
        {listing.is_metadata_only && !isClaimed && (
          <div className="absolute top-2 right-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
              Sin publicación aún
            </span>
          </div>
        )}
      </div>

      <CardContent className="p-4 space-y-3">
        {/* Title & type */}
        <div>
          <h3 className="font-semibold text-navy text-sm leading-tight line-clamp-2">{listing.title}</h3>
          {listing.type && (
            <p className="text-xs text-muted-foreground mt-0.5">{getTypeLabel(listing.type)}</p>
          )}
        </div>

        {/* Location */}
        <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-gray-400" />
          <span className="line-clamp-2">
            {[listing.address, listing.sector, listing.city, listing.region].filter(Boolean).join(', ') || 'Chile'}
          </span>
        </div>

        {/* Price */}
        {priceStr && (
          <div className="flex items-center gap-1.5 text-sm font-bold text-navy">
            <Tag className="h-3.5 w-3.5 text-gray-400" />
            {priceStr}
          </div>
        )}

        {/* País */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Globe className="h-3.5 w-3.5 text-gray-400" />
          Chile
        </div>

        {/* Claim status info */}
        {isClaimed && !isMineClaim && (
          <div className="flex items-start gap-2 p-2.5 bg-red-50 rounded-lg border border-red-100 text-xs text-red-700">
            <Lock className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">En gestión por {claim.subscriber_name || claim.claimed_by_name || 'otra org.'}</p>
              <p className="text-red-500 flex items-center gap-1 mt-0.5">
                <Clock className="h-3 w-3" /> {getDaysLeft(claim.expires_at)} días restantes
              </p>
            </div>
          </div>
        )}
        {isClaimed && isMineClaim && (
          <div className="flex items-start gap-2 p-2.5 bg-green-50 rounded-lg border border-green-100 text-xs text-green-700">
            <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Gestionado por tu organización</p>
              <p className="text-green-600 flex items-center gap-1 mt-0.5">
                <Clock className="h-3 w-3" /> {getDaysLeft(claim.expires_at)} días restantes
              </p>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="pt-1 border-t space-y-2">
          {/* Contact toggle — only visible if not claimed by another org */}
          {(!isClaimed || isMineClaim) && (
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2 text-xs"
              onClick={onToggleContact}
            >
              {showContact ? (
                <><EyeOff className="h-3.5 w-3.5" /> Ocultar contacto</>
              ) : (
                <><Eye className="h-3.5 w-3.5" /> Ver datos del propietario</>
              )}
            </Button>
          )}

          {/* Claim / Release buttons */}
          {!isClaimed && (
            <Button
              size="sm"
              className="w-full gap-2 text-xs bg-navy hover:bg-navy/90"
              disabled={claimLoading}
              onClick={() => onClaim(listing.owner_id, listing.is_metadata_only ? null : listing.id)}
            >
              {claimLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Lock className="h-3.5 w-3.5" />}
              Tomar gestión (30 días)
            </Button>
          )}
          {isClaimed && isMineClaim && (
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2 text-xs border-orange-300 text-orange-700 hover:bg-orange-50"
              disabled={claimLoading}
              onClick={() => onRelease(listing.owner_id)}
            >
              {claimLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unlock className="h-3.5 w-3.5" />}
              Liberar gestión
            </Button>
          )}
          {isClaimed && !isMineClaim && (
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2 text-xs"
              disabled
            >
              <Lock className="h-3.5 w-3.5" />
              No disponible
            </Button>
          )}

          {/* Contact details */}
          {showContact && listing.propietario && (!isClaimed || isMineClaim) && (
            <div className="mt-2 space-y-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                <span className="text-xs font-semibold text-blue-800">{listing.propietario.full_name}</span>
              </div>
              {listing.propietario.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                  <a href={`tel:${listing.propietario.phone}`} className="text-xs text-blue-700 hover:underline">
                    {listing.propietario.phone}
                  </a>
                </div>
              )}
              {listing.propietario.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                  <a href={`mailto:${listing.propietario.email}`} className="text-xs text-blue-700 hover:underline truncate">
                    {listing.propietario.email}
                  </a>
                </div>
              )}
              {listing.propietario.rut && (
                <div className="flex items-center gap-2">
                  <Home className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                  <span className="text-xs text-blue-700">RUT: {listing.propietario.rut}</span>
                </div>
              )}
            </div>
          )}
          {showContact && isClaimed && !isMineClaim && (
            <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs text-gray-500 text-center">
              <Lock className="h-4 w-4 mx-auto mb-1 text-gray-400" />
              Datos disponibles solo para la organización que tomó la gestión
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Main Browser ─────────────────────────────────────────────────────────────

interface Props {
  currentUserRole: string
}

export function RedCanjesBrowser({ currentUserRole }: Props) {
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<FiltersState>(EMPTY_FILTERS)
  const [appliedFilters, setAppliedFilters] = useState<FiltersState>(EMPTY_FILTERS)
  const [showFilters, setShowFilters] = useState(true)
  const [visibleContacts, setVisibleContacts] = useState<Set<string>>(new Set())
  const [claimLoading, setClaimLoading] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text })
    setTimeout(() => setToast(null), 4000)
  }

  const fetchListings = useCallback(async (f: FiltersState) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (f.region) params.set('region', f.region)
      if (f.city) params.set('city', f.city)
      if (f.operation) params.set('operation', f.operation)
      if (f.type) params.set('type', f.type)
      if (f.status) params.set('status', f.status)

      const res = await fetch(`/api/red-canjes?${params.toString()}`)
      const data = await res.json()
      setListings(Array.isArray(data) ? data : [])
    } catch {
      setListings([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchListings(EMPTY_FILTERS) }, [fetchListings])

  const handleApplyFilters = () => {
    setAppliedFilters(filters)
    fetchListings(filters)
  }

  const handleClearFilters = () => {
    const reset = { ...EMPTY_FILTERS, status: 'available' }
    setFilters(reset)
    setAppliedFilters(reset)
    fetchListings(reset)
  }

  const toggleContact = (id: string) => {
    setVisibleContacts(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleClaim = async (propietarioId: string, propertyId: string | null) => {
    setClaimLoading(propietarioId)
    try {
      const res = await fetch('/api/red-canjes/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propietario_id: propietarioId, property_id: propertyId }),
      })
      const data = await res.json()
      if (res.status === 409) {
        showToast('error', data.error || 'Ya está siendo gestionado por otra organización.')
      } else if (!res.ok) {
        showToast('error', data.error || 'Error al tomar gestión.')
      } else {
        showToast('success', '✅ Gestión tomada por 30 días. Ahora puedes ver los datos del propietario.')
        // Update local state optimistically
        setListings(prev => prev.map(l =>
          l.owner_id === propietarioId
            ? { ...l, claim: { subscriber_name: '', claimed_by_name: '', expires_at: new Date(Date.now() + 30 * 86400000).toISOString(), is_mine: true } }
            : l
        ))
      }
    } catch {
      showToast('error', 'Error de conexión. Intenta de nuevo.')
    } finally {
      setClaimLoading(null)
    }
  }

  const handleRelease = async (propietarioId: string) => {
    if (!confirm('¿Liberar la gestión de este propietario? Quedará disponible para otras organizaciones.')) return
    setClaimLoading(propietarioId)
    try {
      const res = await fetch('/api/red-canjes/release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propietario_id: propietarioId }),
      })
      const data = await res.json()
      if (!res.ok) {
        showToast('error', data.error || 'Error al liberar gestión.')
      } else {
        showToast('success', 'Gestión liberada. El propietario está disponible nuevamente.')
        setListings(prev => prev.map(l =>
          l.owner_id === propietarioId ? { ...l, claim: null } : l
        ))
        // Remove contact visibility
        setVisibleContacts(prev => { const next = new Set(prev); next.delete(propietarioId); return next })
      }
    } catch {
      showToast('error', 'Error de conexión. Intenta de nuevo.')
    } finally {
      setClaimLoading(null)
    }
  }

  const hasActiveFilters = Object.values(appliedFilters).some(v => v !== '')
  const searchLower = filters.search.toLowerCase()
  const displayed = listings.filter(l => {
    if (!searchLower) return true
    return (
      l.title?.toLowerCase().includes(searchLower) ||
      l.address?.toLowerCase().includes(searchLower) ||
      l.city?.toLowerCase().includes(searchLower) ||
      l.sector?.toLowerCase().includes(searchLower) ||
      l.region?.toLowerCase().includes(searchLower) ||
      l.propietario?.full_name?.toLowerCase().includes(searchLower)
    )
  })

  const claimedByMe = listings.filter(l => l.claim?.is_mine).length
  const claimedByOthers = listings.filter(l => l.claim && !l.claim.is_mine).length
  const available = listings.filter(l => !l.claim).length

  return (
    <div className="space-y-4">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-start gap-2 px-4 py-3 rounded-lg shadow-lg text-sm max-w-sm transition-all ${
          toast.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" /> : <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />}
          <span>{toast.text}</span>
          <button onClick={() => setToast(null)} className="ml-auto shrink-0"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Stats bar */}
      {!loading && listings.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3 text-center">
            <p className="text-2xl font-bold text-navy">{available}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Disponibles</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{claimedByMe}</p>
            <p className="text-xs text-muted-foreground mt-0.5">En tu gestión</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-2xl font-bold text-red-500">{claimedByOthers}</p>
            <p className="text-xs text-muted-foreground mt-0.5">En gestión por otros</p>
          </Card>
        </div>
      )}

      {/* Filter panel */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between mb-3">
            <button
              className="flex items-center gap-2 text-sm font-medium text-navy hover:text-navy/70 transition-colors"
              onClick={() => setShowFilters(v => !v)}
            >
              <Filter className="h-4 w-4" />
              Filtros
              {hasActiveFilters && <Badge variant="secondary" className="text-xs">Activos</Badge>}
              {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={handleClearFilters} className="gap-1 text-xs h-7">
                  <X className="h-3 w-3" /> Limpiar
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => fetchListings(appliedFilters)} className="gap-1 text-xs h-7">
                <RefreshCw className="h-3 w-3" /> Actualizar
              </Button>
            </div>
          </div>

          {showFilters && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="relative lg:col-span-2">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por dirección, ciudad, propietario..."
                    value={filters.search}
                    onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                    className="pl-8 text-sm"
                  />
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-md border text-sm text-muted-foreground">
                  <Globe className="h-4 w-4 shrink-0" />
                  <span>País: <strong className="text-foreground">Chile</strong></span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <Select value={filters.region || '_all'} onValueChange={v => setFilters(f => ({ ...f, region: v === '_all' ? '' : v }))}>
                  <SelectTrigger className="text-sm"><SelectValue placeholder="Región" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">Todas las regiones</SelectItem>
                    {CHILE_REGIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>

                <Input placeholder="Ciudad" value={filters.city} onChange={e => setFilters(f => ({ ...f, city: e.target.value }))} className="text-sm" />

                <Select value={filters.operation || '_all'} onValueChange={v => setFilters(f => ({ ...f, operation: v === '_all' ? '' : v }))}>
                  <SelectTrigger className="text-sm"><SelectValue placeholder="Operación" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">Todas las operaciones</SelectItem>
                    {OPERATION_TYPES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>

                <Select value={filters.type || '_all'} onValueChange={v => setFilters(f => ({ ...f, type: v === '_all' ? '' : v }))}>
                  <SelectTrigger className="text-sm"><SelectValue placeholder="Tipo de propiedad" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">Todos los tipos</SelectItem>
                    {PROPERTY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-md border border-green-200 text-sm text-green-700">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>Estado: <strong>Disponibles</strong></span>
                </div>
                <Button onClick={handleApplyFilters} size="sm" className="gap-2">
                  <Search className="h-3.5 w-3.5" /> Aplicar filtros
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {loading ? 'Cargando...' : `${displayed.length} propiedades en la red`}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Building2 className="h-12 w-12 text-gray-300 mb-3" />
          <h3 className="font-medium text-gray-600 mb-1">Sin propiedades en la red</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Aún no hay propiedades publicadas por propietarios que coincidan con los filtros.
          </p>
          {hasActiveFilters && (
            <Button variant="outline" size="sm" className="mt-4" onClick={handleClearFilters}>
              Limpiar filtros
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {displayed.map(listing => (
            <ListingCard
              key={listing.id}
              listing={listing}
              showContact={visibleContacts.has(listing.id)}
              onToggleContact={() => toggleContact(listing.id)}
              onClaim={handleClaim}
              onRelease={handleRelease}
              claimLoading={claimLoading === listing.owner_id}
            />
          ))}
        </div>
      )}
    </div>
  )
}
