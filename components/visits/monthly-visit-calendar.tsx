'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, X, Calendar, Clock, User, MapPin, CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toChileDateKey, formatChileTime } from '@/lib/utils/chile-datetime'

// ─── Constants ────────────────────────────────────────────────────────────────
const DAYS_ES   = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const STATUS_CONFIG: Record<string, {
  label: string; bg: string; text: string; dot: string; border: string
}> = {
  confirmed: { label: 'Confirmada', bg: 'bg-blue-50',   text: 'text-blue-800',   dot: 'bg-blue-500',   border: 'border-blue-100' },
  pending:   { label: 'Pendiente',  bg: 'bg-amber-50',  text: 'text-amber-800',  dot: 'bg-amber-400',  border: 'border-amber-100' },
  completed: { label: 'Completada', bg: 'bg-green-50',  text: 'text-green-800',  dot: 'bg-green-500',  border: 'border-green-100' },
  canceled:  { label: 'Cancelada',  bg: 'bg-gray-50',   text: 'text-gray-500',   dot: 'bg-gray-300',   border: 'border-gray-100' },
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface Visit {
  id: string
  property_id: string
  scheduled_at: string
  status: string
  notes: string | null
  property?: { id: string; title: string; address: string | null; city: string | null }
  visitor?: { id: string; full_name: string | null; phone: string | null }
}

interface MonthlyVisitCalendarProps {
  visits: Visit[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getVisitorName(visit: Visit): string {
  if (visit.visitor?.full_name) return visit.visitor.full_name
  if (visit.notes) {
    const m = visit.notes.match(/Solicitud de:\s*([^|]+)/)
    if (m) return m[1].trim()
  }
  return 'Visitante'
}

function formatTime(iso: string): string {
  return formatChileTime(iso)
}

function toDayKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

// Chile uses Monday-first weeks: (getDay() + 6) % 7 → 0=Mon … 6=Sun
function mondayOffset(year: number, month: number): number {
  return (new Date(year, month, 1).getDay() + 6) % 7
}

// ─── Component ────────────────────────────────────────────────────────────────
export function MonthlyVisitCalendar({ visits }: MonthlyVisitCalendarProps) {
  const today    = new Date()
  const [month, setMonth]       = useState(today.getMonth())
  const [year, setYear]         = useState(today.getFullYear())
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Filter visits by selected status
  const filteredVisits = useMemo(
    () => statusFilter === 'all' ? visits : visits.filter(v => v.status === statusFilter),
    [visits, statusFilter],
  )

  // Group visits by Chile YYYY-MM-DD (not UTC), sorted by time within each day
  const visitsByDay = useMemo(() => {
    const map = new Map<string, Visit[]>()
    filteredVisits.forEach(v => {
      const key = toChileDateKey(v.scheduled_at)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(v)
    })
    map.forEach((arr, k) =>
      map.set(k, arr.sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))),
    )
    return map
  }, [filteredVisits])

  // Stats for currently displayed month (using Chile dates)
  const monthStats = useMemo(() => {
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`
    const mv = visits.filter(v => toChileDateKey(v.scheduled_at).startsWith(prefix))
    return {
      total:     mv.length,
      confirmed: mv.filter(v => v.status === 'confirmed').length,
      pending:   mv.filter(v => v.status === 'pending').length,
      completed: mv.filter(v => v.status === 'completed').length,
      canceled:  mv.filter(v => v.status === 'canceled').length,
    }
  }, [visits, month, year])

  // Build calendar cell array (null = empty padding)
  const daysInMonth  = new Date(year, month + 1, 0).getDate()
  const offset       = mondayOffset(year, month)
  const totalCells   = Math.ceil((offset + daysInMonth) / 7) * 7
  const cells: (number | null)[] = Array.from({ length: totalCells }, (_, i) => {
    const d = i - offset + 1
    return d >= 1 && d <= daysInMonth ? d : null
  })

  const todayKey = toChileDateKey(today.toISOString())

  // Navigation
  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1)
    setSelectedDay(null)
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1)
    setSelectedDay(null)
  }
  function goToday() {
    setMonth(today.getMonth()); setYear(today.getFullYear()); setSelectedDay(null)
  }

  const selectedVisits = selectedDay ? (visitsByDay.get(selectedDay) ?? []) : []

  // Format selected day header
  const selectedDayLabel = selectedDay
    ? new Date(selectedDay + 'T12:00:00-04:00').toLocaleDateString('es-CL', {
        timeZone: 'America/Santiago',
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })
    : ''

  return (
    <div className="space-y-4">

      {/* ── Top bar: nav + stats ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">

        {/* Month navigation */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-bold text-navy w-52 text-center select-none">
            {MONTHS_ES[month]} {year}
          </h2>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={goToday}
            className="text-xs text-muted-foreground hover:text-navy">
            Hoy
          </Button>
        </div>

        {/* Monthly stats pills */}
        <div className="flex flex-wrap gap-2 text-xs">
          {[
            { label: 'pendientes',   count: monthStats.pending,   dot: 'bg-amber-400' },
            { label: 'confirmadas',  count: monthStats.confirmed,  dot: 'bg-blue-500' },
            { label: 'completadas',  count: monthStats.completed,  dot: 'bg-green-500' },
            { label: 'canceladas',   count: monthStats.canceled,   dot: 'bg-gray-300' },
          ].map(s => (
            <span key={s.label} className="flex items-center gap-1.5 bg-white border rounded-full px-2.5 py-1">
              <span className={`w-2 h-2 rounded-full ${s.dot}`} />
              <span className="font-semibold text-navy">{s.count}</span>
              <span className="text-muted-foreground">{s.label}</span>
            </span>
          ))}
          <span className="flex items-center gap-1.5 bg-navy/5 border border-navy/10 rounded-full px-2.5 py-1">
            <span className="font-semibold text-navy">{monthStats.total}</span>
            <span className="text-muted-foreground">total</span>
          </span>
        </div>
      </div>

      {/* ── Status filter pills ── */}
      <div className="flex items-center gap-2 flex-wrap">
        {[
          { value: 'all',       label: 'Todas' },
          { value: 'confirmed', label: 'Confirmadas' },
          { value: 'pending',   label: 'Pendientes' },
          { value: 'completed', label: 'Completadas' },
          { value: 'canceled',  label: 'Canceladas' },
        ].map(f => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
              statusFilter === f.value
                ? 'bg-navy text-white border-navy shadow-sm'
                : 'bg-white text-muted-foreground border-gray-200 hover:border-navy/40 hover:text-navy'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Main layout: calendar + detail panel ── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-4 items-start">

        {/* Calendar grid */}
        <div className="rounded-xl border bg-white overflow-hidden shadow-sm">

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 bg-navy/5 border-b">
            {DAYS_ES.map(d => (
              <div key={d} className="py-2.5 text-center text-xs font-semibold text-navy/60 uppercase tracking-wider">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {cells.map((day, i) => {
              /* Empty padding cell */
              if (day === null) {
                return (
                  <div
                    key={`pad-${i}`}
                    className="min-h-[88px] border-r border-b last:border-r-0 bg-gray-50/60"
                  />
                )
              }

              const key       = toDayKey(year, month, day)
              const dayVisits = visitsByDay.get(key) ?? []
              const isToday   = key === todayKey
              const isSelected = key === selectedDay

              return (
                <div
                  key={key}
                  onClick={() => setSelectedDay(isSelected ? null : key)}
                  className={`min-h-[88px] border-r border-b last:border-r-0 p-1.5 cursor-pointer select-none transition-colors ${
                    isSelected
                      ? 'bg-navy/[0.06] ring-1 ring-inset ring-navy/20'
                      : dayVisits.length > 0
                      ? 'hover:bg-blue-50/40'
                      : 'hover:bg-gray-50/80'
                  }`}
                >
                  {/* Day number */}
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-semibold flex h-5 w-5 items-center justify-center rounded-full ${
                        isToday
                          ? 'bg-navy text-white'
                          : isSelected
                          ? 'text-navy font-bold'
                          : 'text-gray-600'
                      }`}
                    >
                      {day}
                    </span>
                    {dayVisits.length > 0 && (
                      <span className="text-xs font-medium text-muted-foreground leading-none">
                        {dayVisits.length}
                      </span>
                    )}
                  </div>

                  {/* Visit chips — max 2 + overflow */}
                  <div className="space-y-0.5">
                    {dayVisits.slice(0, 2).map(v => {
                      const cfg = STATUS_CONFIG[v.status] ?? STATUS_CONFIG.pending
                      return (
                        <div
                          key={v.id}
                          className={`flex items-center gap-1 text-[10px] rounded px-1 py-0.5 ${cfg.bg} ${cfg.text} overflow-hidden`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
                          <span className="truncate font-medium leading-tight">
                            {formatTime(v.scheduled_at)}{' '}
                            <span className="opacity-75">{v.property?.title ?? 'Propiedad'}</span>
                          </span>
                        </div>
                      )
                    })}
                    {dayVisits.length > 2 && (
                      <p className="text-[10px] text-muted-foreground pl-0.5 leading-tight">
                        +{dayVisits.length - 2} más
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Right panel: day detail or placeholder ── */}
        {selectedDay ? (
          <div className="rounded-xl border bg-white shadow-sm p-4 space-y-3 sticky top-4">
            {/* Panel header */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-navy text-sm capitalize leading-tight">
                  {selectedDayLabel}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selectedVisits.length} visita{selectedVisits.length !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={() => setSelectedDay(null)}
                className="text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-0.5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {selectedVisits.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CalendarDays className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">Sin visitas este día</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  (pueden existir con otro filtro activo)
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
                {selectedVisits.map(v => {
                  const cfg = STATUS_CONFIG[v.status] ?? STATUS_CONFIG.pending
                  return (
                    <div
                      key={v.id}
                      className={`rounded-lg p-3 border ${cfg.bg} ${cfg.border}`}
                    >
                      {/* Time + status */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <Clock className={`h-3 w-3 ${cfg.text}`} />
                          <span className={`text-xs font-bold ${cfg.text}`}>
                            {formatTime(v.scheduled_at)}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/70 ${cfg.text}`}
                        >
                          {cfg.label}
                        </span>
                      </div>

                      {/* Property */}
                      <p className="text-xs font-semibold text-navy truncate leading-tight mb-1.5">
                        {v.property?.title ?? 'Propiedad'}
                      </p>

                      {/* Location */}
                      {v.property?.city && (
                        <div className="flex items-center gap-1 mb-1">
                          <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="text-xs text-muted-foreground truncate">
                            {[v.property.address, v.property.city].filter(Boolean).join(', ')}
                          </span>
                        </div>
                      )}

                      {/* Visitor */}
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="text-xs text-muted-foreground truncate">
                          {getVisitorName(v)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ) : (
          /* Placeholder when no day selected */
          <div className="rounded-xl border bg-gray-50/60 p-6 flex flex-col items-center justify-center text-center xl:min-h-[240px] sticky top-4">
            <Calendar className="h-9 w-9 text-muted-foreground/25 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Selecciona un día</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Haz clic en cualquier día para ver el detalle de sus visitas
            </p>
          </div>
        )}
      </div>

      {/* ── Legend ── */}
      <div className="flex items-center gap-4 justify-end flex-wrap text-xs text-muted-foreground">
        <span className="font-medium text-navy/50">Leyenda:</span>
        {Object.entries(STATUS_CONFIG).map(([, cfg]) => (
          <span key={cfg.label} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
            <span>{cfg.label}</span>
          </span>
        ))}
      </div>
    </div>
  )
}
