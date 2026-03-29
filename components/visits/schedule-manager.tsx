'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronLeft, ChevronRight, Lock, Unlock, Loader2 } from 'lucide-react'

const DAYS = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab']
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

interface BlockedSlot {
  id: string
  blocked_date: string
  blocked_time: string | null
  full_day: boolean
}

export function ScheduleManager() {
  const today = new Date()
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [year, setYear] = useState(today.getFullYear())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [blocked, setBlocked] = useState<BlockedSlot[]>([])
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => { fetchBlocked() }, [month, year])

  async function fetchBlocked() {
    setLoading(true)
    const res = await fetch(`/api/visits/blocked?month=${month}&year=${year}`)
    const data = await res.json()
    setBlocked(data.blocked || [])
    setLoading(false)
  }

  async function blockDay(date: string) {
    setActionLoading(date)
    await fetch('/api/visits/blocked', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, fullDay: true }),
    })
    await fetchBlocked()
    setActionLoading(null)
  }

  async function unblockDay(date: string) {
    setActionLoading(date)
    await fetch(`/api/visits/blocked?date=${date}`, { method: 'DELETE' })
    await fetchBlocked()
    setActionLoading(null)
  }

  async function blockTime(date: string, time: string) {
    setActionLoading(`${date}-${time}`)
    await fetch('/api/visits/blocked', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, time }),
    })
    await fetchBlocked()
    setActionLoading(null)
  }

  async function unblockTime(date: string, time: string) {
    setActionLoading(`${date}-${time}`)
    await fetch(`/api/visits/blocked?date=${date}&time=${time}`, { method: 'DELETE' })
    await fetchBlocked()
    setActionLoading(null)
  }

  function isDayBlocked(date: string) {
    return blocked.some(b => b.blocked_date === date && b.full_day)
  }

  function isTimeBlocked(date: string, time: string) {
    return blocked.some(b => b.blocked_date === date && b.blocked_time === time + ':00')
  }

  function getBlockedCount(date: string) {
    return blocked.filter(b => b.blocked_date === date && !b.full_day).length
  }

  const firstDay = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const days: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) days.push(null)
  for (let i = 1; i <= daysInMonth; i++) days.push(i)

  function getDateStr(day: number) {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  const timeSlots: string[] = []
  for (let h = 8; h < 21; h++) {
    timeSlots.push(`${String(h).padStart(2, '0')}:00`)
    timeSlots.push(`${String(h).padStart(2, '0')}:30`)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5" />
          Gestionar Disponibilidad
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => { if (month === 1) { setMonth(12); setYear(year - 1) } else setMonth(month - 1) }}
            className="p-1 hover:bg-muted rounded"><ChevronLeft className="h-5 w-5" /></button>
          <h3 className="font-semibold">{MONTHS[month - 1]} {year}</h3>
          <button onClick={() => { if (month === 12) { setMonth(1); setYear(year + 1) } else setMonth(month + 1) }}
            className="p-1 hover:bg-muted rounded"><ChevronRight className="h-5 w-5" /></button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <>
            <div className="grid grid-cols-7 gap-1 mb-1">
              {DAYS.map(d => <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1 mb-4">
              {days.map((day, i) => {
                if (!day) return <div key={i} />
                const dateStr = getDateStr(day)
                const dayBlocked = isDayBlocked(dateStr)
                const blockedCount = getBlockedCount(dateStr)
                const isSelected = dateStr === selectedDate
                const isLoading = actionLoading === dateStr

                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                    className={`aspect-square flex flex-col items-center justify-center text-sm rounded-lg transition-all relative
                      ${dayBlocked ? 'bg-red-100 text-red-700 font-bold' : 'hover:bg-muted'}
                      ${isSelected ? 'ring-2 ring-navy' : ''}
                    `}
                  >
                    {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : day}
                    {blockedCount > 0 && !dayBlocked && (
                      <span className="absolute bottom-0.5 text-[8px] text-orange-500">{blockedCount}</span>
                    )}
                  </button>
                )
              })}
            </div>

            {selectedDate && (
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium">
                    {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                  {isDayBlocked(selectedDate) ? (
                    <Button size="sm" variant="outline" onClick={() => unblockDay(selectedDate)} className="text-green-600">
                      <Unlock className="h-3 w-3 mr-1" />Desbloquear dia
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => blockDay(selectedDate)} className="text-red-600">
                      <Lock className="h-3 w-3 mr-1" />Bloquear dia completo
                    </Button>
                  )}
                </div>

                {!isDayBlocked(selectedDate) && (
                  <div className="grid grid-cols-4 gap-1.5 max-h-[250px] overflow-y-auto">
                    {timeSlots.map(time => {
                      const timeBlocked = isTimeBlocked(selectedDate, time)
                      const isLoading = actionLoading === `${selectedDate}-${time}`
                      return (
                        <button
                          key={time}
                          onClick={() => timeBlocked ? unblockTime(selectedDate, time) : blockTime(selectedDate, time)}
                          disabled={isLoading}
                          className={`py-1.5 px-2 text-xs rounded-md border transition-all
                            ${timeBlocked ? 'bg-red-100 text-red-700 border-red-200 line-through' : 'hover:bg-green-50 border-green-200 text-green-700'}
                          `}
                        >
                          {isLoading ? <Loader2 className="h-3 w-3 animate-spin mx-auto" /> : time}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        <p className="text-xs text-muted-foreground mt-4">
          Haz clic en un dia para ver horarios. Rojo = bloqueado. Verde = disponible.
        </p>
      </CardContent>
    </Card>
  )
}
