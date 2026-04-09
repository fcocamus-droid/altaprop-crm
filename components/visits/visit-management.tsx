'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/shared/empty-state'
import { formatDate } from '@/lib/utils'
import { updateVisitRequest, deleteVisitRequest, assignVisitAgent } from '@/lib/actions/visits'
import { generateVisitPDF } from '@/lib/generate-visit-pdf'
import { useRouter } from 'next/navigation'
import {
  CalendarDays, Clock, CheckCircle, XCircle, MapPin, User, Phone, Mail,
  FileText, Loader2, Trash2, CalendarCheck, ChevronLeft, ChevronRight, Building2, UserCheck, Download, MessageCircle
} from 'lucide-react'

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800' },
  confirmed: { label: 'Confirmada', color: 'bg-green-100 text-green-800' },
  rejected: { label: 'Rechazada', color: 'bg-red-100 text-red-800' },
  completed: { label: 'Completada', color: 'bg-blue-100 text-blue-800' },
  cancelled: { label: 'Cancelada', color: 'bg-gray-100 text-gray-800' },
}

const TIME_SLOTS = ['09:00','10:00','11:00','12:00','14:00','15:00','16:00','17:00','18:00']

interface Visit {
  id: string; status: string; preferred_date: string | null; preferred_time: string | null
  scheduled_date: string | null; scheduled_time: string | null; message: string | null
  admin_notes: string | null; created_at: string; property_id: string; assigned_agent_id: string | null; visit_number: number | null
  property?: { id: string; title: string; address: string; city: string }
  requester?: { id: string; full_name: string; phone: string; rut: string } | null
  prospect?: { id: string; full_name: string; email: string; phone: string; rut: string } | null
}

interface PropertyOption { id: string; title: string; city?: string }
interface AgentOption { id: string; full_name: string }

