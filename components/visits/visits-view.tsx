'use client'

import { useState } from 'react'
import { List, CalendarDays } from 'lucide-react'
import { VisitList } from './visit-list'
import { MonthlyVisitCalendar } from './monthly-visit-calendar'

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

interface VisitsViewProps {
  visits: Visit[]
  properties: Property[]
  canCreate: boolean
}

export function VisitsView({ visits, properties, canCreate }: VisitsViewProps) {
  const [view, setView] = useState<'list' | 'calendar'>('list')

  return (
    <div className="space-y-4">
      {/* View toggle */}
      <div className="flex justify-end">
        <div className="flex items-center rounded-lg border bg-white p-1 gap-0.5 shadow-sm">
          <button
            type="button"
            onClick={() => setView('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${
              view === 'list'
                ? 'bg-navy text-white shadow-sm'
                : 'text-muted-foreground hover:text-navy hover:bg-navy/5'
            }`}
          >
            <List className="h-3.5 w-3.5" />
            Lista
          </button>
          <button
            type="button"
            onClick={() => setView('calendar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${
              view === 'calendar'
                ? 'bg-navy text-white shadow-sm'
                : 'text-muted-foreground hover:text-navy hover:bg-navy/5'
            }`}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Calendario
          </button>
        </div>
      </div>

      {/* Content */}
      {view === 'list' ? (
        <VisitList visits={visits} properties={properties} canCreate={canCreate} />
      ) : (
        <MonthlyVisitCalendar visits={visits} />
      )}
    </div>
  )
}
