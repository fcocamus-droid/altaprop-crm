'use client'

import { useState, useEffect } from 'react'
import { ApplicationList } from '@/components/applications/application-list'
import { ApplicantsDatabase } from '@/components/applications/applicants-database'
import { FileText, Users } from 'lucide-react'

interface Props {
  applications: any[]
  showApplicantsTab: boolean
}

export function PostulacionesTabs({ applications, showApplicantsTab }: Props) {
  const [mainTab, setMainTab] = useState<'postulaciones' | 'postulantes'>('postulaciones')
  const [postulantesCount, setPostulantesCount] = useState<number | null>(null)

  useEffect(() => {
    if (showApplicantsTab) {
      fetch('/api/postulantes')
        .then(r => r.json())
        .then(data => { if (Array.isArray(data)) setPostulantesCount(data.length) })
        .catch(() => {})
    }
  }, [showApplicantsTab])

  return (
    <div className="space-y-4">
      {/* MAIN TABS: Postulaciones | Base de Postulantes */}
      {showApplicantsTab && (
        <div className="flex gap-1 border-b">
          <button
            onClick={() => setMainTab('postulaciones')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              mainTab === 'postulaciones'
                ? 'border-navy text-navy'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileText className="h-4 w-4" />
            Postulaciones
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${mainTab === 'postulaciones' ? 'bg-navy text-white' : 'bg-muted'}`}>
              {applications.length}
            </span>
          </button>
          <button
            onClick={() => setMainTab('postulantes')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              mainTab === 'postulantes'
                ? 'border-navy text-navy'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users className="h-4 w-4" />
            Base de Postulantes
            {postulantesCount !== null && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${mainTab === 'postulantes' ? 'bg-navy text-white' : 'bg-muted'}`}>
                {postulantesCount}
              </span>
            )}
          </button>
        </div>
      )}

      {mainTab === 'postulaciones' && (
        <ApplicationList applications={applications} isApplicant={false} />
      )}

      {mainTab === 'postulantes' && (
        <ApplicantsDatabase />
      )}
    </div>
  )
}