export function VisitManagement({ visits: initialVisits, properties = [], agents = [], userRole }: { visits: Visit[]; properties?: PropertyOption[]; agents?: AgentOption[]; userRole: string }) {
  const [visits, setVisits] = useState(initialVisits)
  const [updating, setUpdating] = useState<string | null>(null)
  const [scheduleForm, setScheduleForm] = useState<{ id: string; date: string; time: string } | null>(null)
  const [tab, setTab] = useState<'list' | 'calendar'>('list')
  const [calendarMonth, setCalendarMonth] = useState(new Date())
  const [selectedProperty, setSelectedProperty] = useState<string>('all')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const router = useRouter()
  const canManage = ['SUPERADMIN', 'AGENTE', 'PROPIETARIO'].includes(userRole)

  // Filter by property
  const filteredVisits = selectedProperty === 'all' ? visits : visits.filter(v => v.property_id === selectedProperty)
  const pending = filteredVisits.filter(v => v.status === 'pending')
  const confirmed = filteredVisits.filter(v => v.status === 'confirmed')

  // Count per property
  const visitCounts = new Map<string, number>()
  visits.forEach(v => { const pid = v.property_id; visitCounts.set(pid, (visitCounts.get(pid) || 0) + 1) })

  const selectedLabel = selectedProperty === 'all'
    ? `Todas las propiedades (${visits.length})`
    : properties.find(p => p.id === selectedProperty)?.title || 'Seleccionar'

  async function handleStatus(id: string, status: string, date?: string, time?: string) {
    setUpdating(id)
    const result = await updateVisitRequest(id, { status, scheduledDate: date, scheduledTime: time })
    if (!result.error) {
      setVisits(prev => prev.map(v => v.id === id ? { ...v, status, scheduled_date: date || v.scheduled_date, scheduled_time: time || v.scheduled_time } : v))
    }
    setUpdating(null)
    setScheduleForm(null)
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta solicitud?')) return
    setUpdating(id)
    await deleteVisitRequest(id)
    setVisits(prev => prev.filter(v => v.id !== id))
    setUpdating(null)
  }

  function downloadPDF(visit: Visit) {
    const contact = getContactInfo(visit)
    const agent = agents.find(a => a.id === visit.assigned_agent_id) || agents[0]
    const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://www.loginaltaprop.cl'

    const doc = generateVisitPDF({
      visitNumber: visit.visit_number || 0,
      property: {
        title: visit.property?.title || '',
        address: visit.property?.address || '',
        city: visit.property?.city || '',
        type: 'Departamento',
        operation: 'arriendo',
        id: visit.property_id,
      },
      visitor: {
        name: contact?.name || '',
        rut: contact?.rut || '',
        email: contact?.email || '',
        phone: contact?.phone || '',
      },
      agent: {
        name: agent?.full_name || 'Altaprop',
        phone: '',
        email: '',
      },
      scheduledDate: visit.scheduled_date || visit.preferred_date || '',
      scheduledTime: visit.scheduled_time || visit.preferred_time || '',
      message: visit.message || '',
      siteUrl,
    })

    doc.save(`orden-visita-${String(visit.visit_number || 0).padStart(4, '0')}.pdf`)
  }

  function openWhatsApp(visit: Visit) {
    const contact = getContactInfo(visit)
    if (!contact?.phone) { alert('El prospecto no tiene teléfono registrado'); return }

    const phone = contact.phone.replace(/[^0-9+]/g, '').replace(/^\+/, '')
    const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://www.loginaltaprop.cl'
    const msg = encodeURIComponent(
      `Hola ${contact.name}, le confirmamos su visita a la propiedad:\n\n` +
      `📍 ${visit.property?.title}\n` +
      `📅 Fecha: ${visit.scheduled_date || visit.preferred_date || 'Por confirmar'}\n` +
      `🕐 Hora: ${visit.scheduled_time || visit.preferred_time || 'Por confirmar'}\n\n` +
      `Orden de visita N° ${String(visit.visit_number || 0).padStart(4, '0')}\n\n` +
      `Ver propiedad: ${siteUrl}/propiedades/${visit.property_id}\n\n` +
      `Altaprop - Gestión Inmobiliaria`
    )
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank')
  }

  function getContactInfo(visit: Visit) {
    if (visit.prospect) return { name: visit.prospect.full_name, email: visit.prospect.email, phone: visit.prospect.phone, rut: visit.prospect.rut, type: 'Prospecto' }
    if (visit.requester) return { name: visit.requester.full_name, email: '', phone: visit.requester.phone, rut: visit.requester.rut, type: 'Usuario' }
    return null
  }

  // Calendar helpers
  function getDaysInMonth(date: Date) {
    const year = date.getFullYear(), month = date.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    return { firstDay, daysInMonth }
  }

  function getVisitsForDate(dateStr: string) {
    return visits.filter(v =>
      (v.scheduled_date === dateStr) ||
      (v.preferred_date === dateStr && v.status === 'pending')
    )
  }

  const { firstDay, daysInMonth } = getDaysInMonth(calendarMonth)
  const monthStr = calendarMonth.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold text-yellow-600">{pending.length}</p><p className="text-xs text-muted-foreground">Pendientes</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold text-green-600">{confirmed.length}</p><p className="text-xs text-muted-foreground">Confirmadas</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold text-blue-600">{visits.filter(v => v.status === 'completed').length}</p><p className="text-xs text-muted-foreground">Completadas</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold text-purple-600">{new Set(visits.filter(v => v.prospect).map(v => v.prospect?.id)).size}</p><p className="text-xs text-muted-foreground">Prospectos</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold text-navy">{visits.length}</p><p className="text-xs text-muted-foreground">Total</p></CardContent></Card>
      </div>

      {/* Property Selector */}
      {canManage && properties.length > 0 && (
        <div className="relative">
          <button onClick={() => setDropdownOpen(!dropdownOpen)} className="w-full flex items-center justify-between px-4 py-3 bg-white border rounded-lg shadow-sm hover:border-navy/40 transition-colors">
            <div className="flex items-center gap-2 min-w-0">
              <Building2 className="h-4 w-4 text-navy flex-shrink-0" />
              <span className="font-medium text-navy truncate">{selectedLabel}</span>
            </div>
            <ChevronRight className={`h-4 w-4 text-gray-400 transition-transform ${dropdownOpen ? 'rotate-90' : ''}`} />
          </button>
          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto">
                <button onClick={() => { setSelectedProperty('all'); setDropdownOpen(false) }}
                  className={`w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-gray-50 border-b ${selectedProperty === 'all' ? 'bg-navy/5 font-semibold text-navy' : 'text-gray-700'}`}>
                  <span>Todas las propiedades</span>
                  <span className="text-xs bg-gray-100 rounded-full px-2 py-0.5">{visits.length}</span>
                </button>
                {properties.map(prop => {
                  const count = visitCounts.get(prop.id) || 0
                  return (
                    <button key={prop.id} onClick={() => { setSelectedProperty(prop.id); setDropdownOpen(false) }}
                      className={`w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-gray-50 ${selectedProperty === prop.id ? 'bg-navy/5 font-semibold text-navy' : 'text-gray-700'}`}>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="truncate">{prop.title}</span>
                        {prop.city && <span className="text-xs text-muted-foreground">· {prop.city}</span>}
                      </div>
                      <span className={`text-xs rounded-full px-2 py-0.5 ${count > 0 ? 'bg-gold/10 text-gold font-medium' : 'bg-gray-100 text-gray-400'}`}>{count}</span>
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b">
        <button onClick={() => setTab('list')} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === 'list' ? 'border-navy text-navy' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          <FileText className="h-4 w-4" /> Solicitudes
        </button>
        <button onClick={() => setTab('calendar')} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === 'calendar' ? 'border-navy text-navy' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          <CalendarDays className="h-4 w-4" /> Calendario
        </button>
      </div>

      {/* Calendar View */}
      {tab === 'calendar' && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))} className="p-2 hover:bg-gray-100 rounded"><ChevronLeft className="h-4 w-4" /></button>
              <h3 className="font-semibold text-navy capitalize">{monthStr}</h3>
              <button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))} className="p-2 hover:bg-gray-100 rounded"><ChevronRight className="h-4 w-4" /></button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground mb-1">
              {['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'].map(d => <div key={d} className="py-1">{d}</div>)}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1
                const dateStr = `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                const dayVisits = getVisitsForDate(dateStr)
                const isToday = dateStr === new Date().toISOString().split('T')[0]
                const hasPending = dayVisits.some(v => v.status === 'pending')
                const hasConfirmed = dayVisits.some(v => v.scheduled_date === dateStr)

                return (
                  <div key={day} className={`relative p-1 min-h-[60px] border rounded text-xs ${isToday ? 'border-gold bg-gold/5' : 'border-gray-100'}`}>
                    <span className={`font-medium ${isToday ? 'text-gold' : ''}`}>{day}</span>
                    {hasPending && <div className="w-2 h-2 bg-yellow-400 rounded-full absolute top-1 right-1" />}
                    {hasConfirmed && <div className="w-2 h-2 bg-green-500 rounded-full absolute top-1 right-3" />}
                    {dayVisits.length > 0 && (
                      <div className="mt-1">
                        {dayVisits.slice(0, 2).map(v => {
                          const contact = getContactInfo(v)
                          return (
                            <div key={v.id} className={`text-[10px] truncate px-1 rounded mb-0.5 ${v.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
                              {v.scheduled_time || v.preferred_time || ''} {contact?.name?.split(' ')[0] || ''}
                            </div>
                          )
                        })}
                        {dayVisits.length > 2 && <div className="text-[10px] text-muted-foreground">+{dayVisits.length - 2} más</div>}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* List View */}
      {tab === 'list' && (
        filteredVisits.length === 0 ? (
          <EmptyState title="Sin solicitudes de visita" description="Las solicitudes aparecerán aquí cuando un prospecto solicite visitar una propiedad." />
        ) : (
          <div className="space-y-3">
            {[...pending, ...confirmed, ...filteredVisits.filter(v => !['pending','confirmed'].includes(v.status))].map(visit => {
              const st = STATUS_CONFIG[visit.status] || STATUS_CONFIG.pending
              const contact = getContactInfo(visit)
              const isUpdating = updating === visit.id

              return (
                <Card key={visit.id} className={`${isUpdating ? 'opacity-60' : ''} hover:shadow-sm transition-shadow`}>
                  <CardContent className="p-4">
                    <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Status + date */}
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                          {contact?.type === 'Prospecto' && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">Prospecto</span>}
                          <span className="text-xs text-muted-foreground">{formatDate(visit.created_at)}</span>
                        </div>

                        {/* Property */}
                        <h3 className="font-semibold text-navy truncate">{visit.property?.title}</h3>
                        {visit.property?.address && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> {visit.property.address}, {visit.property.city}</p>
                        )}

                        {/* Contact info */}
                        {contact && canManage && (
                          <div className="mt-2 p-2 bg-gray-50 rounded-lg text-xs space-y-0.5">
                            <p className="font-medium flex items-center gap-1"><User className="h-3 w-3" /> {contact.name}</p>
                            {contact.rut && <p className="flex items-center gap-1 text-muted-foreground"><FileText className="h-3 w-3" /> RUT: {contact.rut}</p>}
                            {contact.email && <p className="flex items-center gap-1 text-muted-foreground"><Mail className="h-3 w-3" /> {contact.email}</p>}
                            {contact.phone && <p className="flex items-center gap-1 text-muted-foreground"><Phone className="h-3 w-3" /> {contact.phone}</p>}
                          </div>
                        )}

                        {/* Dates */}
                        {visit.preferred_date && (
                          <p className="text-xs mt-2 flex items-center gap-1"><CalendarDays className="h-3 w-3 text-gold" /><span className="text-muted-foreground">Prefiere:</span> {visit.preferred_date} {visit.preferred_time && `a las ${visit.preferred_time}`}</p>
                        )}
                        {visit.scheduled_date && (
                          <p className="text-xs mt-1 flex items-center gap-1 font-medium text-green-700"><CalendarCheck className="h-3 w-3" /> Agendada: {visit.scheduled_date} a las {visit.scheduled_time}</p>
                        )}
                        {visit.message && <p className="text-xs mt-2 text-muted-foreground italic">&ldquo;{visit.message}&rdquo;</p>}
                      </div>

                      {/* Actions */}
                      {canManage && (
                        <div className="flex flex-col gap-2 flex-shrink-0 lg:w-44">
                          {agents.length > 0 && (
                            <select
                              value={visit.assigned_agent_id || ''}
                              onChange={async (e) => {
                                const agentId = e.target.value || null
                                setVisits(prev => prev.map(v => v.id === visit.id ? { ...v, assigned_agent_id: agentId } : v))
                                await assignVisitAgent(visit.id, agentId)
                              }}
                              className={`h-8 text-xs rounded-md border px-2 w-full ${visit.assigned_agent_id ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500'}`}
                            >
                              <option value="">Asignar agente</option>
                              {agents.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
                            </select>
                          )}
                          {visit.status === 'pending' && (
                            <>
                              <Button size="sm" className="w-full bg-green-600 hover:bg-green-700 text-xs" disabled={isUpdating}
                                onClick={() => setScheduleForm({ id: visit.id, date: visit.preferred_date || '', time: visit.preferred_time || '' })}>
                                <CalendarCheck className="mr-1 h-3 w-3" /> Confirmar
                              </Button>
                              <Button size="sm" variant="destructive" className="w-full text-xs" disabled={isUpdating}
                                onClick={() => handleStatus(visit.id, 'rejected')}>
                                <XCircle className="mr-1 h-3 w-3" /> Rechazar
                              </Button>
                            </>
                          )}
                          {visit.status === 'confirmed' && (
                            <>
                              <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700 text-xs" disabled={isUpdating}
                                onClick={() => handleStatus(visit.id, 'completed')}>
                                <CheckCircle className="mr-1 h-3 w-3" /> Completada
                              </Button>
                              <Button size="sm" variant="outline" className="w-full text-xs border-green-300 text-green-700 hover:bg-green-50"
                                onClick={() => openWhatsApp(visit)}>
                                <MessageCircle className="mr-1 h-3 w-3" /> WhatsApp
                              </Button>
                            </>
                          )}
                          {(visit.status === 'confirmed' || visit.status === 'completed') && (
                            <Button size="sm" variant="outline" className="w-full text-xs border-navy/30 text-navy hover:bg-navy/5"
                              onClick={() => downloadPDF(visit)}>
                              <Download className="mr-1 h-3 w-3" /> Descargar PDF
                            </Button>
                          )}
                          <Button size="sm" variant="outline" className="w-full text-xs text-red-500 border-red-200 hover:bg-red-50" disabled={isUpdating}
                            onClick={() => handleDelete(visit.id)}>
                            <Trash2 className="mr-1 h-3 w-3" /> Eliminar
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Schedule form */}
                    {scheduleForm?.id === visit.id && (
                      <div className="mt-3 pt-3 border-t flex flex-wrap items-end gap-2">
                        <div>
                          <label className="text-xs text-gray-500">Fecha</label>
                          <Input type="date" value={scheduleForm.date} onChange={e => setScheduleForm({ ...scheduleForm, date: e.target.value })} className="text-sm h-9 w-40" min={new Date().toISOString().split('T')[0]} />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Hora</label>
                          <select value={scheduleForm.time} onChange={e => setScheduleForm({ ...scheduleForm, time: e.target.value })} className="h-9 rounded-md border border-input bg-background px-3 text-sm w-28">
                            <option value="">Hora</option>
                            {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-xs h-9" disabled={!scheduleForm.date || !scheduleForm.time || isUpdating}
                          onClick={() => handleStatus(visit.id, 'confirmed', scheduleForm.date, scheduleForm.time)}>
                          {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Agendar'}
                        </Button>
                        <Button size="sm" variant="ghost" className="text-xs h-9" onClick={() => setScheduleForm(null)}>Cancelar</Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )
      )}
    </div>
  )
}
