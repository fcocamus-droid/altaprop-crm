'use client'

import { useState } from 'react'
import { ApplicationList } from '@/components/applications/application-list'
import { ApplicantsDatabase } from '@/components/applications/applicants-database'
import { EmptyState } from '@/components/shared/empty-state'
import { FileText, Users } from 'lucide-react'

interface Props {
  applications: any[]
  showApplicantsTab: boolean
}

export function PostulacionesTabs({ applications, showApplicantsTab }: Props) {
  const [tab, setTab] = useState<'postulaciones' | 'postulantes'>('postulaciones')

  return (
    <div className="space-y-4">
      {showApplicantsTab && (
        <div className="flex gap-1 border-b">
          <button
            onClick={() => setTab('postulaciones')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === 'postulaciones'
                ? 'border-navy text-navy'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileText className="h-4 w-4" />
            Postulaciones
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === 'postulaciones' ? 'bg-navy text-white' : 'bg-muted'}`}>
              {applications.length}
            </span>
          </button>
          <button
            onClick={() => setTab('postulantes')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === 'postulantes'
                ? 'border-navy text-navy'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users className="h-4 w-4" />
            Base de Postulantes
          </button>
        </div>
      )}

      {tab === 'postulaciones' && (
        applications.length === 0 ? (
          <EmptyState
            title="No hay postulaciones"
            description="Las postulaciones a tus propiedades aparecerán aquí."
          />
        ) : (
          <ApplicationList applications={applications} isApplicant={false} />
        )
      )}

      {tab === 'postulantes' && (
        <ApplicantsDatabase />
      )}
    </div>
  )
}
