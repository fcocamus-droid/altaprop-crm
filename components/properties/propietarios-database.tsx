'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import { Search, Home, Phone, Mail, MapPin, Loader2, UserCheck, Building2 } from 'lucide-react'

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
}

export function PropietariosDatabase({ currentUserRole, subscribers }: {
  currentUserRole: string
  subscribers?: { id: string; full_name: string }[]
}) {
  const [propietarios, setPropietarios] = useState<Propietario[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [assigning, setAssigning] = useState<string | null>(null)

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

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
  }

  const filtered = propietarios.filter(p => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      (p.full_name || '').toLowerCase().includes(q) ||
      (p.email || '').toLowerCase().includes(q) ||
      (p.rut || '').toLowerCase().includes(q) ||
      (p.phone || '').toLowerCase().includes(q) ||
      (p.property_address || '').toLowerCase().includes(q) ||
      (p.property_city || '').toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nombre, RUT, email, dirección..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
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
                onClick={() => setExpanded(isExpanded ? null : p.id)}>
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
                      {p.property_city && (
                        <Badge variant="outline" className="text-xs"><MapPin className="h-3 w-3 mr-1" />{p.property_city}</Badge>
                      )}
                      {p.subscriber_id ? (
                        <Badge className="bg-green-100 text-green-800 border-green-200 text-xs"><UserCheck className="h-3 w-3 mr-1" />Asignado</Badge>
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
