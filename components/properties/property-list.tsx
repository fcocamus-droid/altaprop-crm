'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/status-badge'
import { deleteProperty, updatePropertyStatus, updatePropertyAgent, finalizeProperty, updatePropertyWebsiteVisibility, toggleRedCanjesVisibility } from '@/lib/actions/properties'
import { notifyAgentAssignment } from '@/lib/actions/agent-notify'
import { Pencil, Trash2, CalendarDays, ChevronLeft, ChevronRight, Lock, Unlock, Loader2, UserCircle, CheckCircle, XCircle, Clock, Ban, Home, Key, Trophy, AlertCircle, Mail, Globe, GlobeLock, Send, GitMerge } from 'lucide-react'
import { SendFichaModal } from '@/components/properties/send-ficha-modal'

function formatPrice(price: number, currency: string) {
  if (currency === 'UF') return `${price} UF`
  if (currency === 'USD') return `$${price.toLocaleString('en-US')} USD`
  return `$${price.toLocaleString('es-CL')}`
}

interface Agent {
  id: string
  full_name: string | null
}

interface Property {
  id: string
  title: string
  price: number
  currency: string
  operation: string
  city: string
  sector: string
  status: string
  agent_id: string | null
  agent?: { id: string; full_name: string | null } | null
  images?: { url: string }[]
  website_visible?: boolean | null
  red_canjes_visible?: boolean | null
  has_active_red_canjes_claim?: boolean | null
  owner_role?: string | null
  ml_item_id?: string | null
  ml_status?: string | null
}

