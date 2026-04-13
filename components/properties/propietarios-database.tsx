'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import { Search, Home, Phone, Mail, MapPin, Loader2, UserCheck, Building2, ExternalLink, Image as ImageIcon, Plus, Send, UserPlus, Copy, CheckCircle, X, LinkIcon, Key, Trophy, AlertCircle, Unlink, Trash2 } from 'lucide-react'
import { finalizeProperty } from '@/lib/actions/properties'
import { PasswordInput } from '@/components/ui/password-input'
import { formatRut, validateRut, formatPhone, validatePhone } from '@/lib/validations/chilean-formats'
import Link from 'next/link'

interface PropProperty {
  id: string
  title: string
  address: string | null
  city: string | null
  sector: string | null
  status: string
  operation: string
  price: number
  currency: string
  owner_id?: string
  owner_name?: string
  approved_applicant_name?: string | null
  images?: { url: string }[]
}

interface Propietario {
  id: string
  full_name: string | null
  email: string
  phone: string | null
  rut: string | null
  subscriber_id: string | null
  subscriber_name: string
  property_address: string
  property_city: string
  property_sector: string
  property_type: string
  property_operation: string
  created_at: string
  agent_id: string | null
  agent_name: string
  properties: PropProperty[]
}

const STATUS_COLORS: Record<string, string> = {
  available: 'bg-green-100 text-green-800',
  unavailable: 'bg-gray-100 text-gray-800',
  reserved: 'bg-yellow-100 text-yellow-800',
  rented: 'bg-blue-100 text-blue-800',
  sold: 'bg-purple-100 text-purple-800',
}
const STATUS_LABELS: Record<string, string> = {
  available: 'Disponible',
  unavailable: 'No Disponible',
  reserved: 'Reservada',
  rented: 'Arrendada',
  sold: 'Vendida',
}

