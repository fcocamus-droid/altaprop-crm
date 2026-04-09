'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  CalendarDays, Clock, User, Mail, Phone, FileText,
  CheckCircle, Loader2, ChevronLeft, ChevronRight, X,
} from 'lucide-react'
import { formatRut } from '@/lib/validations/chilean-formats'

const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00',
]

interface Props {
  propertyId: string
  primaryColor: string
  accentColor: string
}

export function SiteVisitRequestButton({ propertyId, primaryColor, accentColor }: Props) {
  const [open, setOpen]               = useState(false)
  const [form, setForm]               = useState({ fullName: '', rut: '', email: '', phone: '', message: '' })
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [calMonth, setCalMonth]       = useState(new Date())
  const [blockedSlots, setBlockedSlots] = useState<Set<string>>(new Set())
  const [blockedDays, setBlockedDays]   = useState<Set<string>>(new Set())
  const [loading, setLoading]         = useState(false)
  const [success, setSuccess]         = useState(false)
  const [error, setError]             = useState('')

  function set(field: string, value: string) {
    setForm(p => ({ ...p, [field]: field === 'rut' ? formatRut(value) : value }))
  }

  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d }, [])

  // Load blocked days for the current month on mount
  useEffect(() => {
    const monthStr = `${calMonth.getFullYear()}-${String(calMonth.getMonth()+1).padStart(2,'0')}`
    fetch(`/api/time-slots?propertyId=${propertyId}&month=${monthStr}`)
      .then(r => r.json())
      .then(data => setBlockedDays(new Set(data.blockedDays || [])))
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const { firstDay, days } = useMemo(() => {
    const y = calMonth.getFullYear(), m = calMonth.getMonth()
    const firstDay = new Date(y, m, 1).getDay()
    const days = Array.from({ length: new Date(y, m + 1, 0).getDate() }, (_, i) => {
      const d = i + 1
      const date = new Date(y, m, d)
      const dateStr = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
      return {
        d, dateStr,
        isPast: date < today,
        isToday: date.getTime() === today.getTime(),
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
      }
    })
    return { firstDay, days }
  }, [calMonth, today])

  async function changeMonth(delta: number) {
    const next = new Date(calMonth.getFullYear(), calMonth.getMonth() + delta)
    setCalMonth(next)
    const monthStr = `${next.getFullYear()}-${String(next.getMonth()+1).padStart(2,'0')}`
    try {
      const res = await fetch(`/api/time-slots?propertyId=${propertyId}&month=${monthStr}`)
      const data = await res.json()
      setBlockedDays(new Set(data.blockedDays || []))
    } catch {}
  }

  async function selectDate(dateStr: string) {
    setSelectedDate(dateStr)
    setSelectedTime('')
    try {
      const res = await fetch(`/api/time-slots?propertyId=${propertyId}&date=${dateStr}`)
      const data = await res.json()
      setBlockedSlots(new Set((data.slots || []).filter((s: any) => s.is_blocked).map((s: any) => s.time)))
    } catch { setBlockedSlots(new Set()) }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.fullName || !form.email) { setError('Nombre y email son obligatorios'); return }
    if (!selectedDate) { setError('Selecciona una fecha'); return }
    if (!selectedTime) { setError('Selecciona una hora'); return }

    setLoading(true); setError('')
    try {
      const res = await fetch('/api/public/visit-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId, ...form, date: selectedDate, time: selectedTime }),
      })
      const data = await res.json()
      if (data.error) setError(data.error)
      else setSuccess(true)
    } catch { setError('Error al enviar. Intenta de nuevo.') }
    setLoading(false)
  }

  if (success) {
    return (
      <div className="rounded-xl border-2 border-green-200 bg-green-50 p-4 text-center">
        <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
        <p className="text-sm font-semibold text-green-800">¡Solicitud enviada!</p>
        <p className="text-xs text-green-700 mt-1">
          Fecha solicitada: <strong>{selectedDate}</strong> a las <strong>{selectedTime}</strong>
        </p>
        <p className="text-xs text-green-600 mt-1">Te contactaremos a <strong>{form.email}</strong> para confirmar.</p>
      </div>
    )
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center justify-between w-full py-3 px-4 rounded-xl border-2 text-sm font-semibold transition-colors hover:opacity-90"
        style={{ borderColor: primaryColor + '40', color: primaryColor }}
      >
        <span className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4" />
          Solicitar Orden de Visita
        </span>
        <ChevronRight className="h-4 w-4" />
      </button>
    )
  }

  const monthLabel = calMonth.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })

  return (
    <div className="rounded-xl border-2 p-4 space-y-4" style={{ borderColor: primaryColor + '40' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: primaryColor }}>
          <CalendarDays className="h-4 w-4" style={{ color: accentColor }} />
          Solicitar Orden de Visita
        </h3>
        <button type="button" onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
          <X className="h-4 w-4" />
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-2 rounded-lg">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Visitor data */}
        <div className="grid grid-cols-1 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600 flex items-center gap-1 mb-1">
              <User className="h-3 w-3" /> Nombre Completo *
            </label>
            <input
              value={form.fullName} onChange={e => set('fullName', e.target.value)}
              placeholder="Juan Pérez González" required
              className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-1"
              style={{ '--tw-ring-color': primaryColor } as any}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-gray-600 flex items-center gap-1 mb-1">
                <FileText className="h-3 w-3" /> RUT
              </label>
              <input
                value={form.rut} onChange={e => set('rut', e.target.value)}
                placeholder="12.345.678-9" maxLength={12}
                className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 flex items-center gap-1 mb-1">
                <Phone className="h-3 w-3" /> Teléfono
              </label>
              <input
                value={form.phone} onChange={e => set('phone', e.target.value)}
                placeholder="+56 9 1234 5678"
                className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 flex items-center gap-1 mb-1">
              <Mail className="h-3 w-3" /> Email *
            </label>
            <input
              type="email" value={form.email} onChange={e => set('email', e.target.value)}
              placeholder="juan@email.com" required
              className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none"
            />
          </div>
        </div>

        {/* Calendar */}
        <div className="rounded-lg border border-gray-200 p-3">
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={() => changeMonth(-1)} className="p-1 hover:bg-gray-100 rounded">
              <ChevronLeft className="h-4 w-4 text-gray-500" />
            </button>
            <span className="text-sm font-semibold capitalize" style={{ color: primaryColor }}>{monthLabel}</span>
            <button type="button" onClick={() => changeMonth(1)} className="p-1 hover:bg-gray-100 rounded">
              <ChevronRight className="h-4 w-4 text-gray-500" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5 text-center text-xs text-gray-400 mb-1">
            {['Do','Lu','Ma','Mi','Ju','Vi','Sa'].map(d => <div key={d}>{d}</div>)}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
            {days.map(({ d, dateStr, isPast, isToday, isWeekend }) => {
              const isSelected = selectedDate === dateStr
              const isBlocked  = blockedDays.has(dateStr)
              const disabled   = isPast || isWeekend || isBlocked
              return (
                <button
                  key={d} type="button" disabled={disabled}
                  onClick={() => selectDate(dateStr)}
                  className={`aspect-square rounded text-xs font-medium transition-all
                    ${isSelected ? 'text-white shadow-sm' : ''}
                    ${isBlocked && !isSelected ? 'bg-red-50 text-red-300 cursor-not-allowed' : ''}
                    ${isToday && !isSelected && !isBlocked ? 'border font-bold' : ''}
                    ${disabled && !isBlocked ? 'text-gray-300 cursor-not-allowed' : !isSelected && !isBlocked ? 'hover:opacity-80 text-gray-700' : ''}
                  `}
                  style={isSelected ? { background: primaryColor } : isToday && !isBlocked ? { borderColor: accentColor, color: accentColor } : undefined}
                >
                  {d}
                </button>
              )
            })}
          </div>
          {selectedDate && (
            <p className="text-xs text-center mt-2 font-medium" style={{ color: primaryColor }}>
              {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          )}
        </div>

        {/* Time slots */}
        {selectedDate && (
          <div className="rounded-lg border border-gray-200 p-3">
            <p className="text-xs font-medium text-gray-600 flex items-center gap-1 mb-2">
              <Clock className="h-3 w-3" /> Selecciona una hora
            </p>
            <div className="grid grid-cols-4 gap-1.5">
              {TIME_SLOTS.map(t => {
                const isSel     = selectedTime === t
                const isBlocked = blockedSlots.has(t)
                return (
                  <button
                    key={t} type="button" disabled={isBlocked}
                    onClick={() => setSelectedTime(t)}
                    className={`py-1.5 rounded text-xs font-medium border transition-all
                      ${isBlocked ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed line-through' : ''}
                      ${isSel && !isBlocked ? 'text-white border-transparent shadow-sm' : ''}
                      ${!isSel && !isBlocked ? 'border-gray-200 text-gray-600 hover:opacity-80' : ''}
                    `}
                    style={isSel && !isBlocked ? { background: accentColor, color: primaryColor } : undefined}
                  >
                    {t}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <button
          type="submit" disabled={loading}
          className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ background: primaryColor }}
        >
          {loading
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</>
            : <><CalendarDays className="h-4 w-4" /> Confirmar Solicitud de Visita</>
          }
        </button>
        <p className="text-xs text-gray-500 text-center">
          Te contactaremos para confirmar la fecha y hora
        </p>
      </form>
    </div>
  )
}
