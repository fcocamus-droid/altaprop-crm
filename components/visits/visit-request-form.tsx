'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  User, FileText, Mail, Phone, CalendarDays, Clock,
  CheckCircle, Loader2, ChevronLeft, ChevronRight
} from 'lucide-react'

const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00',
]

export function VisitRequestForm({ propertyId }: { propertyId: string }) {
  const [form, setForm] = useState({
    fullName: '', rut: '', email: '', phone: '', message: '',
  })
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [calendarMonth, setCalendarMonth] = useState(new Date())
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [blockedSlots, setBlockedSlots] = useState<Set<string>>(new Set())
  const [blockedDays, setBlockedDays] = useState<Set<string>>(new Set())

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

  // Calendar
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear()
    const month = calendarMonth.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const days: { day: number; dateStr: string; isPast: boolean; isToday: boolean; isWeekend: boolean }[] = []

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d)
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      days.push({
        day: d,
        dateStr,
        isPast: date < today,
        isToday: date.getTime() === today.getTime(),
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
      })
    }
    return { firstDay, days }
    // `today` is captured at component load and stays constant for the
    // session; recalculating it on every memo run would be wasted work.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calendarMonth])

  const monthLabel = calendarMonth.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })

  async function loadMonthBlockedDays(month: Date) {
    const monthStr = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`
    try {
      const res = await fetch(`/api/time-slots?propertyId=${propertyId}&month=${monthStr}`)
      const data = await res.json()
      setBlockedDays(new Set(data.blockedDays || []))
    } catch {}
  }

  async function handleDateSelect(dateStr: string) {
    setSelectedDate(dateStr)
    setSelectedTime('')
    try {
      const res = await fetch(`/api/time-slots?propertyId=${propertyId}&date=${dateStr}`)
      const data = await res.json()
      setBlockedSlots(new Set((data.slots || []).filter((s: any) => s.is_blocked).map((s: any) => s.time)))
    } catch { setBlockedSlots(new Set()) }
  }

  function handleMonthChange(newMonth: Date) {
    setCalendarMonth(newMonth)
    loadMonthBlockedDays(newMonth)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.fullName || !form.email) {
      setError('Nombre y email son obligatorios')
      return
    }
    if (!selectedDate) {
      setError('Selecciona una fecha en el calendario')
      return
    }
    if (!selectedTime) {
      setError('Selecciona una hora disponible')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/visit-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId,
          fullName: form.fullName,
          rut: form.rut,
          email: form.email,
          phone: form.phone,
          date: selectedDate,
          time: selectedTime,
          message: form.message,
        }),
      })
      const result = await res.json()
      if (result.error) setError(result.error)
      else setSuccess(true)
    } catch {
      setError('Error al enviar. Intenta de nuevo.')
    }
    setLoading(false)
  }

  if (success) {
    return (
      <Card className="border-2 border-green-200">
        <CardContent className="py-12 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-green-700 mb-2">Solicitud Enviada Exitosamente</h2>
          <p className="text-muted-foreground mb-1">Fecha solicitada: <strong>{selectedDate}</strong> a las <strong>{selectedTime}</strong></p>
          <p className="text-sm text-muted-foreground">Te contactaremos a <strong>{form.email}</strong> para confirmar tu visita.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg mb-4">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Personal data */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><User className="h-5 w-5 text-navy" /> Datos del Visitante</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><User className="h-3.5 w-3.5" /> Nombre Completo *</Label>
              <Input value={form.fullName} onChange={e => handleChange('fullName', e.target.value)} placeholder="Juan Pérez González" required />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> RUT</Label>
              <Input value={form.rut} onChange={e => handleChange('rut', e.target.value)} placeholder="12.345.678-9" maxLength={12} />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> Email *</Label>
              <Input type="email" value={form.email} onChange={e => handleChange('email', e.target.value)} placeholder="juan@email.com" required />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> Teléfono</Label>
              <Input value={form.phone} onChange={e => handleChange('phone', e.target.value)} placeholder="+56 9 1234 5678" />
            </div>
            <div className="space-y-2">
              <Label>Mensaje (opcional)</Label>
              <Textarea value={form.message} onChange={e => handleChange('message', e.target.value)} placeholder="Algún comentario o consulta sobre la propiedad..." rows={3} className="resize-none" />
            </div>
          </CardContent>
        </Card>

        {/* Right: Calendar + Time */}
        <div className="space-y-4">
          {/* Calendar */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><CalendarDays className="h-5 w-5 text-gold" /> Seleccionar Fecha</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <button type="button" onClick={() => handleMonthChange(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))} className="p-2 hover:bg-gray-100 rounded-lg">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="font-semibold text-navy capitalize">{monthLabel}</span>
                <button type="button" onClick={() => handleMonthChange(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))} className="p-2 hover:bg-gray-100 rounded-lg">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground mb-2">
                {['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'].map(d => <div key={d}>{d}</div>)}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: calendarDays.firstDay }).map((_, i) => <div key={`e-${i}`} />)}
                {calendarDays.days.map(({ day, dateStr, isPast, isToday, isWeekend }) => {
                  const isSelected = selectedDate === dateStr
                  const isDayBlocked = blockedDays.has(dateStr)
                  const isDisabled = isPast || isWeekend || isDayBlocked

                  return (
                    <button
                      key={day}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => handleDateSelect(dateStr)}
                      className={`aspect-square rounded-lg text-sm font-medium transition-all
                        ${isSelected ? 'bg-navy text-white shadow-md' : ''}
                        ${isDayBlocked && !isSelected ? 'bg-red-50 text-red-300 cursor-not-allowed' : ''}
                        ${isToday && !isSelected && !isDayBlocked ? 'border-2 border-gold text-gold' : ''}
                        ${isDisabled && !isDayBlocked ? 'text-gray-300 cursor-not-allowed' : !isSelected && !isDayBlocked ? 'hover:bg-navy/10 text-gray-700' : ''}
                      `}
                    >
                      {day}
                    </button>
                  )
                })}
              </div>

              {selectedDate && (
                <p className="text-xs text-center mt-3 text-navy font-medium">
                  Fecha seleccionada: {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Time slots */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><Clock className="h-5 w-5 text-gold" /> Seleccionar Hora</CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedDate ? (
                <p className="text-sm text-muted-foreground text-center py-4">Primero selecciona una fecha</p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {TIME_SLOTS.map(time => {
                    const isSelected = selectedTime === time
                    const isBlocked = blockedSlots.has(time)
                    return (
                      <button
                        key={time}
                        type="button"
                        disabled={isBlocked}
                        onClick={() => setSelectedTime(time)}
                        className={`py-2.5 px-3 rounded-lg text-sm font-medium border transition-all
                          ${isBlocked ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed line-through' : ''}
                          ${isSelected && !isBlocked ? 'bg-gold text-navy border-gold shadow-md' : ''}
                          ${!isSelected && !isBlocked ? 'border-gray-200 text-gray-600 hover:border-gold/50 hover:bg-gold/5' : ''}
                        `}
                      >
                        {time}
                      </button>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Submit */}
      <div className="mt-6">
        <Button type="submit" size="lg" className="w-full bg-navy hover:bg-navy/90 text-lg py-6" disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CalendarDays className="mr-2 h-5 w-5" />}
          Confirmar Solicitud de Visita
        </Button>
        <p className="text-xs text-muted-foreground text-center mt-2">Te contactaremos para confirmar la fecha y hora de tu visita</p>
      </div>
    </form>
  )
}
