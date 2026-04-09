'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { CalendarDays, CheckCircle, Loader2, X, User, Mail, Phone, FileText } from 'lucide-react'

export function VisitRequestButton({ propertyId, propertyTitle }: { propertyId: string; propertyTitle: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    fullName: '', rut: '', email: '', phone: '',
    date: '', time: '', message: '',
  })

  function formatRut(value: string): string {
    let clean = value.replace(/[^0-9kK]/g, '')
    if (clean.length > 9) clean = clean.slice(0, 9)
    if (clean.length <= 1) return clean
    const body = clean.slice(0, -1)
    const dv = clean.slice(-1).toUpperCase()
    return `${body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${dv}`
  }

  function handleChange(field: string, value: string) {
    if (field === 'rut') value = formatRut(value)
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.fullName || !form.email) {
      setError('Nombre y email son obligatorios')
      return
    }
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/visit-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId, ...form }),
      })
      const result = await res.json()
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(true)
      }
    } catch {
      setError('Error al enviar. Intenta de nuevo.')
    }
    setLoading(false)
  }

  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
        <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
        <p className="text-sm font-medium text-green-700">Solicitud enviada exitosamente</p>
        <p className="text-xs text-green-600 mt-1">Te contactaremos para confirmar tu visita</p>
      </div>
    )
  }

  if (!open) {
    return (
      <Button
        variant="outline"
        className="w-full border-gold text-gold hover:bg-gold/10 font-semibold"
        size="lg"
        onClick={() => setOpen(true)}
      >
        <CalendarDays className="mr-2 h-4 w-4" />
        Solicitar Orden de Visita
      </Button>
    )
  }

  return (
    <Card className="border-2 border-gold/30">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-navy flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-gold" /> Solicitar Visita
          </h3>
          <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
        </div>

        {error && <div className="bg-red-50 text-red-600 text-xs p-2 rounded mb-3">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label className="text-xs flex items-center gap-1"><User className="h-3 w-3" /> Nombre Completo *</Label>
            <Input value={form.fullName} onChange={e => handleChange('fullName', e.target.value)} placeholder="Juan Pérez" required className="text-sm" />
          </div>
          <div>
            <Label className="text-xs flex items-center gap-1"><FileText className="h-3 w-3" /> RUT</Label>
            <Input value={form.rut} onChange={e => handleChange('rut', e.target.value)} placeholder="12.345.678-9" maxLength={12} className="text-sm" />
          </div>
          <div>
            <Label className="text-xs flex items-center gap-1"><Mail className="h-3 w-3" /> Email *</Label>
            <Input type="email" value={form.email} onChange={e => handleChange('email', e.target.value)} placeholder="juan@email.com" required className="text-sm" />
          </div>
          <div>
            <Label className="text-xs flex items-center gap-1"><Phone className="h-3 w-3" /> Teléfono</Label>
            <Input value={form.phone} onChange={e => handleChange('phone', e.target.value)} placeholder="+56 9 1234 5678" className="text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Fecha preferida</Label>
              <Input type="date" value={form.date} onChange={e => handleChange('date', e.target.value)} min={new Date().toISOString().split('T')[0]} className="text-sm" />
            </div>
            <div>
              <Label className="text-xs">Hora preferida</Label>
              <select value={form.time} onChange={e => handleChange('time', e.target.value)} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                <option value="">Seleccionar</option>
                {['09:00','10:00','11:00','12:00','14:00','15:00','16:00','17:00','18:00'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <Button type="submit" className="w-full bg-gold hover:bg-gold/90 text-navy font-semibold" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarDays className="mr-2 h-4 w-4" />}
            Enviar Solicitud de Visita
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