export function PropertyList({ properties: initialProperties, agents = [], currentUserRole = '' }: { properties: Property[]; agents?: Agent[]; currentUserRole?: string }) {
  const [properties, setProperties] = useState(initialProperties)
  const [search, setSearch] = useState('')
  const [filterOp, setFilterOp] = useState('all')
  const [filterAgent, setFilterAgent] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [statusTab, setStatusTab] = useState('available')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [finalizingProp, setFinalizingProp] = useState<string | null>(null)   // property id showing confirm panel
  const [finalizeLoading, setFinalizeLoading] = useState<string | null>(null) // property id being finalized
  const [calOpen, setCalOpen] = useState<string | null>(null)
  const [calMonth, setCalMonth] = useState(new Date().getMonth())
  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [calDate, setCalDate] = useState<string | null>(null)
  const [blocked, setBlocked] = useState<any[]>([])
  const [loadingSlot, setLoadingSlot] = useState<string | null>(null)
  const router = useRouter()

  async function openCalendar(propertyId: string) {
    if (calOpen === propertyId) { setCalOpen(null); return }
    setCalOpen(propertyId)
    setCalDate(null)
    setBlocked([])
    setCalMonth(new Date().getMonth())
    setCalYear(new Date().getFullYear())
  }

  async function selectDay(date: string) {
    setCalDate(date)
    const res = await fetch(`/api/visits/slots?propertyId=${calOpen}&date=${date}`)
    const data = await res.json()
    setBlocked(data.slots?.filter((s: any) => !s.available).map((s: any) => s.time) || [])
  }

  async function toggleSlot(date: string, time: string) {
    setLoadingSlot(time)
    const isBlocked = blocked.includes(time)
    if (isBlocked) {
      await fetch(`/api/visits/blocked?date=${date}&time=${time}`, { method: 'DELETE' })
      setBlocked(prev => prev.filter(t => t !== time))
    } else {
      await fetch('/api/visits/blocked', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, time }),
      })
      setBlocked(prev => [...prev, time])
    }
    setLoadingSlot(null)
  }

  async function toggleFullDay(date: string) {
    setLoadingSlot('fullday')
    const isFullBlocked = blocked.length >= 26
    if (isFullBlocked) {
      await fetch(`/api/visits/blocked?date=${date}`, { method: 'DELETE' })
      setBlocked([])
    } else {
      await fetch('/api/visits/blocked', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, fullDay: true }),
      })
      const allTimes: string[] = []
      for (let h = 0; h < 24; h++) { allTimes.push(`${String(h).padStart(2,'0')}:00`); allTimes.push(`${String(h).padStart(2,'0')}:30`) }
      setBlocked(allTimes)
    }
    setLoadingSlot(null)
  }

  const [notifyingAgent, setNotifyingAgent] = useState<string | null>(null)
  const [notifySuccess, setNotifySuccess] = useState<string | null>(null)
  const [togglingWeb, setTogglingWeb] = useState<string | null>(null)
  const [togglingCanjes, setTogglingCanjes] = useState<string | null>(null)
  const [sendFichaId, setSendFichaId] = useState<string | null>(null)

  const handleNotifyAgent = async (propertyId: string, agentId: string) => {
    setNotifyingAgent(propertyId)
    const result = await notifyAgentAssignment(propertyId, agentId)
    setNotifyingAgent(null)
    if (result.error) {
      alert(result.error)
    } else {
      setNotifySuccess(propertyId)
      setTimeout(() => setNotifySuccess(null), 3000)
    }
  }

  const handleToggleWebVisibility = async (id: string, current: boolean) => {
    setTogglingWeb(id)
    setProperties(prev => prev.map(p => p.id === id ? { ...p, website_visible: !current } : p))
    const result = await updatePropertyWebsiteVisibility(id, !current)
    if (result?.error) {
      setProperties(prev => prev.map(p => p.id === id ? { ...p, website_visible: current } : p))
    }
    setTogglingWeb(null)
  }

  const handleToggleRedCanjes = async (id: string, current: boolean) => {
    setTogglingCanjes(id)
    setProperties(prev => prev.map(p => p.id === id ? { ...p, red_canjes_visible: !current } : p))
    const result = await toggleRedCanjesVisibility(id, !current)
    if (result?.error) {
      setProperties(prev => prev.map(p => p.id === id ? { ...p, red_canjes_visible: current } : p))
      alert(result.error)
    }
    setTogglingCanjes(null)
  }

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`¿Eliminar "${title}"? Esta acción no se puede deshacer.`)) return

    setDeleting(id)
    const result = await deleteProperty(id)

    if (result.error) {
      alert(result.error)
      setDeleting(null)
      return
    }

    setProperties(prev => prev.filter(p => p.id !== id))
    setDeleting(null)
    router.refresh()
  }

  const stages = [
    { key: 'available', label: 'Disponibles', icon: CheckCircle, color: 'text-green-600', bgActive: 'bg-green-100 text-green-800 border-green-300' },
    { key: 'unavailable', label: 'No Disponibles', icon: Ban, color: 'text-gray-500', bgActive: 'bg-gray-100 text-gray-800 border-gray-300' },
    { key: 'reserved', label: 'Reservadas', icon: Clock, color: 'text-yellow-600', bgActive: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
    { key: 'rented', label: 'Arrendadas', icon: Home, color: 'text-blue-600', bgActive: 'bg-blue-100 text-blue-800 border-blue-300' },
    { key: 'sold', label: 'Vendidas', icon: XCircle, color: 'text-purple-600', bgActive: 'bg-purple-100 text-purple-800 border-purple-300' },
  ]

  const filtered = properties.filter(p => {
    if (p.status !== statusTab) return false
    if (search) {
      const q = search.toLowerCase()
      if (!p.title.toLowerCase().includes(q) && !p.city?.toLowerCase().includes(q) && !p.sector?.toLowerCase().includes(q)) return false
    }
    if (filterOp !== 'all' && p.operation !== filterOp) return false
    if (filterAgent !== 'all' && (p.agent_id || 'none') !== filterAgent) return false
    return true
  })

  return (
    <div className="space-y-4">
      {/* Stage Tabs */}
      <div className="flex gap-2 flex-wrap">
        {stages.map(stage => {
          const count = properties.filter(p => p.status === stage.key).length
          return (
            <button
              key={stage.key}
              onClick={() => setStatusTab(stage.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                statusTab === stage.key
                  ? stage.bgActive
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
              }`}
            >
              <stage.icon className={`h-3.5 w-3.5 ${statusTab === stage.key ? '' : stage.color}`} />
              {stage.label}
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${statusTab === stage.key ? 'bg-white/50' : 'bg-muted'}`}>{count}</span>
            </button>
          )
        })}
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre, ciudad o sector..."
            className="w-full h-9 pl-9 pr-3 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-navy/20"
          />
          <svg className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3" strokeLinecap="round"/></svg>
        </div>
        <select value={filterOp} onChange={e => setFilterOp(e.target.value)}
          className="h-9 px-3 text-sm border rounded-lg bg-background">
          <option value="all">Operación</option>
          <option value="arriendo">Arriendo</option>
          <option value="venta">Venta</option>
        </select>
        {agents.length > 0 && (
          <select value={filterAgent} onChange={e => setFilterAgent(e.target.value)}
            className="h-9 px-3 text-sm border rounded-lg bg-background">
            <option value="all">Agente</option>
            <option value="none">Sin asignar</option>
            {agents.map(a => (
              <option key={a.id} value={a.id}>{a.full_name || 'Sin nombre'}</option>
            ))}
          </select>
        )}
        {(search || filterOp !== 'all' || filterAgent !== 'all') && (
          <button onClick={() => { setSearch(''); setFilterOp('all'); setFilterAgent('all') }}
            className="h-9 px-3 text-xs text-muted-foreground hover:text-foreground border rounded-lg">
            Limpiar
          </button>
        )}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Home className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p className="font-medium">Sin propiedades {stages.find(s => s.key === statusTab)?.label.toLowerCase()}</p>
          <p className="text-sm">Las propiedades con este estado aparecerán aquí</p>
        </div>
      )}

      {filtered.map((property) => (
        <Card key={property.id} className={deleting === property.id ? 'opacity-50' : ''}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted shrink-0">
                  {property.images?.[0]?.url ? (
                    <img src={property.images[0].url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">N/A</div>
                  )}
                </div>
                <div className="min-w-0">
                  <Link href={`/propiedades/${property.id}`} target="_blank" className="hover:underline">
                    <h3 className="font-semibold truncate">{property.title}</h3>
                  </Link>
                  <p className="text-sm text-muted-foreground">{property.city}{property.sector ? `, ${property.sector}` : ''}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-semibold text-sm text-navy">{formatPrice(property.price, property.currency)}</span>
                    {/* Editable dropdown for ALL statuses — admin/agent can always correct */}
                    <select
                      value={property.status}
                      onChange={async (e) => {
                        const newStatus = e.target.value
                        // Confirmation panel only when going reserved → rented/sold (finalization flow)
                        if (property.status === 'reserved' && (newStatus === 'rented' || newStatus === 'sold')) {
                          setFinalizingProp(`${property.id}:${newStatus}`)
                          return
                        }
                        // All other transitions (including rented/sold → available) update directly
                        const prevStatus = property.status
                        setProperties(prev => prev.map(p => p.id === property.id ? { ...p, status: newStatus } : p))
                        const result = await updatePropertyStatus(property.id, newStatus)
                        if (result?.error) {
                          setProperties(prev => prev.map(p => p.id === property.id ? { ...p, status: prevStatus } : p))
                          alert(`Error al actualizar estado: ${result.error}`)
                        }
                      }}
                      className={`text-xs font-medium px-2 py-1 rounded-full border cursor-pointer appearance-none pr-6 ${
                        property.status === 'available'   ? 'bg-green-100 text-green-800 border-green-200' :
                        property.status === 'unavailable' ? 'bg-gray-100 text-gray-800 border-gray-200' :
                        property.status === 'reserved'    ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                        property.status === 'rented'      ? 'bg-blue-100 text-blue-800 border-blue-200' :
                        property.status === 'sold'        ? 'bg-purple-100 text-purple-800 border-purple-200' :
                        'bg-gray-100 text-gray-800 border-gray-200'
                      }`}
                      style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center' }}
                    >
                      <option value="available">✅ Disponible</option>
                      <option value="unavailable">🚫 No Disponible</option>
                      <option value="reserved">⏳ Reservada</option>
                      <option value="rented">🔑 Arrendada</option>
                      <option value="sold">🏆 Vendida</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {property.website_visible !== false
                      ? <><Globe className="h-3 w-3 text-gold" /><span className="text-[10px] text-gold font-medium">En sitio web</span></>
                      : <><GlobeLock className="h-3 w-3 text-muted-foreground" /><span className="text-[10px] text-muted-foreground">Oculta del sitio</span></>
                    }
                  </div>

                  {/* ML / Portal Inmobiliario publication indicator */}
                  {property.ml_item_id && (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="https://www.google.com/s2/favicons?domain=mercadolibre.cl&sz=16"
                        alt="ML"
                        className="h-3 w-3 rounded-sm object-contain"
                      />
                      <span className={`text-[10px] font-medium ${
                        property.ml_status === 'active'          ? 'text-green-600' :
                        property.ml_status === 'paused'          ? 'text-yellow-600' :
                        property.ml_status === 'payment_required'? 'text-orange-500' :
                        property.ml_status === 'not_yet_active'  ? 'text-blue-500'   :
                        'text-muted-foreground'
                      }`}>
                        {property.ml_status === 'active'           ? 'Publicado en portales' :
                         property.ml_status === 'paused'           ? 'Pausado en portales'   :
                         property.ml_status === 'payment_required' ? 'Pago pendiente ML'      :
                         property.ml_status === 'not_yet_active'   ? 'Activando en ML…'       :
                         'En portales'}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 mt-1">
                    <UserCircle className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    {agents.length > 0 && (currentUserRole === 'SUPERADMIN' || currentUserRole === 'SUPERADMINBOSS') ? (
                      <select
                        value={property.agent_id || ''}
                        onChange={async (e) => {
                          const newAgentId = e.target.value || null
                          const newAgent = agents.find(a => a.id === newAgentId) || null
                          setProperties(prev => prev.map(p => p.id === property.id ? { ...p, agent_id: newAgentId, agent: newAgent ? { id: newAgent.id, full_name: newAgent.full_name } : null } : p))
                          await updatePropertyAgent(property.id, newAgentId)
                        }}
                        className="text-xs text-muted-foreground bg-transparent border-none cursor-pointer hover:text-foreground p-0 focus:outline-none focus:ring-0"
                      >
                        <option value="">Sin asignar</option>
                        {agents.map(a => (
                          <option key={a.id} value={a.id}>{a.full_name || 'Sin nombre'}</option>
                        ))}
                      </select>
                    ) : (
                      <span className={`text-xs font-medium ${property.agent?.full_name ? 'text-navy' : 'text-muted-foreground'}`}>
                        {property.agent?.full_name || 'Sin agente asignado'}
                      </span>
                    )}

                    {/* Notify agent button — only when an agent is assigned */}
                    {property.agent_id && (currentUserRole === 'SUPERADMIN' || currentUserRole === 'SUPERADMINBOSS') && (
                      <button
                        type="button"
                        title={notifySuccess === property.id ? '¡Correo enviado!' : 'Notificar al agente por email'}
                        disabled={notifyingAgent === property.id}
                        onClick={() => handleNotifyAgent(property.id, property.agent_id!)}
                        className={`ml-1 inline-flex items-center justify-center rounded-full w-5 h-5 transition-colors ${
                          notifySuccess === property.id
                            ? 'bg-green-100 text-green-600'
                            : 'bg-navy/10 text-navy hover:bg-navy/20'
                        }`}
                      >
                        {notifyingAgent === property.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : notifySuccess === property.id ? (
                          <CheckCircle className="h-3 w-3" />
                        ) : (
                          <Mail className="h-3 w-3" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  title={property.website_visible !== false ? 'Ocultar del sitio web' : 'Mostrar en sitio web'}
                  disabled={togglingWeb === property.id}
                  onClick={() => handleToggleWebVisibility(property.id, property.website_visible !== false)}
                  className={`inline-flex items-center justify-center h-8 w-8 rounded-md border transition-colors disabled:opacity-50 ${
                    property.website_visible !== false
                      ? 'border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100'
                      : 'border-gray-200 bg-white text-gray-400 hover:bg-gray-50'
                  }`}
                >
                  {togglingWeb === property.id
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : property.website_visible !== false
                      ? <Globe className="h-3.5 w-3.5" />
                      : <GlobeLock className="h-3.5 w-3.5" />
                  }
                </button>

                {/* Red de Canjes toggle — hidden for properties sourced from Red de Canjes (active claim) */}
                {(currentUserRole === 'SUPERADMIN' || currentUserRole === 'AGENTE' || currentUserRole === 'SUPERADMINBOSS') && !property.has_active_red_canjes_claim && (
                  <button
                    type="button"
                    title={property.red_canjes_visible ? 'Quitar de Red de Canjes' : 'Publicar en Red de Canjes'}
                    disabled={togglingCanjes === property.id}
                    onClick={() => handleToggleRedCanjes(property.id, !!property.red_canjes_visible)}
                    className={`inline-flex items-center justify-center h-8 w-8 rounded-md border transition-colors disabled:opacity-50 ${
                      property.red_canjes_visible
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                        : 'border-gray-200 bg-white text-gray-400 hover:bg-gray-50'
                    }`}
                  >
                    {togglingCanjes === property.id
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <GitMerge className="h-3.5 w-3.5" />
                    }
                  </button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  title="Enviar ficha por email"
                  onClick={() => setSendFichaId(property.id)}
                  className="border-navy/20 text-navy hover:bg-navy/5"
                >
                  <Send className="h-3 w-3" />
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/dashboard/propiedades/${property.id}`}>
                    <Pencil className="mr-2 h-3 w-3" />Editar
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openCalendar(property.id)}
                  className={`${calOpen === property.id ? 'bg-gold/10 border-gold text-gold' : 'border-gold/50 text-gold hover:bg-gold/10'}`}
                  title="Gestionar horarios de visita"
                >
                  <CalendarDays className="h-3 w-3" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(property.id, property.title)}
                  disabled={deleting === property.id}
                  className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-700"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Finalize confirmation panel — reserved → rented / sold */}
            {finalizingProp?.startsWith(`${property.id}:`) && (() => {
              const targetStatus = finalizingProp.split(':')[1] as 'rented' | 'sold'
              const isRented = targetStatus === 'rented'
              return (
                <div className={`mt-3 pt-3 border-t rounded-xl border-2 p-4 space-y-3 ${isRented ? 'border-blue-200 bg-blue-50' : 'border-purple-200 bg-purple-50'}`}>
                  <div className="flex items-center gap-2">
                    {isRented
                      ? <Key className="h-5 w-5 text-blue-600 shrink-0" />
                      : <Trophy className="h-5 w-5 text-purple-600 shrink-0" />}
                    <p className={`font-semibold ${isRented ? 'text-blue-900' : 'text-purple-900'}`}>
                      Confirmar {isRented ? 'Arriendo' : 'Venta'}
                    </p>
                  </div>
                  <p className={`text-sm ${isRented ? 'text-blue-800' : 'text-purple-800'}`}>
                    La propiedad <strong>{property.title}</strong> pasará a <strong>{isRented ? 'Arrendada' : 'Vendida'}</strong>.
                    Se enviará email de confirmación al arrendatario aprobado y se archivará su postulación.
                  </p>
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      disabled={finalizeLoading === property.id}
                      className={isRented ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-purple-600 hover:bg-purple-700 text-white'}
                      onClick={async () => {
                        setFinalizeLoading(property.id)
                        const result = await finalizeProperty(property.id, targetStatus)
                        if (!result.error) {
                          setProperties(prev => prev.map(p => p.id === property.id ? { ...p, status: targetStatus } : p))
                          setFinalizingProp(null)
                        }
                        setFinalizeLoading(null)
                      }}
                    >
                      {finalizeLoading === property.id
                        ? <><Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />Procesando...</>
                        : isRented ? <><Key className="mr-1 h-3.5 w-3.5" />Confirmar Arriendo</>
                                   : <><Trophy className="mr-1 h-3.5 w-3.5" />Confirmar Venta</>
                      }
                    </Button>
                    <Button size="sm" variant="outline" disabled={finalizeLoading === property.id}
                      onClick={() => setFinalizingProp(null)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              )
            })()}

            {/* Inline calendar for blocking/unblocking visit hours */}
            {calOpen === property.id && (
              <div className="mt-3 pt-3 border-t">
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-gold" /> Gestionar horarios de visita
                </p>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="md:w-[220px]">
                    <div className="flex items-center justify-between mb-2">
                      <button type="button" onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1) } else setCalMonth(calMonth - 1) }} className="p-1 hover:bg-muted rounded"><ChevronLeft className="h-4 w-4" /></button>
                      <span className="text-xs font-medium">{['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][calMonth]} {calYear}</span>
                      <button type="button" onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1) } else setCalMonth(calMonth + 1) }} className="p-1 hover:bg-muted rounded"><ChevronRight className="h-4 w-4" /></button>
                    </div>
                    <div className="grid grid-cols-7 gap-0.5 text-center">
                      {['D','L','M','M','J','V','S'].map((d,i) => <div key={i} className="text-[10px] text-muted-foreground py-0.5">{d}</div>)}
                      {(() => {
                        const first = new Date(calYear, calMonth, 1).getDay()
                        const days = new Date(calYear, calMonth + 1, 0).getDate()
                        const cells: React.ReactNode[] = []
                        for (let i = 0; i < first; i++) cells.push(<div key={`e${i}`} />)
                        for (let d = 1; d <= days; d++) {
                          const ds = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
                          cells.push(
                            <button key={d} type="button" onClick={() => selectDay(ds)}
                              className={`text-xs py-1 rounded hover:bg-gold/20 ${calDate === ds ? 'bg-navy text-white font-bold' : ''}`}
                            >{d}</button>
                          )
                        }
                        return cells
                      })()}
                    </div>
                  </div>
                  <div className="flex-1">
                    {calDate ? (
                      <>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-medium">{calDate}</p>
                          <Button size="sm" variant="outline" onClick={() => toggleFullDay(calDate)}
                            disabled={loadingSlot === 'fullday'}
                            className={`text-xs h-7 ${blocked.length >= 26 ? 'text-green-600' : 'text-red-600'}`}>
                            {loadingSlot === 'fullday' ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : blocked.length >= 26 ? <Unlock className="h-3 w-3 mr-1" /> : <Lock className="h-3 w-3 mr-1" />}
                            {blocked.length >= 26 ? 'Desbloquear dia' : 'Bloquear dia'}
                          </Button>
                        </div>
                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-1 max-h-[180px] overflow-y-auto">
                          {Array.from({ length: 26 }, (_, i) => {
                            const h = Math.floor(i / 2) + 8
                            const m = i % 2 === 0 ? '00' : '30'
                            const t = `${String(h).padStart(2, '0')}:${m}`
                            if (h >= 21) return null
                            const isBlocked = blocked.includes(t)
                            const isLoading = loadingSlot === t
                            return (
                              <button key={t} type="button" onClick={() => toggleSlot(calDate, t)} disabled={isLoading}
                                className={`py-1 text-[11px] rounded border transition-all ${isBlocked ? 'bg-red-100 text-red-700 border-red-200 line-through' : 'hover:bg-green-50 border-green-200 text-green-700'}`}>
                                {isLoading ? <Loader2 className="h-3 w-3 animate-spin mx-auto" /> : t}
                              </button>
                            )
                          })}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-2">Rojo = bloqueado. Verde = disponible. Clic para cambiar.</p>
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground py-6 text-center">Selecciona un dia para gestionar horarios</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Send Ficha Modal */}
      {sendFichaId && (() => {
        const prop = properties.find(p => p.id === sendFichaId)
        if (!prop) return null
        return (
          <SendFichaModal
            propertyId={sendFichaId}
            propertyTitle={prop.title}
            onClose={() => setSendFichaId(null)}
          />
        )
      })()}
    </div>
  )
}