export function PropietariosDatabase({ currentUserRole, subscribers, agents }: {
  currentUserRole: string
  subscribers?: { id: string; full_name: string }[]
  agents?: { id: string; full_name: string }[]
}) {
  const [propietarios, setPropietarios] = useState<Propietario[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [assigning, setAssigning] = useState<string | null>(null)
  const [orgProperties, setOrgProperties] = useState<PropProperty[]>([])
  const [orgPropsLoaded, setOrgPropsLoaded] = useState(false)
  const [assigningProperty, setAssigningProperty] = useState<string | null>(null)
  const [selectedProperty, setSelectedProperty] = useState<Record<string, string>>({})
  const [showAddForm, setShowAddForm] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteResult, setInviteResult] = useState<{ success?: boolean; url?: string; error?: string } | null>(null)
  const [addForm, setAddForm] = useState({ full_name: '', email: '', password: '', rut: '', phone: '' })
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState('')
  const [rutError, setRutError] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [assigningAgent, setAssigningAgent] = useState<string | null>(null)
  const [statusTab, setStatusTab] = useState('all')
  const [filterAgent, setFilterAgent] = useState('all')
  const [finalizingProp, setFinalizingProp] = useState<string | null>(null) // prop id showing confirm panel
  const [finalizeLoading, setFinalizeLoading] = useState<string | null>(null)
  const [removingProp, setRemovingProp] = useState<string | null>(null)        // prop id showing remove confirm
  const [removeLoading, setRemoveLoading] = useState<string | null>(null)      // prop id being removed
  const [deletingPropietario, setDeletingPropietario] = useState<string | null>(null) // propietario id showing delete confirm
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)      // propietario id being deleted
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/propietarios')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setPropietarios(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function handleAssign(propietarioId: string, subscriberId: string) {
    setAssigning(propietarioId)
    const res = await fetch('/api/propietarios/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ propietarioId, subscriberId: subscriberId || null }),
    })
    if (res.ok) {
      const sub = subscribers?.find(s => s.id === subscriberId)
      setPropietarios(prev => prev.map(p =>
        p.id === propietarioId ? { ...p, subscriber_id: subscriberId || null, subscriber_name: sub?.full_name || '' } : p
      ))
    }
    setAssigning(null)
  }

  async function handleAssignAgent(propietarioId: string, agentId: string) {
    setAssigningAgent(propietarioId)
    const res = await fetch('/api/propietarios/assign-agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ propietarioId, agentId: agentId || null }),
    })
    if (res.ok) {
      const agent = agents?.find(a => a.id === agentId)
      setPropietarios(prev => prev.map(p =>
        p.id === propietarioId ? { ...p, agent_id: agentId || null, agent_name: agent?.full_name || '' } : p
      ))
    }
    setAssigningAgent(null)
  }

  async function handleFinalizeProperty(propietarioId: string, propertyId: string, newStatus: 'rented' | 'sold') {
    setFinalizeLoading(propertyId)
    const result = await finalizeProperty(propertyId, newStatus)
    if (!result.error) {
      // Update local state
      setPropietarios(prev => prev.map(p =>
        p.id === propietarioId
          ? { ...p, properties: p.properties.map(prop => prop.id === propertyId ? { ...prop, status: newStatus } : prop) }
          : p
      ))
      setFinalizingProp(null)
    }
    setFinalizeLoading(null)
  }

  async function loadOrgProperties() {
    if (orgPropsLoaded) return
    const res = await fetch('/api/propietarios/org-properties')
    const data = await res.json()
    if (Array.isArray(data)) setOrgProperties(data)
    setOrgPropsLoaded(true)
  }

  async function handleAssignProperty(propietarioId: string) {
    const propertyId = selectedProperty[propietarioId]
    if (!propertyId) return
    setAssigningProperty(propietarioId)
    const res = await fetch('/api/propietarios/assign-property', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ propietarioId, propertyId }),
    })
    const data = await res.json()
    if (data.success) {
      const prop = orgProperties.find(p => p.id === propertyId)
      if (prop) {
        // Add property to propietario's list in local state
        setPropietarios(prev => prev.map(p =>
          p.id === propietarioId
            ? { ...p, properties: [...p.properties, { ...prop, owner_id: propietarioId }] }
            : p
        ))
        // Remove from org pool (it now belongs to this propietario)
        setOrgProperties(prev => prev.map(p => p.id === propertyId ? { ...p, owner_id: propietarioId } : p))
      }
      setSelectedProperty(prev => ({ ...prev, [propietarioId]: '' }))
    }
    setAssigningProperty(null)
  }

  async function handleInvite() {
    if (!inviteEmail) return
    setInviteLoading(true)
    setInviteResult(null)
    const res = await fetch('/api/propietarios/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail }),
    })
    const data = await res.json()
    setInviteResult(data)
    setInviteLoading(false)
    if (data.success) setInviteEmail('')
  }

  async function handleAddPropietario(e: React.FormEvent) {
    e.preventDefault()
    setRutError('')
    setPhoneError('')
    // Validate RUT if provided
    if (addForm.rut && !validateRut(addForm.rut)) {
      setRutError('RUT inválido')
      return
    }
    // Validate phone if provided
    if (addForm.phone && !validatePhone(addForm.phone)) {
      setPhoneError('Teléfono inválido. Formato: +56 9 XXXX XXXX')
      return
    }
    setAddLoading(true)
    setAddError('')
    const res = await fetch('/api/propietarios/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(addForm),
    })
    const data = await res.json()
    if (data.error) {
      setAddError(data.error)
    } else {
      setShowAddForm(false)
      setAddForm({ full_name: '', email: '', password: '', rut: '', phone: '' })
      // Reload
      const r = await fetch('/api/propietarios')
      const newData = await r.json()
      if (Array.isArray(newData)) setPropietarios(newData)
    }
    setAddLoading(false)
  }

  async function handleDeletePropietario(propietarioId: string) {
    setDeleteLoading(propietarioId)
    setDeleteError(null)
    const res = await fetch('/api/propietarios/delete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ propietarioId }),
    })
    const data = await res.json()
    if (data.success) {
      setPropietarios(prev => prev.filter(p => p.id !== propietarioId))
      setDeletingPropietario(null)
    } else {
      setDeleteError(data.error || 'Error al eliminar')
    }
    setDeleteLoading(null)
  }

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
  }

  const countFree = propietarios.filter(p => !p.subscriber_id).length
  const countAssigned = propietarios.filter(p => p.subscriber_id && !p.agent_id).length
  const countWithAgent = propietarios.filter(p => p.agent_id).length

  const stages = [
    { key: 'all', label: 'Todos', count: propietarios.length, color: 'text-navy', bgActive: 'bg-navy text-white border-navy' },
    ...(currentUserRole === 'SUPERADMINBOSS' ? [{ key: 'free', label: 'Publica Gratis', count: countFree, color: 'text-yellow-600', bgActive: 'bg-yellow-100 text-yellow-800 border-yellow-300' }] : []),
    { key: 'assigned', label: 'Sin Agente', count: countAssigned, color: 'text-amber-600', bgActive: 'bg-amber-100 text-amber-800 border-amber-300' },
    { key: 'with_agent', label: 'Con Agente', count: countWithAgent, color: 'text-green-600', bgActive: 'bg-green-100 text-green-800 border-green-300' },
  ]

  const filtered = propietarios.filter(p => {
    // Status filter
    if (statusTab === 'free' && p.subscriber_id) return false
    if (statusTab === 'assigned' && (!p.subscriber_id || p.agent_id)) return false
    if (statusTab === 'with_agent' && !p.agent_id) return false

    // Agent filter
    if (filterAgent !== 'all') {
      if (filterAgent === 'none' && p.agent_id) return false
      if (filterAgent !== 'none' && p.agent_id !== filterAgent) return false
    }

    // Search filter
    if (search) {
      const q = search.toLowerCase()
      return (
        (p.full_name || '').toLowerCase().includes(q) ||
        (p.email || '').toLowerCase().includes(q) ||
        (p.rut || '').toLowerCase().includes(q) ||
        (p.phone || '').toLowerCase().includes(q) ||
        (p.property_address || '').toLowerCase().includes(q) ||
        (p.property_city || '').toLowerCase().includes(q)
      )
    }
    return true
  })

  return (
    <div className="space-y-4">
      {/* STAGE TABS */}
      <div className="flex gap-2 flex-wrap">
        {stages.map(stage => (
          <button
            key={stage.key}
            onClick={() => setStatusTab(stage.key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
              statusTab === stage.key
                ? stage.bgActive
                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
            }`}
          >
            {stage.label}
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${statusTab === stage.key ? 'bg-white/50' : 'bg-muted'}`}>{stage.count}</span>
          </button>
        ))}
      </div>

      {/* ACTION BUTTONS */}
      {(currentUserRole === 'SUPERADMIN' || currentUserRole === 'SUPERADMINBOSS' || currentUserRole === 'AGENTE') && (
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" onClick={() => { setShowAddForm(!showAddForm); setShowInvite(false) }}
            className={showAddForm ? 'bg-navy' : 'bg-navy hover:bg-navy/90'}>
            {showAddForm ? <><X className="mr-1 h-3 w-3" />Cancelar</> : <><UserPlus className="mr-1 h-3 w-3" />Agregar Propietario</>}
          </Button>
          <Button size="sm" variant="outline" onClick={() => { setShowInvite(!showInvite); setShowAddForm(false) }}>
            {showInvite ? <><X className="mr-1 h-3 w-3" />Cancelar</> : <><Send className="mr-1 h-3 w-3" />Enviar Invitación</>}
          </Button>
        </div>
      )}

      {/* ADD FORM */}
      {showAddForm && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3">Nuevo Propietario</h3>
            <form onSubmit={handleAddPropietario} className="space-y-3">
              {addError && <p className="text-xs text-destructive bg-destructive/10 p-2 rounded">{addError}</p>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Nombre Completo *</Label>
                  <Input value={addForm.full_name} onChange={e => setAddForm({ ...addForm, full_name: e.target.value })} placeholder="Juan Pérez" required className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">RUT</Label>
                  <Input
                    value={addForm.rut}
                    onChange={e => { setRutError(''); setAddForm({ ...addForm, rut: formatRut(e.target.value) }) }}
                    placeholder="12.345.678-9"
                    className={`h-8 text-sm ${rutError ? 'border-red-500' : ''}`}
                  />
                  {rutError && <p className="text-xs text-red-500">{rutError}</p>}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Email *</Label>
                  <Input type="email" value={addForm.email} onChange={e => setAddForm({ ...addForm, email: e.target.value })} placeholder="correo@email.com" required className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Teléfono</Label>
                  <Input
                    value={addForm.phone}
                    onChange={e => { setPhoneError(''); setAddForm({ ...addForm, phone: formatPhone(e.target.value) }) }}
                    placeholder="+56 9 1234 5678"
                    className={`h-8 text-sm ${phoneError ? 'border-red-500' : ''}`}
                  />
                  {phoneError && <p className="text-xs text-red-500">{phoneError}</p>}
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs">Contraseña *</Label>
                  <PasswordInput value={addForm.password} onChange={e => setAddForm({ ...addForm, password: e.target.value })} placeholder="Mínimo 6 caracteres" required minLength={6} className="h-8 text-sm" />
                </div>
              </div>
              <Button type="submit" size="sm" disabled={addLoading} className="bg-navy hover:bg-navy/90">
                {addLoading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Plus className="mr-1 h-3 w-3" />}
                Crear Propietario
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* INVITE FORM */}
      {showInvite && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3">Enviar Invitación por Email</h3>
            <div className="flex gap-2">
              <Input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="correo@propietario.cl"
                className="h-9"
              />
              <Button onClick={handleInvite} disabled={inviteLoading || !inviteEmail} size="sm" className="shrink-0">
                {inviteLoading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Send className="mr-1 h-3 w-3" />}
                Enviar
              </Button>
            </div>
            {inviteResult && inviteResult.success && inviteResult.url && (
              <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-xs text-green-700 flex items-center gap-1 mb-2"><CheckCircle className="h-3 w-3" /> Invitación enviada</p>
                <div className="flex gap-2">
                  <input readOnly value={inviteResult.url} className="flex-1 text-xs bg-white border rounded px-2 py-1 text-muted-foreground" />
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { navigator.clipboard.writeText(inviteResult.url!); }}>
                    <Copy className="h-3 w-3 mr-1" />Copiar
                  </Button>
                </div>
              </div>
            )}
            {inviteResult && inviteResult.error && (
              <p className="mt-2 text-xs text-destructive">{inviteResult.error}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* SEARCH + AGENT FILTER */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nombre, RUT, email, dirección..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        {agents && agents.length > 0 && (
          <select value={filterAgent} onChange={e => setFilterAgent(e.target.value)}
            className="h-9 px-3 text-sm border rounded-lg bg-background shrink-0">
            <option value="all">Agente</option>
            <option value="none">Sin agente</option>
            {agents.map(a => (
              <option key={a.id} value={a.id}>{a.full_name}</option>
            ))}
          </select>
        )}
        <Badge variant="outline" className="shrink-0">{filtered.length} propietario{filtered.length !== 1 ? 's' : ''}</Badge>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Home className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p className="font-medium">No se encontraron propietarios</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(p => {
            const isExpanded = expanded === p.id
            return (
              <Card key={p.id} className={`transition-all cursor-pointer ${isExpanded ? 'ring-2 ring-gold/30' : 'hover:shadow-md'}`}
                onClick={() => { setExpanded(isExpanded ? null : p.id); if (!isExpanded) loadOrgProperties() }}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${isExpanded ? 'bg-gold text-navy' : 'bg-gold/20 text-navy'}`}>
                        {p.full_name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold truncate">{p.full_name || 'Sin nombre'}</h3>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                          {p.rut && <span>{p.rut}</span>}
                          <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{p.email}</span>
                          {p.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{p.phone}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {p.properties.length > 0 && (
                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                          <Home className="h-3 w-3 mr-1" />{p.properties.length} prop.
                        </Badge>
                      )}
                      {p.property_city && (
                        <Badge variant="outline" className="text-xs"><MapPin className="h-3 w-3 mr-1" />{p.property_city}</Badge>
                      )}
                      {p.agent_name && (
                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                          <UserCheck className="h-3 w-3 mr-1" />{p.agent_name}
                        </Badge>
                      )}
                      {p.subscriber_id ? (
                        <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">Asignado</Badge>
                      ) : (
                        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 text-xs">Sin asignar</Badge>
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pt-3 border-t space-y-3" onClick={e => e.stopPropagation()}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                        {p.property_address && (
                          <div><p className="text-xs text-muted-foreground">Dirección</p><p className="font-medium">{p.property_address}</p></div>
                        )}
                        {p.property_city && (
                          <div><p className="text-xs text-muted-foreground">Ciudad</p><p className="font-medium">{p.property_city}</p></div>
                        )}
                        {p.property_sector && (
                          <div><p className="text-xs text-muted-foreground">Comuna</p><p className="font-medium">{p.property_sector}</p></div>
                        )}
                        {p.property_type && (
                          <div><p className="text-xs text-muted-foreground">Tipo</p><p className="font-medium capitalize">{p.property_type}</p></div>
                        )}
                        {p.property_operation && (
                          <div><p className="text-xs text-muted-foreground">Operación</p><p className="font-medium capitalize">{p.property_operation}</p></div>
                        )}
                        <div><p className="text-xs text-muted-foreground">Registrado</p><p className="font-medium">{formatDate(p.created_at)}</p></div>
                      </div>

                      {/* PROPERTIES LIST */}
                      {p.properties.length > 0 && (
                        <div className="pt-2 border-t">
                          <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                            <Home className="h-3 w-3" /> PROPIEDADES PUBLICADAS ({p.properties.length})
                          </p>
                          <div className="space-y-2">
                            {p.properties.map(prop => (
                              <div key={prop.id} className="bg-muted/50 rounded-lg overflow-hidden">
                                {/* Property row */}
                                <div className="flex items-center gap-3 p-2.5">
                                  {prop.images?.[0]?.url ? (
                                    <img src={prop.images[0].url} alt="" className="w-14 h-14 rounded-md object-cover shrink-0" />
                                  ) : (
                                    <div className="w-14 h-14 rounded-md bg-muted flex items-center justify-center shrink-0">
                                      <ImageIcon className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{prop.title}</p>
                                    <p className="text-xs text-muted-foreground">{prop.city}{prop.sector ? `, ${prop.sector}` : ''}</p>
                                    <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                      <span className="text-xs font-semibold text-navy">
                                        {prop.currency === 'UF' ? `${prop.price} UF` : `$${prop.price?.toLocaleString('es-CL')}`}
                                      </span>
                                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${STATUS_COLORS[prop.status] || 'bg-gray-100 text-gray-800'}`}>
                                        {STATUS_LABELS[prop.status] || prop.status}
                                      </span>
                                      <span className="text-[10px] text-muted-foreground capitalize">{prop.operation}</span>
                                      {prop.approved_applicant_name && ['reserved', 'rented', 'sold'].includes(prop.status) && (
                                        <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                                          prop.status === 'reserved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                          prop.status === 'rented'   ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                          'bg-violet-50 text-violet-700 border-violet-200'
                                        }`}>
                                          {prop.status === 'rented' ? <Key className="h-3 w-3" /> : prop.status === 'sold' ? <Trophy className="h-3 w-3" /> : <UserCheck className="h-3 w-3" />}
                                          {prop.approved_applicant_name}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <Link href={`/propiedades/${prop.id}`} target="_blank">
                                      <Button variant="outline" size="sm" className="h-7 text-xs">
                                        <ExternalLink className="h-3 w-3 mr-1" />Ver
                                      </Button>
                                    </Link>
                                    <Link href={`/dashboard/propiedades/${prop.id}`}>
                                      <Button variant="outline" size="sm" className="h-7 text-xs">
                                        Editar
                                      </Button>
                                    </Link>
                                    {/* REMOVE FROM PROPIETARIO BUTTON */}
                                    {(currentUserRole === 'SUPERADMIN' || currentUserRole === 'SUPERADMINBOSS' || currentUserRole === 'AGENTE') && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className={`h-7 text-xs gap-1 ${removingProp === prop.id ? 'border-red-400 text-red-600 bg-red-50' : 'border-red-200 text-red-400 hover:border-red-400 hover:text-red-600 hover:bg-red-50'}`}
                                        onClick={() => setRemovingProp(removingProp === prop.id ? null : prop.id)}
                                        title="Quitar del propietario"
                                      >
                                        <Unlink className="h-3 w-3" />
                                      </Button>
                                    )}
                                    {/* FINALIZE BUTTON */}
                                    {prop.status === 'reserved' && (currentUserRole === 'SUPERADMIN' || currentUserRole === 'SUPERADMINBOSS' || currentUserRole === 'AGENTE') && (
                                      <Button
                                        size="sm"
                                        className={`h-7 text-xs gap-1 ${finalizingProp === prop.id ? 'bg-navy/80 text-white' : 'bg-navy text-gold hover:bg-navy/90'}`}
                                        onClick={() => setFinalizingProp(finalizingProp === prop.id ? null : prop.id)}
                                      >
                                        Finalizar
                                      </Button>
                                    )}
                                  </div>
                                </div>

                                {/* FINALIZE CONFIRMATION PANEL */}
                                {finalizingProp === prop.id && (
                                <div className="mt-2 rounded-xl border-2 border-navy/20 bg-navy/5 p-4 space-y-3">
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <p className="font-semibold text-navy text-sm flex items-center gap-1.5">
                                        <AlertCircle className="h-4 w-4" />
                                        Confirmar cierre de propiedad
                                      </p>
                                      <p className="text-xs text-muted-foreground mt-0.5">
                                        Se enviará email de confirmación al postulante y al propietario.
                                      </p>
                                    </div>
                                    <button onClick={() => setFinalizingProp(null)} className="text-muted-foreground hover:text-foreground">
                                      <X className="h-4 w-4" />
                                    </button>
                                  </div>

                                  {prop.approved_applicant_name && (
                                    <div className="flex items-center gap-2 text-xs bg-white rounded-lg border px-3 py-2">
                                      <UserCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                      <span className="text-muted-foreground">Postulante aprobado:</span>
                                      <span className="font-semibold text-navy">{prop.approved_applicant_name}</span>
                                    </div>
                                  )}

                                  <div className="flex gap-2">
                                    {/* Arriendo button — primary if operation is arriendo */}
                                    <Button
                                      size="sm"
                                      disabled={!!finalizeLoading}
                                      onClick={() => handleFinalizeProperty(p.id, prop.id, 'rented')}
                                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white gap-1.5 text-xs"
                                    >
                                      {finalizeLoading === prop.id ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <Key className="h-3.5 w-3.5" />
                                      )}
                                      Confirmar Arriendo
                                    </Button>
                                    {/* Venta button — primary if operation is venta */}
                                    <Button
                                      size="sm"
                                      disabled={!!finalizeLoading}
                                      onClick={() => handleFinalizeProperty(p.id, prop.id, 'sold')}
                                      className="flex-1 bg-purple-600 hover:bg-purple-700 text-white gap-1.5 text-xs"
                                    >
                                      {finalizeLoading === prop.id ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <Trophy className="h-3.5 w-3.5" />
                                      )}
                                      Confirmar Venta
                                    </Button>
                                  </div>
                                  <p className="text-[10px] text-muted-foreground text-center">
                                    El estado de la propiedad cambiará a <strong>Arrendada</strong> o <strong>Vendida</strong> según corresponda.
                                  </p>
                                </div>
                              )}

                                {/* REMOVE FROM PROPIETARIO CONFIRMATION PANEL */}
                                {removingProp === prop.id && (
                                  <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4 space-y-3 mt-2">
                                    <div className="flex items-start justify-between">
                                      <div>
                                        <p className="font-semibold text-red-900 text-sm flex items-center gap-1.5">
                                          <Unlink className="h-4 w-4" />
                                          Quitar propiedad del módulo
                                        </p>
                                        <p className="text-xs text-red-700 mt-0.5">
                                          La propiedad <strong>{prop.title}</strong> se desvinculará de <strong>{p.full_name}</strong>. La propiedad seguirá existiendo en el sistema.
                                        </p>
                                      </div>
                                      <button onClick={() => setRemovingProp(null)} className="text-red-400 hover:text-red-600 ml-2">
                                        <X className="h-4 w-4" />
                                      </button>
                                    </div>
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        disabled={removeLoading === prop.id}
                                        className="bg-red-600 hover:bg-red-700 text-white gap-1.5 text-xs"
                                        onClick={async () => {
                                          setRemoveLoading(prop.id)
                                          const res = await fetch('/api/propietarios/unassign-property', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ propertyId: prop.id }),
                                          })
                                          if (res.ok) {
                                            setPropietarios(prev => prev.map(pr =>
                                              pr.id === p.id
                                                ? { ...pr, properties: pr.properties.filter(pp => pp.id !== prop.id) }
                                                : pr
                                            ))
                                            setRemovingProp(null)
                                          }
                                          setRemoveLoading(null)
                                        }}
                                      >
                                        {removeLoading === prop.id
                                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                          : <Unlink className="h-3.5 w-3.5" />}
                                        Confirmar desvinculación
                                      </Button>
                                      <Button size="sm" variant="outline" disabled={removeLoading === prop.id}
                                        onClick={() => setRemovingProp(null)}>
                                        Cancelar
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {p.properties.length === 0 && (
                        <div className="pt-2 border-t space-y-3">
                          <p className="text-xs text-muted-foreground text-center py-1">Este propietario aún no ha publicado propiedades</p>

                          {/* DELETE PROPIETARIO — only when no properties */}
                          {(currentUserRole === 'SUPERADMIN' || currentUserRole === 'SUPERADMINBOSS' || currentUserRole === 'AGENTE') && (
                            deletingPropietario === p.id ? (
                              <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4 space-y-3">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <p className="font-semibold text-red-900 text-sm flex items-center gap-1.5">
                                      <Trash2 className="h-4 w-4" />
                                      Eliminar propietario
                                    </p>
                                    <p className="text-xs text-red-700 mt-0.5">
                                      Se eliminará permanentemente a <strong>{p.full_name || p.email}</strong> del sistema. Esta acción no se puede deshacer.
                                    </p>
                                  </div>
                                  <button onClick={() => { setDeletingPropietario(null); setDeleteError(null) }} className="text-red-400 hover:text-red-600 ml-2">
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                                {deleteError && (
                                  <p className="text-xs text-red-700 bg-red-100 rounded px-3 py-2">{deleteError}</p>
                                )}
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    disabled={deleteLoading === p.id}
                                    className="bg-red-600 hover:bg-red-700 text-white gap-1.5 text-xs"
                                    onClick={() => handleDeletePropietario(p.id)}
                                  >
                                    {deleteLoading === p.id
                                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      : <Trash2 className="h-3.5 w-3.5" />}
                                    Confirmar eliminación
                                  </Button>
                                  <Button size="sm" variant="outline" disabled={deleteLoading === p.id}
                                    onClick={() => { setDeletingPropietario(null); setDeleteError(null) }}>
                                    Cancelar
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex justify-end">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs gap-1.5 border-red-200 text-red-500 hover:border-red-400 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => { setDeletingPropietario(p.id); setDeleteError(null) }}
                                >
                                  <Trash2 className="h-3 w-3" />
                                  Eliminar propietario
                                </Button>
                              </div>
                            )
                          )}
                        </div>
                      )}

                      {/* ASSIGN EXISTING PROPERTY */}
                      {(currentUserRole === 'SUPERADMIN' || currentUserRole === 'SUPERADMINBOSS' || currentUserRole === 'AGENTE') && (() => {
                        const available = orgProperties.filter(op => !op.owner_id)
                        return (
                          <div className="pt-2 border-t space-y-2">
                            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                              <LinkIcon className="h-3 w-3" /> ASIGNAR PROPIEDAD EXISTENTE
                            </p>
                            <div className="flex items-center gap-2">
                              <select
                                value={selectedProperty[p.id] || ''}
                                onChange={e => setSelectedProperty(prev => ({ ...prev, [p.id]: e.target.value }))}
                                className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm"
                                disabled={!orgPropsLoaded || assigningProperty === p.id}
                              >
                                <option value="">
                                  {!orgPropsLoaded ? 'Cargando propiedades...' : available.length === 0 ? 'No hay propiedades disponibles' : 'Seleccionar propiedad...'}
                                </option>
                                {available.map(op => (
                                  <option key={op.id} value={op.id}>
                                    {op.title}{op.city ? ` — ${op.city}` : ''}{op.owner_name ? ` (de ${op.owner_name})` : ''}
                                  </option>
                                ))}
                              </select>
                              <Button
                                size="sm"
                                className="shrink-0 bg-navy hover:bg-navy/90 h-9"
                                disabled={!selectedProperty[p.id] || assigningProperty === p.id}
                                onClick={() => handleAssignProperty(p.id)}
                              >
                                {assigningProperty === p.id
                                  ? <Loader2 className="h-3 w-3 animate-spin" />
                                  : <><LinkIcon className="h-3 w-3 mr-1" />Asignar</>
                                }
                              </Button>
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                              Asigna una propiedad ingresada por el equipo a este propietario.
                            </p>
                          </div>
                        )
                      })()}

                      {/* SUPERADMIN: assign to agent */}
                      {(currentUserRole === 'SUPERADMIN' || currentUserRole === 'SUPERADMINBOSS') && agents && agents.length > 0 && (
                        <div className="flex items-center gap-2 pt-2 border-t">
                          <UserCheck className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-sm text-muted-foreground shrink-0">Agente:</span>
                          <select
                            value={p.agent_id || ''}
                            onChange={(e) => handleAssignAgent(p.id, e.target.value)}
                            disabled={assigningAgent === p.id}
                            className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm"
                          >
                            <option value="">Sin asignar</option>
                            {agents.map(a => (
                              <option key={a.id} value={a.id}>{a.full_name}</option>
                            ))}
                          </select>
                          {assigningAgent === p.id && <Loader2 className="h-4 w-4 animate-spin" />}
                        </div>
                      )}

                      {/* Show agent name for non-admins */}
                      {currentUserRole === 'AGENTE' && p.agent_name && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t">
                          <UserCheck className="h-4 w-4" /> Mi propietario
                        </div>
                      )}

                      {/* SUPERADMINBOSS: assign to subscriber */}
                      {currentUserRole === 'SUPERADMINBOSS' && subscribers && (
                        <div className="flex items-center gap-2 pt-2 border-t">
                          <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-sm text-muted-foreground shrink-0">Asignar a:</span>
                          <select
                            value={p.subscriber_id || ''}
                            onChange={(e) => handleAssign(p.id, e.target.value)}
                            disabled={assigning === p.id}
                            className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm"
                          >
                            <option value="">Sin asignar</option>
                            {subscribers.map(s => (
                              <option key={s.id} value={s.id}>{s.full_name}</option>
                            ))}
                          </select>
                          {assigning === p.id && <Loader2 className="h-4 w-4 animate-spin" />}
                        </div>
                      )}

                      {p.subscriber_name && currentUserRole !== 'SUPERADMINBOSS' && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t">
                          <UserCheck className="h-4 w-4" />
                          Asignado a: <strong>{p.subscriber_name}</strong>
                        </div>
                      )}
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
