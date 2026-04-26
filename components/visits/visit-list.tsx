'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { VISIT_STATUSES } from '@/lib/constants'
import { createVisit, updateVisitStatus, deleteVisit } from '@/lib/actions/visits'
import { Calendar, MapPin, Clock, Plus, CheckCircle, XCircle, Trash2, CalendarDays, ChevronLeft, ChevronRight, Loader2, Search, ExternalLink, Download, UserCheck, KeyRound } from 'lucide-react'
import Link from 'next/link'
import { toChileDatetime, formatChileDateTimeDisplay } from '@/lib/utils/chile-datetime'

interface Visit {
  id: string
  property_id: string
  scheduled_at: string
  status: string
  notes: string | null
  property?: {
    id: string
    title: string
    address: string | null
    city: string | null
    agent?: { id: string; full_name: string | null } | null
    owner?: { id: string; full_name: string | null } | null
  }
  visitor?: { id: string; full_name: string | null; phone: string | null }
}

interface Property {
  id: string
  title: string
}

function getStatusInfo(status: string) {
  return VISIT_STATUSES.find(s => s.value === status) || VISIT_STATUSES[0]
}

const BUSINESS_HOURS = [
  '09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30',
  '14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00',
]

function formatDateTime(date: string) {
  return formatChileDateTimeDisplay(date)
}

