'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/status-badge'
import { deleteProperty, updatePropertyStatus } from '@/lib/actions/properties'
import { Pencil, Trash2, CalendarDays, ChevronLeft, ChevronRight, Lock, Unlock, Loader2 } from 'lucide-react'

function formatPrice(price: number, currency: string) {
  if (currency === 'UF') return `${price} UF`
  if (currency === 'USD') return `$${price.toLocaleString('en-US')} USD`
  return `$${price.toLocaleString('es-CL')}`
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
  images?: { url: string }[]
}

export function PropertyList({ properties: initialProperties }: { properties: Property[] }) {
  const [properties, setProperties] = useState(initialProperties)
  const [search, setSearch] = useState('')
  const [filterOp, setFilterOp] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [deleting, setDeleting] = useState<string | null>(null)
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

  const filtered = properties.filter(p => {
    if (search) {
      const q = search.toLowerCase()
      if (!p.title.toLowerCase().includes(q) && !p.city?.toLowerCase().includes(q) && !p.sector?.toLowerCase().includes(q)) return false
    }
    if (filterOp !== 'all' && p.operation !== filterOp) return false
    if (filterStatus !== 'all' && p.status !== filterStatus) return false
    return true
  })

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
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
          <option value="all">Operacion</option>
          <option value="arriendo">Arriendo</option>
          <option value="venta">Venta</option>
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="h-9 px-3 text-sm border rounded-lg bg-background">
          <option value="all">Estado</option>
          <option value="available">Disponible</option>
          <option value="unavailable">No Disponible</option>
          <option value="reserved">Reservada</option>
          <option value="rented">Arrendada</option>
          <option value="sold">Vendida</option>
        </select>
        {(search || filterOp !== 'all' || filterStatus !== 'all') && (
          <button onClick={() => { setSearch(''); setFilterOp('all'); setFilterStatus('all') }}
            className="h-9 px-3 text-xs text-muted-foreground hover:text-foreground border rounded-lg">
            Limpiar
          </button>
        )}
      </div>

      {filtered.length === 0 && properties.length > 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">No se encontraron propiedades con esos filtros</p>
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
                  <h3 className="font-semibold truncate">{property.title}</h3>
                  <p className="text-sm text-muted-foreground">{property.city}{property.sector ? `, ${property.sector}` : ''}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-semibold text-sm text-navy">{formatPrice(property.price, property.currency)}</span>
                    <select
                      value={property.status}
                      onChange={async (e) => {
                        const newStatus = e.target.value
                        setProperties(prev => prev.map(p => p.id === property.id ? { ...p, status: newStatus } : p))
                        await updatePropertyStatus(property.id, newStatus)
                      }}
                      className={`text-xs font-medium px-2 py-1 rounded-full border cursor-pointer appearance-none pr-6 ${
                        property.status === 'available' ? 'bg-green-100 text-green-800 border-green-200' :
                        property.status === 'unavailable' ? 'bg-gray-100 text-gray-800 border-gray-200' :
                        property.status === 'reserved' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                        property.status === 'rented' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                        property.status === 'sold' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                        'bg-gray-100 text-gray-800 border-gray-200'
                      }`}
                      style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center' }}
                    >
                      <option value="available">Disponible</option>
                      <option value="unavailable">No Disponible</option>
                      <option value="reserved">Reservada</option>
                      <option value="rented">Arrendada</option>
                      <option value="sold">Vendida</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
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
    </div>
  )
}
