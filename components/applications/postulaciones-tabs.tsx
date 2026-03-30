'use client'

import { useState, useEffect } from 'react'
import { ApplicationList } from '@/components/applications/application-list'
import { ApplicantsDatabase } from '@/components/applications/applicants-database'
import { EmptyState } from '@/components/shared/empty-state'
import { FileText, Users, Clock, CheckCircle, FileCheck, XCircle } from 'lucide-react'

interface Props {
  applications: any[]
  showApplicantsTab: boolean
}

export function PostulacionesTabs({ applications, showApplicantsTab }: Props) {
  const [mainTab, setMainTab] = useState<'postulaciones' | 'postulantes'>('postulaciones')
  const [stageTab, setStageTab] = useState<'pending' | 'reviewing' | 'approved' | 'rejected'>('pending')
  const [postulantesCount, setPostulantesCount] = useState<number | null>(null)

  useEffect(() => {
    if (showApplicantsTab) {
      fetch('/api/postulantes')
        .then(r => r.json())
        .then(data => { if (Array.isArray(data)) setPostulantesCount(data.length) })
        .catch(() => {})
    }
  }, [showApplicantsTab])

  const pendingApps = applications.filter(a => a.status === 'pending')
  const reviewingApps = applications.filter(a => a.status === 'reviewing')
  const approvedApps = applications.filter(a => a.status === 'approved')
  const rejectedApps = applications.filter(a => a.status === 'rejected')

  const stageApps = stageTab === 'pending' ? pendingApps
    : stageTab === 'reviewing' ? reviewingApps
    : stageTab === 'approved' ? approvedApps
    : rejectedApps

  const stages = [
    { key: 'pending' as const, label: 'Pendientes', icon: Clock, count: pendingApps.length, color: 'text-yellow-600', bgActive: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
    { key: 'reviewing' as const, label: 'Docs. Listos', icon: FileCheck, count: reviewingApps.length, color: 'text-green-600', bgActive: 'bg-green-100 text-green-800 border-green-300' },
    { key: 'approved' as const, label: 'Aprobadas', icon: CheckCircle, count: approvedApps.length, color: 'text-emerald-600', bgActive: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    { key: 'rejected' as const, label: 'Rechazadas', icon: XCircle, count: rejectedApps.length, color: 'text-red-500', bgActive: 'bg-red-100 text-red-800 border-red-300' },
  ]

  const emptyMessages: Record<string, { title: string; desc: string }> = {
    pending: { title: 'Sin postulaciones pendientes', desc: 'Todas las postulaciones han sido procesadas' },
    reviewing: { title: 'Sin documentos listos', desc: 'Los postulantes aún no han completado sus documentos' },
    approved: { title: 'Sin postulaciones aprobadas', desc: 'Las postulaciones aprobadas aparecerán aquí' },
    rejected: { title: 'Sin postulaciones rechazadas', desc: 'Las postulaciones rechazadas se archivarán aquí' },
  }

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
        <>
          {/* STAGE TABS */}
          <div className="flex gap-2 flex-wrap">
            {stages.map(stage => (
              <button
                key={stage.key}
                onClick={() => setStageTab(stage.key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                  stageTab === stage.key
                    ? stage.bgActive
                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                }`}
              >
                <stage.icon className={`h-3.5 w-3.5 ${stageTab === stage.key ? '' : stage.color}`} />
                {stage.label}
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  stageTab === stage.key ? 'bg-white/50' : 'bg-muted'
                }`}>
                  {stage.count}
                </span>
              </button>
            ))}
          </div>

          {/* LIST */}
          {stageApps.length === 0 ? (
            <EmptyState
              title={emptyMessages[stageTab].title}
              description={emptyMessages[stageTab].desc}
            />
          ) : (
            <ApplicationList applications={stageApps} isApplicant={false} />
          )}
        </>
      )}

      {mainTab === 'postulantes' && (
        <ApplicantsDatabase />
      )}
    </div>
  )
}
