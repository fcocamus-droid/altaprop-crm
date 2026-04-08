'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ChevronLeft, ChevronRight, Clock, CheckCircle, Loader2, AlertCircle } from 'lucide-react'
import { formatRut, validateRut, formatPhone, validatePhone } from '@/lib/validations/chilean-formats'

interface VisitCalendarProps {
  propertyId: string
  propertyTitle: string
}

interface Slot {
  time: string
  available: boolean
}

const DAYS = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab']
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

export function VisitCalendar({ propertyId, propertyTitle }: VisitCalendarProps) {
  const today = new Date()
  const todayChile = new Date(today.toLocaleString('en-US', { timeZone: 'America/Santiago' }))
  const [currentMonth, setCurrentMonth] = useState(todayChile.getMonth())
  const [currentYear, setCurrentYear] = useState(todayChile.getFullYear())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [slots, setSlots] = useState<Slot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [step, setStep] = useState<'calendar' | 'form' | 'success'>('calendar')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({ name: '', rut: '', phone: '', email: '', notes: '' })
  const [fieldErrors, setFieldErrors] = useState<{ rut?: string; phone?: string }>({})
  const [touched, setTouched] = useState<{ rut?: boolean; phone?: boolean }>({})

  function handleRutChange(value: string) {
    const formatted = formatRut(value)
    setFormData(prev => ({ ...prev, rut: formatted }))
    if (touched.rut && formatted) {
      setFieldErrors(prev => ({ ...prev, rut: validateRut(formatted) ? undefined : 'RUT inválido' }))
    } else {
      setFieldErrors(prev => ({ ...prev, rut: undefined }))
    }
  }

  function handlePhoneChange(value: string) {
    const formatted = formatPhone(value)
    setFormData(prev => ({ ...prev, phone: formatted }))
    if (touched.phone && formatted) {
      setFieldErrors(prev => ({ ...prev, phone: validatePhone(formatted) ? undefined : 'Formato: +56 9 1234 5678' }))
    } else {
      setFieldErrors(prev => ({ ...prev, phone: undefined }))
    }
  }

  function handleBlurRut() {
    setTouched(prev => ({ ...prev, rut: true }))
    if (formData.rut) {
      setFieldErrors(prev => ({ ...prev, rut: validateRut(formData.rut) ? undefined : 'RUT inválido' }))
    }
  }

  function handleBlurPhone() {
    setTouched(prev => ({ ...prev, phone: true }))
    if (formData.phone) {
      setFieldErrors(prev => ({ ...prev, phone: validatePhone(formData.phone) ? undefined : 'Formato: +56 9 1234 5678' }))
    }
  }

  // Generate calendar days
  const firstDay = new Date(currentYear, currentMonth, 1).getDay()
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const todayStr = today.toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })

  const days: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) days.push(null)
  for (let i = 1; i <= daysInMonth; i++) days.push(i)

  function getDateStr(day: number) {
    return `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  function isPast(day: number) {
    return getDateStr(day) < todayStr
  }

  async function handleSelectDate(day: number) {
    const dateStr = getDateStr(day)
    setSelectedDate(dateStr)
    setSelectedTime(null)
    setLoadingSlots(true)

    const res = await fetch(`/api/visits/slots?propertyId=${propertyId}&date=${dateStr}`)
    const data = await res.json()
    setSlots(data.slots || [])
    setLoadingSlots(false)
  }

  function prevMonth() {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1) }
    else setCurrentMonth(currentMonth - 1)
  }

  function nextMonth() {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1) }
    else setCurrentMonth(currentMonth + 1)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedDate || !selectedTime) return

    // Validate before submit
    const rutErr = formData.rut && !validateRut(formData.rut) ? 'RUT inválido' : undefined
    const phoneErr = formData.phone && !validatePhone(formData.phone) ? 'Formato: +56 9 1234 5678' : undefined
    if (rutErr || phoneErr) {
      setFieldErrors({ rut: rutErr, phone: phoneErr })
      setTouched({ rut: true, phone: true })
      return
    }

    setSubmitting(true)
    setError('')

    const res = await fetch('/api/visits/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        propertyId,
        date: selectedDate,
        time: selectedTime,
        ...formData,
      }),
    })
    const data = await res.json()

    if (data.error) {
      setError(data.error)
    } else {
      setStep('success')
    }
    setSubmitting(false)
  }

  // Filter visible time slots (8:00 to 21:00)
  const visibleSlots = slots.filter(s => {
    const h = parseInt(s.time.split(':')[0])
    return h >= 8 && h < 21
  })

  if (step === 'success') {
    return (
      <div className="text-center py-8">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">Visita Solicitada</h3>
        <p className="text-muted-foreground text-sm mb-1">
          {new Date(selectedDate + 'T12:00:00-04:00').toLocaleDateString('es-CL', { timeZone: 'America/Santiago', weekday: 'long', day: 'numeric', month: 'long' })} a las {selectedTime}
        </p>
        <p className="text-xs text-muted-foreground">Te contactaremos para confirmar</p>
      </div>
    )
  }

  if (step === 'form') {
    return (
      <div>
        <div className="bg-navy/5 rounded-lg p-3 mb-4 text-sm">
          <p className="font-medium">{new Date(selectedDate + 'T12:00:00-04:00').toLocaleDateString('es-CL', { timeZone: 'America/Santiago', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
          <p className="text-muted-foreground">Hora: {selectedTime}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && <div className="bg-red-50 text-red-700 text-sm p-2 rounded">{error}</div>}
          <div>
            <Label className="text-sm">Nombre completo *</Label>
            <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required placeholder="Tu nombre" />
          </div>
          <div>
            <Label className="text-sm">RUT</Label>
            <Input
              value={formData.rut}
              onChange={e => handleRutChange(e.target.value)}
              onBlur={handleBlurRut}
              placeholder="12.345.678-9"
              maxLength={12}
              className={fieldErrors.rut ? 'border-red-400 focus-visible:ring-red-300' : touched.rut && formData.rut && !fieldErrors.rut ? 'border-green-400 focus-visible:ring-green-300' : ''}
            />
            {fieldErrors.rut && (
              <p className="flex items-center gap-1 text-xs text-red-500 mt-1">
                <AlertCircle className="h-3 w-3 shrink-0" />{fieldErrors.rut}
              </p>
            )}
            {touched.rut && formData.rut && !fieldErrors.rut && (
              <p className="flex items-center gap-1 text-xs text-green-600 mt-1">
                <CheckCircle className="h-3 w-3 shrink-0" />RUT válido
              </p>
            )}
          </div>
          <div>
            <Label className="text-sm">Teléfono *</Label>
            <Input
              value={formData.phone}
              onChange={e => handlePhoneChange(e.target.value)}
              onBlur={handleBlurPhone}
              required
              placeholder="+56 9 1234 5678"
              type="tel"
              maxLength={15}
              className={fieldErrors.phone ? 'border-red-400 focus-visible:ring-red-300' : touched.phone && formData.phone && !fieldErrors.phone ? 'border-green-400 focus-visible:ring-green-300' : ''}
            />
            {fieldErrors.phone && (
              <p className="flex items-center gap-1 text-xs text-red-500 mt-1">
                <AlertCircle className="h-3 w-3 shrink-0" />{fieldErrors.phone}
              </p>
            )}
            {touched.phone && formData.phone && !fieldErrors.phone && (
              <p className="flex items-center gap-1 text-xs text-green-600 mt-1">
                <CheckCircle className="h-3 w-3 shrink-0" />Teléfono válido
              </p>
            )}
          </div>
          <div>
            <Label className="text-sm">Email</Label>
            <Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="tu@email.com" />
          </div>
          <div>
            <Label className="text-sm">Notas</Label>
            <Input value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Comentarios adicionales" />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setStep('calendar')} className="flex-1">Volver</Button>
            <Button type="submit" disabled={submitting} className="flex-1">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirmar
            </Button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div>
      {/* Calendar header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} type="button" className="p-1 hover:bg-muted rounded"><ChevronLeft className="h-5 w-5" /></button>
        <h3 className="font-semibold text-sm">{MONTHS[currentMonth]} {currentYear}</h3>
        <button onClick={nextMonth} type="button" className="p-1 hover:bg-muted rounded"><ChevronRight className="h-5 w-5" /></button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAYS.map(d => <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>)}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1 mb-4">
        {days.map((day, i) => {
          if (!day) return <div key={i} />
          const dateStr = getDateStr(day)
          const past = isPast(day)
          const isSelected = dateStr === selectedDate
          const isToday = dateStr === todayStr

          return (
            <button
              key={i}
              type="button"
              disabled={past}
              onClick={() => handleSelectDate(day)}
              className={`aspect-square flex items-center justify-center text-sm rounded-lg transition-all
                ${past ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-navy/10 cursor-pointer'}
                ${isSelected ? 'bg-navy text-white font-bold' : ''}
                ${isToday && !isSelected ? 'border-2 border-gold font-semibold' : ''}
              `}
            >
              {day}
            </button>
          )
        })}
      </div>

      {/* Time slots */}
      {selectedDate && (
        <div>
          <p className="text-sm font-medium mb-2 flex items-center gap-1">
            <Clock className="h-4 w-4" />
            Horarios disponibles
          </p>
          {loadingSlots ? (
            <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <div className="grid grid-cols-4 gap-1.5 max-h-[200px] overflow-y-auto">
              {visibleSlots.map(slot => (
                <button
                  key={slot.time}
                  type="button"
                  disabled={!slot.available}
                  onClick={() => { setSelectedTime(slot.time); setStep('form') }}
                  className={`py-1.5 px-2 text-xs rounded-md border transition-all
                    ${!slot.available ? 'bg-gray-100 text-gray-400 line-through cursor-not-allowed' : 'hover:bg-navy hover:text-white cursor-pointer border-gray-200'}
                    ${selectedTime === slot.time ? 'bg-navy text-white border-navy' : ''}
                  `}
                >
                  {slot.time}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {!selectedDate && (
        <p className="text-xs text-muted-foreground text-center py-2">Selecciona un dia para ver horarios disponibles</p>
      )}
    </div>
  )
}
