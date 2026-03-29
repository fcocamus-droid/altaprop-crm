'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Calendar, ChevronDown, ChevronUp } from 'lucide-react'
import { VisitCalendar } from './visit-calendar'

export function VisitCalendarToggle({ propertyId, propertyTitle }: { propertyId: string; propertyTitle: string }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border-t pt-4">
      <Button
        variant="outline"
        className="w-full"
        size="lg"
        onClick={() => setOpen(!open)}
      >
        <Calendar className="mr-2 h-4 w-4" />
        Solicitar Orden de Visita
        {open ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />}
      </Button>
      {open && (
        <div className="mt-4 border rounded-lg p-4">
          <VisitCalendar propertyId={propertyId} propertyTitle={propertyTitle} />
        </div>
      )}
    </div>
  )
}
