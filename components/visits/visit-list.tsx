'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { VISIT_STATUSES } from '@/lib/constants'
import { createVisit, updateVisitStatus, deleteVisit } from '@/lib/actions/visits'
import { Calendar, MapPin, User, Clock, Plus, CheckCircle, XCircle, Trash2 } from 'lucide-react'

interface Visit {
  id: string
  property_id: string
  scheduled_at: string
  status: string
  notes: string | null
  property?: { id: string; title: string; address: string | null; city: string | null }
  visitor?: { id: string; full_name: string | null; phone: string | null }
}

interface Property {
  id: string
  title: string
}

function getStatusInfo(status: string) {
  return VISIT_STATUSES.find(s => s.value === status) || VISIT_STATUSES[0]
}

function formatDateTime(date: string) {
  return new Date(date).toLocaleDateString('es-CL', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export function VisitList({ visits: initialVisits, properties, canCreate }: {
  visits: Visit[]
  properties: Property[]
  canCreate: boolean
}) {
  const [visits, setVisits] = useState(initialVisits)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [newVisit, setNewVisit] = useState({ property_id: '', date: '', time: '', notes: '' })

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading('create')
    setError('')
    const scheduled_at = `${newVisit.date}T${newVisit.time}:00`
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
                  <Input type="time" value={newVisit.time} onChange={(e) => setNewVisit({ ...newVisit, time: e.target.value })} required />
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

      <div className="space-y-3">
        {visits.map((visit) => {
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
                      <p className="font-medium truncate">{(visit.property as any)?.title || 'Propiedad'}</p>
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDateTime(visit.scheduled_at)}</span>
                        {(visit.property as any)?.city && (
                          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{(visit.property as any).city}</span>
                        )}
                        {(visit.visitor as any)?.full_name && (
                          <span className="flex items-center gap-1"><User className="h-3 w-3" />{(visit.visitor as any).full_name}</span>
                        )}
                      </div>
                      {visit.notes && <p className="text-xs text-muted-foreground mt-1 italic">{visit.notes}</p>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${status.color}`}>
                      {status.label}
                    </span>
                    {visit.status === 'pending' && (
                      <Button size="sm" variant="outline" onClick={() => handleStatus(visit.id, 'confirmed')} disabled={isLoading}
                        className="text-blue-600 border-blue-200 hover:bg-blue-50 h-8 px-2">
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    )}
                    {visit.status === 'confirmed' && (
                      <Button size="sm" variant="outline" onClick={() => handleStatus(visit.id, 'completed')} disabled={isLoading}
                        className="text-green-600 border-green-200 hover:bg-green-50 h-8 px-2">
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    )}
                    {(visit.status === 'pending' || visit.status === 'confirmed') && (
                      <Button size="sm" variant="outline" onClick={() => handleStatus(visit.id, 'canceled')} disabled={isLoading}
                        className="text-red-500 border-red-200 hover:bg-red-50 h-8 px-2">
                        <XCircle className="h-4 w-4" />
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => handleDelete(visit.id)} disabled={isLoading}
                      className="text-red-500 border-red-200 hover:bg-red-50 h-8 px-2">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}

        {visits.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No hay visitas agendadas</p>
            <p className="text-sm">Agenda tu primera visita para empezar</p>
          </div>
        )}
      </div>
    </div>
  )
}