export function VisitList({ visits: initialVisits, properties, canCreate }: {
  visits: Visit[]
  properties: Property[]
  canCreate: boolean
}) {
  const [visits, setVisits] = useState(initialVisits)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)
  const [pdfLoading, setPdfLoading] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [calendarOpen, setCalendarOpen] = useState<string | null>(null)
  const [calDate, setCalDate] = useState('')
  const [calTime, setCalTime] = useState('')
  const [calMonth, setCalMonth] = useState(new Date().getMonth())
  const [calYear, setCalYear] = useState(new Date().getFullYear())

  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  const [newVisit, setNewVisit] = useState({ property_id: '', date: '', time: '', notes: '' })

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading('create')
    setError('')
    const scheduled_at = toChileDatetime(newVisit.date, newVisit.time)
    const result = await createVisit({
      property_id: newVisit.property_id,
      scheduled_at,
      notes: newVisit.notes || undefined,
    })
    if (result.error) { setError(result.error) } else {
      setSuccess('Visita agendada')
      setShowForm(false)
      setNewVisit({ property_id: '', date: '', time: '', notes: '' })
      window.location.reload()
    }
    setLoading(null)
  }

  function openCalendarFor(visitId: string) {
    setCalendarOpen(calendarOpen === visitId ? null : visitId)
    setCalDate('')
    setCalTime('')
    setCalMonth(new Date().getMonth())
    setCalYear(new Date().getFullYear())
  }

  async function handleConfirmWithDate(visitId: string) {
    if (!calDate || !calTime) return
    setLoading(visitId)
    const scheduledAt = toChileDatetime(calDate, calTime)
    try {
      const res = await fetch(`/api/visits/${visitId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduled_at: scheduledAt }),
      })
      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else {
        setVisits(prev => prev.map(v => v.id === visitId ? { ...v, status: 'confirmed', scheduled_at: scheduledAt } : v))
        setCalendarOpen(null)
        setSuccess(data.visitNumber ? `Visita confirmada — Orden N° ${data.visitNumber} enviada por email` : 'Visita confirmada')
      }
    } catch {
      setError('Error al confirmar la visita')
    }
    setLoading(null)
  }

  async function handleStatus(visitId: string, status: string) {
    setLoading(visitId)
    const result = await updateVisitStatus(visitId, status)
    if (result.error) { setError(result.error) } else {
      setVisits(prev => prev.map(v => v.id === visitId ? { ...v, status } : v))
      setSuccess('Estado actualizado')
    }
    setLoading(null)
  }

  async function handleDelete(visitId: string) {
    if (!confirm('Eliminar esta visita?')) return
    setLoading(visitId)
    const result = await deleteVisit(visitId)
    if (result.error) { setError(result.error) } else {
      setVisits(prev => prev.filter(v => v.id !== visitId))
      setSuccess('Visita eliminada')
    }
    setLoading(null)
  }

  async function handleDownloadPDF(visitId: string) {
    setPdfLoading(visitId)
    try {
      const res = await fetch(`/api/visits/${visitId}/pdf`)
      if (!res.ok) { setError('No se pudo generar el PDF'); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const disposition = res.headers.get('Content-Disposition') || ''
      const filenameMatch = disposition.match(/filename="([^"]+)"/)
      a.href = url
      a.download = filenameMatch?.[1] || `orden-visita.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      setError('Error al descargar el PDF')
    }
    setPdfLoading(null)
  }

  return (
    <div className="space-y-4">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{success}</div>}

      {canCreate && (
        <div className="flex justify-end">
          <Button onClick={() => setShowForm(!showForm)} className="bg-navy hover:bg-navy/90">
            {showForm ? 'Cancelar' : <><Plus className="mr-2 h-4 w-4" />Agendar Visita</>}
          </Button>
        </div>
      )}

      {showForm && (
        <Card className="border-2 border-gold/30">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-navy mb-4">Nueva Visita</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Propiedad</Label>
                  <select
                    value={newVisit.property_id}
                    onChange={(e) => setNewVisit({ ...newVisit, property_id: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    required
                  >
                    <option value="">Seleccionar propiedad...</option>
                    {properties.map(p => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Fecha</Label>
                  <Input type="date" value={newVisit.date} onChange={(e) => setNewVisit({ ...newVisit, date: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Hora</Label>
                  <select
                    className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    value={newVisit.time}
                    onChange={(e) => setNewVisit({ ...newVisit, time: e.target.value })}
                    required
                  >
                    <option value="">Seleccionar hora...</option>
                    {BUSINESS_HOURS.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Notas (opcional)</Label>
                  <Input value={newVisit.notes} onChange={(e) => setNewVisit({ ...newVisit, notes: e.target.value })} placeholder="Detalles de la visita..." />
                </div>
              </div>
              <Button type="submit" className="bg-navy hover:bg-navy/90" disabled={loading === 'create'}>
                {loading === 'create' ? 'Agendando...' : 'Agendar Visita'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por propiedad, visitante, RUT, email, teléfono..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          {[{ value: 'all', label: 'Todas' }, ...VISIT_STATUSES].map((s) => {
            const statusInfo = s.value === 'all' ? null : getStatusInfo(s.value)
            return (
              <button
                key={s.value}
                onClick={() => setFilterStatus(s.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap ${
                  filterStatus === s.value
                    ? s.value === 'all'
                      ? 'bg-navy text-white border-navy'
                      : `${statusInfo?.color} border-current ring-1 ring-offset-1`
                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                }`}
              >
                {s.label}
              </button>
            )
          })}
        </div>
      </div>

      {(() => {
        const filtered = visits.filter((v) => {
          if (filterStatus !== 'all' && v.status !== filterStatus) return false
          if (search) {
            const q = search.toLowerCase()
            const title = ((v.property as any)?.title || '').toLowerCase()
            const city = ((v.property as any)?.city || '').toLowerCase()
            const visitor = ((v.visitor as any)?.full_name || '').toLowerCase()
            const notes = (v.notes || '').toLowerCase()
            return title.includes(q) || city.includes(q) || visitor.includes(q) || notes.includes(q)
          }
          return true
        })

        if (visits.length === 0) return (
          <div className="text-center py-12 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No hay visitas agendadas</p>
            <p className="text-sm">Agenda tu primera visita para empezar</p>
          </div>
        )

        if (filtered.length === 0) return (
          <div className="text-center py-8 text-muted-foreground">
            <Search className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="font-medium">No se encontraron visitas</p>
            <p className="text-sm">Prueba con otro término de búsqueda o filtro</p>
          </div>
        )

        return (
      <div className="space-y-3">
        {filtered.map((visit) => {
          const status = getStatusInfo(visit.status)
          const isLoading = loading === visit.id
          return (
            <Card key={visit.id} className={`transition-all ${isLoading ? 'opacity-60' : ''}`}>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <Calendar className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <Link
                        href={`/dashboard/propiedades/${visit.property_id}`}
                        className="font-medium truncate hover:text-blue-600 hover:underline inline-flex items-center gap-1 group"
                        target="_blank"
                      >
                        {visit.property?.title || 'Propiedad'}
                        <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-60 flex-shrink-0 transition-opacity" />
                      </Link>
                      {visit.property?.address && (
                        <p className="text-xs text-slate-600 mt-0.5 flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-slate-400" />
                          {visit.property.address}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDateTime(visit.scheduled_at)}</span>
                        {visit.property?.city && (
                          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{visit.property.city}</span>
                        )}
                        {visit.property?.agent?.full_name && (
                          <span className="flex items-center gap-1 text-blue-700">
                            <UserCheck className="h-3 w-3" />
                            <span className="font-medium">Agente:</span> {visit.property.agent.full_name}
                          </span>
                        )}
                        {visit.property?.owner?.full_name && (
                          <span className="flex items-center gap-1 text-emerald-700">
                            <KeyRound className="h-3 w-3" />
                            <span className="font-medium">Propietario:</span> {visit.property.owner.full_name}
                          </span>
                        )}
                      </div>
                      {visit.notes && <p className="text-xs text-muted-foreground mt-1 italic">{visit.notes}</p>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <select
                      value={visit.status}
                      onChange={(e) => handleStatus(visit.id, e.target.value)}
                      disabled={isLoading}
                      className={`text-xs font-medium px-3 py-1.5 rounded-full border cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${status.color}`}
                    >
                      {VISIT_STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                    {visit.status === 'pending' && (
                      <Button size="sm" variant="outline" onClick={() => openCalendarFor(visit.id)} disabled={isLoading}
                        className={`h-8 px-2 ${calendarOpen === visit.id ? 'bg-blue-100 border-blue-400 text-blue-700' : 'text-blue-600 border-blue-200 hover:bg-blue-50'}`}
                        title="Agendar y confirmar">
                        <CalendarDays className="h-4 w-4" />
                      </Button>
                    )}
                    {(visit.status === 'confirmed' || visit.status === 'completed') && (
                      <Button size="sm" variant="outline" onClick={() => handleDownloadPDF(visit.id)}
                        disabled={pdfLoading === visit.id}
                        className="h-8 px-2 text-navy border-navy/30 hover:bg-navy/5"
                        title="Descargar orden de visita en PDF">
                        {pdfLoading === visit.id
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <Download className="h-4 w-4" />
                        }
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => handleDelete(visit.id)} disabled={isLoading}
                      className="text-red-500 border-red-200 hover:bg-red-50 h-8 px-2">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Inline calendar for scheduling this visit */}
                {calendarOpen === visit.id && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-sm font-medium mb-2">Selecciona fecha y hora para confirmar:</p>
                    <div className="flex flex-col md:flex-row gap-4">
                      {/* Mini calendar */}
                      <div className="flex-1">
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
                            const today = new Date().toISOString().split('T')[0]
                            const cells = []
                            for (let i = 0; i < first; i++) cells.push(<div key={`e${i}`} />)
                            for (let d = 1; d <= days; d++) {
                              const ds = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
                              const past = ds < today
                              cells.push(
                                <button key={d} type="button" disabled={past}
                                  onClick={() => setCalDate(ds)}
                                  className={`text-xs py-1 rounded ${past ? 'text-gray-300' : 'hover:bg-blue-100'} ${calDate === ds ? 'bg-navy text-white font-bold' : ''} ${ds === today ? 'font-bold' : ''}`}
                                >{d}</button>
                              )
                            }
                            return cells
                          })()}
                        </div>
                      </div>
                      {/* Time slots */}
                      <div className="flex-1">
                        {calDate ? (
                          <>
                            <p className="text-xs text-muted-foreground mb-2">Horarios:</p>
                            <div className="grid grid-cols-4 gap-1 max-h-[160px] overflow-y-auto">
                              {Array.from({ length: 26 }, (_, i) => {
                                const h = Math.floor(i / 2) + 8
                                const m = i % 2 === 0 ? '00' : '30'
                                const t = `${String(h).padStart(2, '0')}:${m}`
                                return h < 21 ? (
                                  <button key={t} type="button" onClick={() => setCalTime(t)}
                                    className={`py-1 text-[11px] rounded border ${calTime === t ? 'bg-navy text-white border-navy' : 'hover:bg-blue-50 border-gray-200'}`}
                                  >{t}</button>
                                ) : null
                              })}
                            </div>
                          </>
                        ) : (
                          <p className="text-xs text-muted-foreground py-4 text-center">Selecciona un dia primero</p>
                        )}
                      </div>
                    </div>
                    {calDate && calTime && (
                      <div className="flex items-center justify-between mt-3 pt-2 border-t">
                        <p className="text-sm"><strong>{calDate}</strong> a las <strong>{calTime}</strong></p>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => setCalendarOpen(null)}>Cancelar</Button>
                          <Button size="sm" onClick={() => handleConfirmWithDate(visit.id)} disabled={loading === visit.id}
                            className="bg-green-600 hover:bg-green-700 text-white">
                            {loading === visit.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CheckCircle className="h-3 w-3 mr-1" />}
                            Confirmar Visita
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}

      </div>
        )
      })()}
    </div>
  )
}
