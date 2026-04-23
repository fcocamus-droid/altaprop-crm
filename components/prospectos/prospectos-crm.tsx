'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { formatRut, validateRut, formatPhone, validatePhone } from '@/lib/validations/chilean-formats'
import { formatDate } from '@/lib/utils'
import { toChileDatetime, formatChileDateTimeDisplay } from '@/lib/utils/chile-datetime'

// datetime-local input ("2026-04-23T09:00") → timezone-aware ISO for Chile
function chileLocalToISO(dtLocal: string): string {
  if (!dtLocal) return ''
  const [date, time] = dtLocal.split('T')
  if (!date || !time) return dtLocal
  // datetime-local may omit seconds; toChileDatetime expects "HH:mm"
  return toChileDatetime(date, time.substring(0, 5))
}

// ISO back to "YYYY-MM-DDTHH:mm" in Chile TZ for datetime-local input default values
function isoToChileLocal(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(d)
  const get = (t: string) => parts.find(p => p.type === t)?.value || ''
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`
}

// Short local formatter using Chile TZ (ensures display matches input)
function fmtChile(iso: string | null | undefined): string {
  if (!iso) return ''
  return formatChileDateTimeDisplay(iso)
}
import {
  PROSPECTO_STATUSES, PROSPECTO_PRIORITIES, PROSPECTO_SOURCES,
  PROSPECTO_INTERESTS, PROSPECTO_PROPERTY_TYPES, ACTIVITY_TYPES,
  getStatusConfig, getPriorityConfig, getActivityTypeConfig,
} from '@/lib/prospectos-constants'
import {
  Search, UserPlus, Plus, Mail, Phone, Building, MapPin, Calendar,
  Clock, AlertCircle, Pin, PinOff, Loader2, X, Trash2, Send,
  CheckCircle, Circle, Star, MessageCircle, ChevronDown, ChevronRight,
  Filter, SortDesc, TrendingUp,
} from 'lucide-react'

interface Activity {
  id: string
  prospecto_id: string
  agent_id: string
  agent_name: string
  type: string
  content: string
  is_important: boolean
  is_completed: boolean
  due_at: string | null
  created_at: string
}

interface PropertySummary {
  id: string
  title: string
  address: string | null
  city: string | null
  operation: string
  price: number
  currency: string
  status: string
}

interface Prospecto {
  id: string
  subscriber_id: string | null
  agent_id: string | null
  agent_name: string
  subscriber_name: string
  full_name: string
  company: string | null
  rut: string | null
  email: string | null
  phone: string | null
  status: string
  priority: string
  source: string | null
  interest: string | null
  property_type: string | null
  budget_min: number | null
  budget_max: number | null
  budget_currency: string
  notes: string | null
  next_action_at: string | null
  next_action_note: string | null
  last_contact_at: string | null
  property_id: string | null
  property: PropertySummary | null
  is_pinned: boolean
  created_at: string
  open_tasks: number
  overdue_tasks: number
  last_activity_at: string | null
}

export function ProspectosCRM({ currentUserRole, subscribers, agents }: {
  currentUserRole: string
  subscribers?: { id: string; full_name: string }[]
  agents?: { id: string; full_name: string }[]
}) {
  const [prospectos, setProspectos] = useState<Prospecto[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [agentFilter, setAgentFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [viewFilter, setViewFilter] = useState<'all'|'open'|'overdue'|'mine'>('all')

  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState({
    full_name: '', company: '', rut: '', email: '', phone: '',
    status: 'nuevo', priority: 'media', source: '', interest: '', property_type: '',
    budget_min: '', budget_max: '', budget_currency: 'CLP',
    notes: '', next_action_at: '', next_action_note: '',
    agent_id: '', subscriber_id: '', property_id: '',
  })
  const [propertySearch, setPropertySearch] = useState('')
  const [availableProperties, setAvailableProperties] = useState<PropertySummary[]>([])
  const [propertiesLoaded, setPropertiesLoaded] = useState(false)
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState('')
  const [rutError, setRutError] = useState('')
  const [phoneError, setPhoneError] = useState('')

  const [updating, setUpdating] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)

  // Per-card activity state
  const [activities, setActivities] = useState<Record<string, Activity[]>>({})
  const [activitiesLoaded, setActivitiesLoaded] = useState<Record<string, boolean>>({})
  const [activityLoading, setActivityLoading] = useState<string | null>(null)
  const [newActivity, setNewActivity] = useState<Record<string, { content: string; type: string; is_important: boolean; due_at: string }>>({})
  const [activitySubmitting, setActivitySubmitting] = useState<string | null>(null)

  // Inline field editing
  const [editingNotes, setEditingNotes] = useState<string | null>(null)
  const [notesDraft, setNotesDraft] = useState('')

  // Load prospectos
  useEffect(() => {
    fetch('/api/prospectos')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setProspectos(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  // Lazy-load properties when user opens the Add form or expands a card for reassign
  async function ensurePropertiesLoaded() {
    if (propertiesLoaded) return
    try {
      const res = await fetch('/api/prospectos/properties')
      const data = await res.json()
      if (Array.isArray(data)) setAvailableProperties(data)
    } catch {}
    setPropertiesLoaded(true)
  }

  useEffect(() => {
    if (showAddForm) ensurePropertiesLoaded()

  }, [showAddForm])

  const filteredProperties = useMemo(() => {
    if (!propertySearch.trim()) return availableProperties.slice(0, 50)
    const q = propertySearch.toLowerCase()
    return availableProperties.filter(p =>
      (p.title || '').toLowerCase().includes(q) ||
      (p.address || '').toLowerCase().includes(q) ||
      (p.city || '').toLowerCase().includes(q)
    ).slice(0, 50)
  }, [availableProperties, propertySearch])

  function formatPrice(prop: PropertySummary) {
    if (prop.currency === 'UF') return `${prop.price} UF`
    return `$${(prop.price || 0).toLocaleString('es-CL')}`
  }

  async function loadActivities(prospectoId: string) {
    if (activitiesLoaded[prospectoId]) return
    setActivityLoading(prospectoId)
    const res = await fetch(`/api/prospectos/activities?prospectoId=${prospectoId}`)
    const data = await res.json()
    if (Array.isArray(data)) setActivities(prev => ({ ...prev, [prospectoId]: data }))
    setActivitiesLoaded(prev => ({ ...prev, [prospectoId]: true }))
    setActivityLoading(null)
  }

  async function handleAddProspecto(e: React.FormEvent) {
    e.preventDefault()
    setRutError(''); setPhoneError(''); setAddError('')

    if (addForm.rut && !validateRut(addForm.rut))    { setRutError('RUT inválido');  return }
    if (addForm.phone && !validatePhone(addForm.phone)) { setPhoneError('Teléfono inválido'); return }

    setAddLoading(true)
    const payload: any = {
      ...addForm,
      budget_min: addForm.budget_min ? Number(addForm.budget_min.replace(/\D/g, '')) : null,
      budget_max: addForm.budget_max ? Number(addForm.budget_max.replace(/\D/g, '')) : null,
      next_action_at: addForm.next_action_at ? chileLocalToISO(addForm.next_action_at) : null,
    }
    Object.keys(payload).forEach(k => { if (payload[k] === '') payload[k] = null })

    const res = await fetch('/api/prospectos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    if (data.error) {
      setAddError(data.error)
    } else if (data.prospecto) {
      // Enrich with property info locally if selected
      const linkedProp = addForm.property_id
        ? availableProperties.find(p => p.id === addForm.property_id) || null
        : null
      setProspectos(prev => [{ ...data.prospecto, property: linkedProp, open_tasks: 0, overdue_tasks: 0, last_activity_at: null }, ...prev])
      setShowAddForm(false)
      setPropertySearch('')
      setAddForm({
        full_name: '', company: '', rut: '', email: '', phone: '',
        status: 'nuevo', priority: 'media', source: '', interest: '', property_type: '',
        budget_min: '', budget_max: '', budget_currency: 'CLP',
        notes: '', next_action_at: '', next_action_note: '',
        agent_id: '', subscriber_id: '', property_id: '',
      })
    }
    setAddLoading(false)
  }

  async function updateProspecto(id: string, updates: Partial<Prospecto>) {
    setUpdating(id)
    const res = await fetch(`/api/prospectos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    const data = await res.json()
    if (data.prospecto) {
      setProspectos(prev => prev.map(p => p.id === id ? { ...p, ...data.prospecto } : p))
    }
    setUpdating(null)
  }

  async function togglePin(id: string, current: boolean) {
    await updateProspecto(id, { is_pinned: !current })
  }

  async function deleteProspecto(id: string) {
    setDeleteLoading(id)
    const res = await fetch(`/api/prospectos/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setProspectos(prev => prev.filter(p => p.id !== id))
      setDeletingId(null)
    }
    setDeleteLoading(null)
  }

  async function submitActivity(prospectoId: string) {
    const payload = newActivity[prospectoId]
    if (!payload?.content?.trim()) return
    setActivitySubmitting(prospectoId)

    const res = await fetch('/api/prospectos/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prospectoId,
        type: payload.type || 'nota',
        content: payload.content,
        is_important: payload.is_important,
        due_at: payload.due_at ? chileLocalToISO(payload.due_at) : null,
      }),
    })
    const data = await res.json()
    if (data.activity) {
      setActivities(prev => ({
        ...prev,
        [prospectoId]: [data.activity, ...(prev[prospectoId] || [])],
      }))
      setNewActivity(prev => ({ ...prev, [prospectoId]: { content: '', type: 'nota', is_important: false, due_at: '' } }))

      // Refresh prospecto counters
      if (payload.type === 'tarea') {
        setProspectos(prev => prev.map(p => p.id === prospectoId
          ? { ...p, open_tasks: (p.open_tasks || 0) + 1 }
          : p))
      }
    }
    setActivitySubmitting(null)
  }

  async function toggleActivity(activityId: string, prospectoId: string, field: 'is_important' | 'is_completed', value: boolean) {
    const res = await fetch('/api/prospectos/activities', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: activityId, [field]: value }),
    })
    const data = await res.json()
    if (data.activity) {
      setActivities(prev => ({
        ...prev,
        [prospectoId]: (prev[prospectoId] || []).map(a => a.id === activityId ? data.activity : a),
      }))
    }
  }

  async function deleteActivity(activityId: string, prospectoId: string) {
    const res = await fetch('/api/prospectos/activities', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: activityId }),
    })
    if (res.ok) {
      setActivities(prev => ({
        ...prev,
        [prospectoId]: (prev[prospectoId] || []).filter(a => a.id !== activityId),
      }))
    }
  }

  async function saveNotes(id: string) {
    await updateProspecto(id, { notes: notesDraft })
    setEditingNotes(null)
  }

  // Filtering
  const filtered = useMemo(() => {
    return prospectos.filter(p => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false
      if (priorityFilter !== 'all' && p.priority !== priorityFilter) return false
      if (agentFilter === 'unassigned' && p.agent_id) return false
      if (agentFilter !== 'all' && agentFilter !== 'unassigned' && p.agent_id !== agentFilter) return false
      if (sourceFilter !== 'all' && p.source !== sourceFilter) return false

      if (viewFilter === 'open' && ['ganado', 'perdido'].includes(p.status)) return false
      if (viewFilter === 'overdue' && (!p.overdue_tasks || p.overdue_tasks === 0)) return false

      if (search) {
        const q = search.toLowerCase()
        return (
          (p.full_name || '').toLowerCase().includes(q) ||
          (p.company || '').toLowerCase().includes(q) ||
          (p.rut || '').toLowerCase().includes(q) ||
          (p.email || '').toLowerCase().includes(q) ||
          (p.phone || '').toLowerCase().includes(q) ||
          (p.notes || '').toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [prospectos, statusFilter, priorityFilter, agentFilter, sourceFilter, viewFilter, search])

  // Counters per status
  const counters = useMemo(() => {
    const c: Record<string, number> = { all: prospectos.length, open: 0, overdue: 0 }
    for (const p of prospectos) {
      c[p.status] = (c[p.status] || 0) + 1
      if (!['ganado', 'perdido'].includes(p.status)) c.open++
      if (p.overdue_tasks && p.overdue_tasks > 0) c.overdue++
    }
    return c
  }, [prospectos])

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
  }

  const showAgentSelector = currentUserRole === 'SUPERADMIN' || currentUserRole === 'SUPERADMINBOSS'
  const showSubscriberSelector = currentUserRole === 'SUPERADMINBOSS' && subscribers && subscribers.length > 0

  return (
    <div className="space-y-4">
      {/* STATS CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className={`cursor-pointer transition-all ${viewFilter === 'all' ? 'ring-2 ring-navy' : 'hover:shadow-sm'}`}
          onClick={() => setViewFilter('all')}>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-navy">{counters.all}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer transition-all ${viewFilter === 'open' ? 'ring-2 ring-blue-500' : 'hover:shadow-sm'}`}
          onClick={() => setViewFilter('open')}>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-blue-600">{counters.open || 0}</p>
            <p className="text-xs text-muted-foreground">Activos</p>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer transition-all ${viewFilter === 'overdue' ? 'ring-2 ring-red-500' : 'hover:shadow-sm'}`}
          onClick={() => setViewFilter('overdue')}>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-red-600">{counters.overdue || 0}</p>
            <p className="text-xs text-muted-foreground">Con tareas vencidas</p>
          </CardContent>
        </Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-emerald-600">{counters.ganado || 0}</p>
          <p className="text-xs text-muted-foreground">Ganados</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-red-500">{counters.perdido || 0}</p>
          <p className="text-xs text-muted-foreground">Perdidos</p>
        </CardContent></Card>
      </div>

      {/* PIPELINE BAR */}
      <div className="flex gap-1 flex-wrap">
        <button onClick={() => setStatusFilter('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${statusFilter === 'all' ? 'bg-navy text-white border-navy' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>
          Todos ({counters.all})
        </button>
        {PROSPECTO_STATUSES.map(s => (
          <button key={s.value} onClick={() => setStatusFilter(s.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1.5 ${statusFilter === s.value ? s.color + ' ring-1 ring-offset-1' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
            {s.label} ({counters[s.value] || 0})
          </button>
        ))}
      </div>

      {/* ACTION BUTTONS */}
      <div className="flex gap-2 flex-wrap">
        <Button size="sm" onClick={() => setShowAddForm(!showAddForm)}
          className="bg-navy hover:bg-navy/90">
          {showAddForm ? <><X className="mr-1 h-3 w-3" />Cancelar</> : <><UserPlus className="mr-1 h-3 w-3" />Nuevo Prospecto</>}
        </Button>
      </div>

      {/* ADD FORM */}
      {showAddForm && (
        <Card className="border-2 border-navy/20">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-navy" /> Nuevo Prospecto
            </h3>
            <form onSubmit={handleAddProspecto} className="space-y-3">
              {addError && <p className="text-xs text-destructive bg-destructive/10 p-2 rounded">{addError}</p>}

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <div className="space-y-1 md:col-span-2">
                  <Label className="text-xs">Nombre Completo *</Label>
                  <Input value={addForm.full_name} onChange={e => setAddForm({ ...addForm, full_name: e.target.value })}
                    placeholder="Juan Pérez" required className="h-9 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Empresa</Label>
                  <Input value={addForm.company} onChange={e => setAddForm({ ...addForm, company: e.target.value })}
                    placeholder="Inversiones XYZ" className="h-9 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">RUT</Label>
                  <Input value={addForm.rut}
                    onChange={e => { setRutError(''); setAddForm({ ...addForm, rut: formatRut(e.target.value) }) }}
                    placeholder="12.345.678-9" className={`h-9 text-sm ${rutError ? 'border-red-500' : ''}`} />
                  {rutError && <p className="text-xs text-red-500">{rutError}</p>}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Email</Label>
                  <Input type="email" value={addForm.email} onChange={e => setAddForm({ ...addForm, email: e.target.value })}
                    placeholder="correo@email.com" className="h-9 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Teléfono</Label>
                  <Input value={addForm.phone}
                    onChange={e => { setPhoneError(''); setAddForm({ ...addForm, phone: formatPhone(e.target.value) }) }}
                    placeholder="+56 9 1234 5678" className={`h-9 text-sm ${phoneError ? 'border-red-500' : ''}`} />
                  {phoneError && <p className="text-xs text-red-500">{phoneError}</p>}
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Estado</Label>
                  <select value={addForm.status} onChange={e => setAddForm({ ...addForm, status: e.target.value })}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                    {PROSPECTO_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Prioridad</Label>
                  <select value={addForm.priority} onChange={e => setAddForm({ ...addForm, priority: e.target.value })}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                    {PROSPECTO_PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.icon} {p.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Origen</Label>
                  <select value={addForm.source} onChange={e => setAddForm({ ...addForm, source: e.target.value })}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                    <option value="">— Selecciona —</option>
                    {PROSPECTO_SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Interés</Label>
                  <select value={addForm.interest} onChange={e => setAddForm({ ...addForm, interest: e.target.value })}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                    <option value="">— Cualquiera —</option>
                    {PROSPECTO_INTERESTS.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Tipo de propiedad</Label>
                  <select value={addForm.property_type} onChange={e => setAddForm({ ...addForm, property_type: e.target.value })}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                    <option value="">— Cualquiera —</option>
                    {PROSPECTO_PROPERTY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Moneda presupuesto</Label>
                  <select value={addForm.budget_currency} onChange={e => setAddForm({ ...addForm, budget_currency: e.target.value })}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                    <option value="CLP">CLP</option>
                    <option value="UF">UF</option>
                    <option value="USD">USD</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Presupuesto mín.</Label>
                  <Input value={addForm.budget_min} onChange={e => setAddForm({ ...addForm, budget_min: e.target.value })}
                    placeholder="0" className="h-9 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Presupuesto máx.</Label>
                  <Input value={addForm.budget_max} onChange={e => setAddForm({ ...addForm, budget_max: e.target.value })}
                    placeholder="0" className="h-9 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Próxima acción (fecha)</Label>
                  <Input type="datetime-local" value={addForm.next_action_at}
                    onChange={e => setAddForm({ ...addForm, next_action_at: e.target.value })}
                    className="h-9 text-sm" />
                </div>

                <div className="space-y-1 md:col-span-3">
                  <Label className="text-xs">¿Qué hay que hacer?</Label>
                  <Input value={addForm.next_action_note}
                    onChange={e => setAddForm({ ...addForm, next_action_note: e.target.value })}
                    placeholder="Llamar para coordinar visita..." className="h-9 text-sm" />
                </div>

                {showAgentSelector && agents && agents.length > 0 && (
                  <div className="space-y-1">
                    <Label className="text-xs">Agente asignado</Label>
                    <select value={addForm.agent_id} onChange={e => setAddForm({ ...addForm, agent_id: e.target.value })}
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                      <option value="">— Sin asignar —</option>
                      {agents.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
                    </select>
                  </div>
                )}
                {showSubscriberSelector && (
                  <div className="space-y-1">
                    <Label className="text-xs">Organización</Label>
                    <select value={addForm.subscriber_id} onChange={e => setAddForm({ ...addForm, subscriber_id: e.target.value })}
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                      <option value="">— Sin asignar —</option>
                      {subscribers!.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                    </select>
                  </div>
                )}

                {/* PROPIEDAD QUE CONSULTA */}
                <div className="space-y-1 md:col-span-3">
                  <Label className="text-xs flex items-center gap-1">
                    <Building className="h-3 w-3" />
                    Propiedad consultada
                    <span className="text-muted-foreground font-normal">(la que despertó su interés)</span>
                  </Label>
                  {addForm.property_id ? (
                    (() => {
                      const sel = availableProperties.find(p => p.id === addForm.property_id)
                      return (
                        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-md p-2">
                          <Building className="h-4 w-4 text-blue-600 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{sel?.title || 'Propiedad'}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {sel?.city && <span>{sel.city}</span>}
                              {sel && <span className="font-medium text-navy">{formatPrice(sel)}</span>}
                              {sel?.operation && <span className="capitalize">· {sel.operation}</span>}
                            </div>
                          </div>
                          <Button type="button" size="sm" variant="ghost" className="h-7 text-xs"
                            onClick={() => { setAddForm({ ...addForm, property_id: '' }); setPropertySearch('') }}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      )
                    })()
                  ) : (
                    <div className="space-y-1.5">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input value={propertySearch}
                          onChange={e => setPropertySearch(e.target.value)}
                          placeholder="Buscar por título, dirección o ciudad..."
                          className="pl-9 h-9 text-sm" />
                      </div>
                      {!propertiesLoaded ? (
                        <p className="text-xs text-muted-foreground text-center py-2">
                          <Loader2 className="h-3 w-3 animate-spin inline mr-1" />Cargando propiedades...
                        </p>
                      ) : availableProperties.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-2">
                          No hay propiedades disponibles
                        </p>
                      ) : (
                        <div className="max-h-44 overflow-y-auto border rounded-md divide-y">
                          {filteredProperties.map(p => (
                            <button key={p.id} type="button"
                              onClick={() => { setAddForm({ ...addForm, property_id: p.id }); setPropertySearch('') }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors flex items-center gap-2">
                              <Building className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{p.title}</p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  {p.city && <span>{p.city}</span>}
                                  <span className="text-navy font-medium">{formatPrice(p)}</span>
                                  <span className="capitalize">· {p.operation}</span>
                                </div>
                              </div>
                            </button>
                          ))}
                          {filteredProperties.length === 0 && (
                            <p className="text-xs text-muted-foreground text-center py-2">Sin coincidencias</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-1 md:col-span-3">
                  <Label className="text-xs">Notas iniciales</Label>
                  <Textarea value={addForm.notes} onChange={e => setAddForm({ ...addForm, notes: e.target.value })}
                    placeholder="Información relevante del prospecto..." className="text-sm min-h-[60px]" />
                </div>
              </div>

              <Button type="submit" size="sm" disabled={addLoading} className="bg-navy hover:bg-navy/90">
                {addLoading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Plus className="mr-1 h-3 w-3" />}
                Crear Prospecto
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* SEARCH + FILTERS */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nombre, empresa, RUT, email, teléfono, notas..."
            value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>

        <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}
          className="h-9 px-3 text-sm border rounded-md bg-background shrink-0">
          <option value="all">Prioridad</option>
          {PROSPECTO_PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.icon} {p.label}</option>)}
        </select>

        <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}
          className="h-9 px-3 text-sm border rounded-md bg-background shrink-0">
          <option value="all">Origen</option>
          {PROSPECTO_SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>

        {agents && agents.length > 0 && (
          <select value={agentFilter} onChange={e => setAgentFilter(e.target.value)}
            className="h-9 px-3 text-sm border rounded-md bg-background shrink-0">
            <option value="all">Agente</option>
            <option value="unassigned">Sin asignar</option>
            {agents.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
          </select>
        )}

        <Badge variant="outline" className="shrink-0">{filtered.length}</Badge>
      </div>

      {/* PROSPECTOS LIST */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No hay prospectos</p>
          <p className="text-sm">Crea tu primer prospecto para empezar el seguimiento</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(p => {
            const st = getStatusConfig(p.status)
            const pr = getPriorityConfig(p.priority)
            const isExpanded = expanded === p.id
            const isClosed = ['ganado', 'perdido'].includes(p.status)
            const hasOverdue = (p.overdue_tasks || 0) > 0
            const initials = (p.full_name || '?').trim().charAt(0).toUpperCase()

            return (
              <Card key={p.id} className={`transition-all ${isExpanded ? 'ring-2 ring-navy/30 shadow-md' : 'hover:shadow-sm'}
                ${p.is_pinned ? 'border-l-4 border-l-amber-400' : ''}
                ${isClosed ? 'opacity-75' : ''}`}>
                <CardContent className="p-3">
                  {/* HEADER ROW — clickable to expand */}
                  <div className="flex items-start gap-3 cursor-pointer"
                    onClick={() => { setExpanded(isExpanded ? null : p.id); if (!isExpanded) loadActivities(p.id) }}>
                    {/* Avatar + priority indicator */}
                    <div className="relative shrink-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm
                        ${p.priority === 'alta' ? 'bg-red-100 text-red-700' :
                          p.priority === 'media' ? 'bg-amber-100 text-amber-700' :
                          'bg-gray-100 text-gray-600'}`}>
                        {initials}
                      </div>
                      {p.is_pinned && <Pin className="h-3 w-3 text-amber-500 fill-amber-500 absolute -top-1 -right-1" />}
                    </div>

                    {/* Contact details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold truncate">{p.full_name}</h3>
                        {p.company && <span className="text-xs text-muted-foreground flex items-center gap-0.5"><Building className="h-3 w-3" />{p.company}</span>}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                        {p.rut && <span>{p.rut}</span>}
                        {p.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{p.email}</span>}
                        {p.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{p.phone}</span>}
                      </div>
                      {p.next_action_at && !isClosed && (
                        <div className={`mt-1 text-xs flex items-center gap-1 ${new Date(p.next_action_at) < new Date() ? 'text-red-600 font-medium' : 'text-blue-600'}`}>
                          <Clock className="h-3 w-3" />
                          {new Date(p.next_action_at) < new Date() ? 'Vencido: ' : 'Próximo: '}
                          {fmtChile(p.next_action_at)}
                          {p.next_action_note && <span className="text-muted-foreground">· {p.next_action_note}</span>}
                        </div>
                      )}
                    </div>

                    {/* Badges */}
                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                      <Badge className={`text-xs ${st.color} border`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${st.dot} mr-1`} />
                        {st.label}
                      </Badge>
                      {p.priority === 'alta' && (
                        <Badge className="text-xs bg-red-100 text-red-800 border-red-300 border">
                          🔥 Alta
                        </Badge>
                      )}
                      {hasOverdue && (
                        <Badge className="text-xs bg-red-100 text-red-800 border-red-300 border">
                          <AlertCircle className="h-3 w-3 mr-0.5" />
                          {p.overdue_tasks}
                        </Badge>
                      )}
                      {p.open_tasks > 0 && !hasOverdue && (
                        <Badge variant="outline" className="text-xs">
                          <CheckCircle className="h-3 w-3 mr-0.5" />
                          {p.open_tasks}
                        </Badge>
                      )}
                      {p.agent_name && (
                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                          {p.agent_name}
                        </Badge>
                      )}
                      {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </div>

                  {/* EXPANDED CONTENT */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t space-y-3" onClick={e => e.stopPropagation()}>
                      {/* INLINE ACTION BAR */}
                      <div className="flex flex-wrap gap-2 items-center">
                        <select value={p.status} disabled={updating === p.id}
                          onChange={e => updateProspecto(p.id, { status: e.target.value })}
                          className={`h-8 text-xs rounded-md border px-2 ${st.color} border-current`}>
                          {PROSPECTO_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>

                        <select value={p.priority} disabled={updating === p.id}
                          onChange={e => updateProspecto(p.id, { priority: e.target.value })}
                          className={`h-8 text-xs rounded-md border px-2 ${pr.color} border-current`}>
                          {PROSPECTO_PRIORITIES.map(pp => <option key={pp.value} value={pp.value}>{pp.icon} {pp.label}</option>)}
                        </select>

                        {showAgentSelector && agents && agents.length > 0 && (
                          <select value={p.agent_id || ''} disabled={updating === p.id}
                            onChange={e => updateProspecto(p.id, { agent_id: e.target.value || null })}
                            className="h-8 text-xs rounded-md border px-2 border-blue-300 bg-blue-50 text-blue-700">
                            <option value="">Sin agente</option>
                            {agents.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
                          </select>
                        )}

                        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => togglePin(p.id, p.is_pinned)}>
                          {p.is_pinned ? <><PinOff className="h-3 w-3 mr-1" />Desanclar</> : <><Pin className="h-3 w-3 mr-1" />Fijar arriba</>}
                        </Button>

                        <div className="flex-1" />

                        {(currentUserRole === 'SUPERADMIN' || currentUserRole === 'SUPERADMINBOSS') && (
                          deletingId === p.id ? (
                            <div className="flex items-center gap-1 bg-red-50 px-2 py-1 rounded border border-red-200">
                              <span className="text-xs text-red-700">¿Eliminar?</span>
                              <Button size="sm" variant="destructive" className="h-6 text-xs"
                                disabled={deleteLoading === p.id}
                                onClick={() => deleteProspecto(p.id)}>
                                {deleteLoading === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Sí'}
                              </Button>
                              <Button size="sm" variant="ghost" className="h-6 text-xs"
                                onClick={() => setDeletingId(null)}>No</Button>
                            </div>
                          ) : (
                            <Button size="sm" variant="outline" className="h-8 text-xs text-red-500 border-red-200 hover:bg-red-50"
                              onClick={() => setDeletingId(p.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )
                        )}
                      </div>

                      {/* LINKED PROPERTY */}
                      {p.property ? (
                        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg p-2.5">
                          <Building className="h-4 w-4 text-blue-600 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-blue-700 font-semibold">Consulta por esta propiedad:</p>
                            <p className="text-sm font-medium truncate">{p.property.title}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {p.property.city && <span>{p.property.city}</span>}
                              <span className="font-medium text-navy">{formatPrice(p.property)}</span>
                              {p.property.operation && <span className="capitalize">· {p.property.operation}</span>}
                            </div>
                          </div>
                          <a href={`/dashboard/propiedades/${p.property.id}`} target="_blank"
                            className="text-xs text-blue-600 hover:underline shrink-0">Ver ficha</a>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                            title="Desvincular propiedad"
                            onClick={() => updateProspecto(p.id, { property_id: null } as any)}>
                            <X className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </div>
                      ) : (
                        <div className="bg-muted/30 rounded-lg p-2 border border-dashed">
                          <button type="button"
                            onClick={async () => {
                              await ensurePropertiesLoaded()
                              setExpanded(p.id)
                            }}
                            className="text-xs text-muted-foreground flex items-center gap-1 hover:text-navy transition-colors">
                            <Plus className="h-3 w-3" /> Vincular a una propiedad
                          </button>
                          {propertiesLoaded && availableProperties.length > 0 && (
                            <select
                              className="mt-1.5 h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                              onChange={e => { if (e.target.value) updateProspecto(p.id, { property_id: e.target.value } as any) }}
                              defaultValue="">
                              <option value="">— Selecciona una propiedad —</option>
                              {availableProperties.slice(0, 100).map(prop => (
                                <option key={prop.id} value={prop.id}>
                                  {prop.title} · {prop.city || ''} · {formatPrice(prop)}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      )}

                      {/* INFO GRID */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        {p.source && (
                          <div><p className="text-muted-foreground">Origen</p><p className="font-medium">{PROSPECTO_SOURCES.find(s => s.value === p.source)?.label || p.source}</p></div>
                        )}
                        {p.interest && (
                          <div><p className="text-muted-foreground">Interés</p><p className="font-medium">{PROSPECTO_INTERESTS.find(i => i.value === p.interest)?.label || p.interest}</p></div>
                        )}
                        {p.property_type && (
                          <div><p className="text-muted-foreground">Tipo</p><p className="font-medium capitalize">{PROSPECTO_PROPERTY_TYPES.find(t => t.value === p.property_type)?.label || p.property_type}</p></div>
                        )}
                        {(p.budget_min || p.budget_max) && (
                          <div>
                            <p className="text-muted-foreground">Presupuesto</p>
                            <p className="font-medium">
                              {p.budget_currency} {p.budget_min?.toLocaleString('es-CL') || '—'}{p.budget_max ? ` - ${p.budget_max.toLocaleString('es-CL')}` : ''}
                            </p>
                          </div>
                        )}
                        <div><p className="text-muted-foreground">Creado</p><p className="font-medium">{formatDate(p.created_at)}</p></div>
                        {p.last_contact_at && (
                          <div><p className="text-muted-foreground">Último contacto</p><p className="font-medium">{formatDate(p.last_contact_at)}</p></div>
                        )}
                        {p.subscriber_name && currentUserRole === 'SUPERADMINBOSS' && (
                          <div><p className="text-muted-foreground">Organización</p><p className="font-medium">{p.subscriber_name}</p></div>
                        )}
                      </div>

                      {/* NOTES */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs text-muted-foreground">Notas del prospecto</Label>
                          {editingNotes !== p.id && (
                            <Button size="sm" variant="ghost" className="h-6 text-xs"
                              onClick={() => { setEditingNotes(p.id); setNotesDraft(p.notes || '') }}>
                              Editar
                            </Button>
                          )}
                        </div>
                        {editingNotes === p.id ? (
                          <div className="space-y-2">
                            <Textarea value={notesDraft} onChange={e => setNotesDraft(e.target.value)}
                              className="text-sm min-h-[80px]" placeholder="Notas generales sobre el prospecto..." />
                            <div className="flex gap-2">
                              <Button size="sm" className="h-7 text-xs bg-navy hover:bg-navy/90"
                                onClick={() => saveNotes(p.id)}>Guardar</Button>
                              <Button size="sm" variant="ghost" className="h-7 text-xs"
                                onClick={() => setEditingNotes(null)}>Cancelar</Button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs bg-muted/50 rounded px-3 py-2 whitespace-pre-wrap min-h-[40px]">
                            {p.notes || <span className="text-muted-foreground italic">Sin notas</span>}
                          </p>
                        )}
                      </div>

                      {/* ACTIVITY LOG (BITÁCORA) */}
                      <div className="space-y-2 pt-2 border-t">
                        <div className="flex items-center gap-2">
                          <MessageCircle className="h-4 w-4 text-navy" />
                          <p className="text-sm font-medium">Bitácora de gestión</p>
                        </div>

                        {/* New activity input */}
                        <div className="space-y-2 bg-muted/30 p-2 rounded-lg">
                          <div className="flex gap-2 flex-wrap">
                            <select value={newActivity[p.id]?.type || 'nota'}
                              onChange={e => setNewActivity(prev => ({
                                ...prev,
                                [p.id]: { ...(prev[p.id] || { content: '', type: 'nota', is_important: false, due_at: '' }), type: e.target.value },
                              }))}
                              className="h-8 text-xs rounded-md border px-2">
                              {ACTIVITY_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                            </select>
                            {newActivity[p.id]?.type === 'tarea' && (
                              <Input type="datetime-local"
                                value={newActivity[p.id]?.due_at || ''}
                                onChange={e => setNewActivity(prev => ({
                                  ...prev,
                                  [p.id]: { ...(prev[p.id] || { content: '', type: 'tarea', is_important: false, due_at: '' }), due_at: e.target.value },
                                }))}
                                className="h-8 text-xs w-auto" />
                            )}
                            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                              <input type="checkbox" checked={newActivity[p.id]?.is_important || false}
                                onChange={e => setNewActivity(prev => ({
                                  ...prev,
                                  [p.id]: { ...(prev[p.id] || { content: '', type: 'nota', is_important: false, due_at: '' }), is_important: e.target.checked },
                                }))} />
                              <Star className="h-3 w-3" /> Importante
                            </label>
                          </div>
                          <div className="flex gap-2">
                            <Textarea placeholder="Registrar acción, nota o tarea... (Ctrl+Enter envía)"
                              value={newActivity[p.id]?.content || ''}
                              onChange={e => setNewActivity(prev => ({
                                ...prev,
                                [p.id]: { ...(prev[p.id] || { content: '', type: 'nota', is_important: false, due_at: '' }), content: e.target.value },
                              }))}
                              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submitActivity(p.id) }}
                              className="text-sm min-h-[60px] flex-1" maxLength={2000} />
                            <Button size="sm" className="shrink-0 bg-navy hover:bg-navy/90 h-auto"
                              onClick={() => submitActivity(p.id)}
                              disabled={!newActivity[p.id]?.content?.trim() || activitySubmitting === p.id}>
                              {activitySubmitting === p.id
                                ? <Loader2 className="h-3 w-3 animate-spin" />
                                : <Send className="h-3 w-3" />}
                            </Button>
                          </div>
                        </div>

                        {/* Activity feed */}
                        {activityLoading === p.id ? (
                          <div className="flex justify-center py-3">
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          </div>
                        ) : (activities[p.id] || []).length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-2">Sin registros aún</p>
                        ) : (
                          <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                            {(activities[p.id] || []).map(a => {
                              const t = getActivityTypeConfig(a.type)
                              const overdueTask = a.type === 'tarea' && !a.is_completed && a.due_at && new Date(a.due_at) < new Date()
                              return (
                                <div key={a.id}
                                  className={`rounded-lg px-3 py-2 text-xs space-y-1 border
                                    ${a.is_important ? 'bg-amber-50 border-amber-300' : 'bg-muted/40 border-transparent'}
                                    ${a.is_completed ? 'opacity-60' : ''}
                                    ${overdueTask ? 'ring-2 ring-red-300' : ''}`}>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <Badge className={`text-[10px] ${t.color} border-0`}>{t.icon} {t.label}</Badge>
                                    <span className="text-[10px] text-muted-foreground">{fmtChile(a.created_at)}</span>
                                    <span className="text-[10px] font-medium">{a.agent_name}</span>
                                    {a.due_at && (
                                      <Badge className={`text-[10px] ${overdueTask ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'} border-0`}>
                                        <Clock className="h-2.5 w-2.5 mr-0.5" />{fmtChile(a.due_at)}
                                      </Badge>
                                    )}
                                    <div className="flex-1" />
                                    <button onClick={() => toggleActivity(a.id, p.id, 'is_important', !a.is_important)}
                                      title={a.is_important ? 'Quitar importante' : 'Marcar importante'}>
                                      <Star className={`h-3 w-3 ${a.is_important ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground hover:text-amber-400'}`} />
                                    </button>
                                    {a.type === 'tarea' && (
                                      <button onClick={() => toggleActivity(a.id, p.id, 'is_completed', !a.is_completed)}
                                        title={a.is_completed ? 'Marcar pendiente' : 'Marcar completada'}>
                                        {a.is_completed
                                          ? <CheckCircle className="h-3 w-3 text-emerald-500" />
                                          : <Circle className="h-3 w-3 text-muted-foreground hover:text-emerald-500" />}
                                      </button>
                                    )}
                                    <button onClick={() => deleteActivity(a.id, p.id)} title="Eliminar">
                                      <Trash2 className="h-3 w-3 text-muted-foreground hover:text-red-500" />
                                    </button>
                                  </div>
                                  <p className="whitespace-pre-wrap">{a.content}</p>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
