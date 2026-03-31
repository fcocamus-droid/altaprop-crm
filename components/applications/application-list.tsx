'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/status-badge'
import { deleteApplication, updateApplicationStatus } from '@/lib/actions/applications'
import { ApplicationDocuments } from '@/components/applications/application-documents'
import { formatDate } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { APPLICATION_STATUSES } from '@/lib/constants'
import { FileText, ChevronDown, ChevronUp, Trash2, Loader2, Search, ExternalLink } from 'lucide-react'
import Link from 'next/link'

interface ApplicationItem {
  id: string
  created_at: string
  status: string
  property?: { id: string; title: string } | null
  applicant?: { full_name: string; phone: string } | null
  documents?: any[]
}

export function ApplicationList({ applications: initial, isApplicant }: { applications: ApplicationItem[]; isApplicant: boolean }) {
  const [applications, setApplications] = useState(initial)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [docCounts, setDocCounts] = useState<Record<string, number>>({})

  async function handleDelete(id: string, title: string) {
    if (!confirm(`¿Eliminar postulación a "${title}"? Esta acción no se puede deshacer.`)) return
    setDeleting(id)
    const result = await deleteApplication(id)
    if (!result.error) {
      setApplications(prev => prev.filter(a => a.id !== id))
      if (expanded === id) setExpanded(null)
    }
    setDeleting(null)
  }

  function toggleExpand(id: string) {
    setExpanded(prev => prev === id ? null : id)
  }

  async function handleDocsComplete(id: string) {
    const app = applications.find(a => a.id === id)
    if (!app) return
    if (app.status === 'reviewing' || app.status === 'approved') return // already done
    const result = await updateApplicationStatus(id, 'reviewing')
    if (!result.error) {
      setApplications(prev => prev.map(a => a.id === id ? { ...a, status: 'reviewing' } : a))
    }
  }

  const filtered = applications.filter(app => {
    if (filterStatus !== 'all' && app.status !== filterStatus) return false
    if (search) {
      const q = search.toLowerCase()
      const title = (app.property?.title || '').toLowerCase()
      const name = ((app.applicant as any)?.full_name || '').toLowerCase()
      return title.includes(q) || name.includes(q)
    }
    return true
  })

  return (
    <div className="space-y-4">
      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por propiedad o postulante..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[{ value: 'all', label: 'Todas', color: '' }, ...APPLICATION_STATUSES].map((s) => (
            <button
              key={s.value}
              onClick={() => setFilterStatus(s.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap ${
                filterStatus === s.value
                  ? s.value === 'all'
                    ? 'bg-navy text-white border-navy'
                    : `${s.color} border-current ring-1 ring-offset-1`
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 && applications.length > 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Search className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p className="font-medium">No se encontraron postulaciones</p>
          <p className="text-sm">Prueba con otro término o filtro</p>
        </div>
      )}

      {filtered.map((app) => {
        const isExpanded = expanded === app.id
        return (
          <Card key={app.id} className={`transition-all ${deleting === app.id ? 'opacity-50' : ''} ${isExpanded ? 'ring-2 ring-navy/20' : ''}`}>
            <CardContent className="p-4">
              {/* Header row */}
              <div className="flex items-center justify-between">
                <div
                  className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer"
                  onClick={() => toggleExpand(app.id)}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${isExpanded ? 'bg-navy text-white' : 'bg-navy/10 text-navy'}`}>
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    {app.property?.id ? (
                      <Link
                        href={`/propiedades/${app.property.id}`}
                        target="_blank"
                        onClick={e => e.stopPropagation()}
                        className="inline-flex items-center gap-1 font-semibold truncate hover:text-navy hover:underline"
                      >
                        {app.property.title || 'Propiedad'}
                        <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                      </Link>
                    ) : (
                      <h3 className="font-semibold truncate">Propiedad</h3>
                    )}
                    {!isApplicant && app.applicant?.full_name && (
                      <p className="text-sm text-navy font-medium">{app.applicant.full_name}</p>
                    )}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{formatDate(app.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {!isApplicant ? (
                        <select
                          value={app.status}
                          onChange={async (e) => {
                            e.stopPropagation()
                            const newStatus = e.target.value
                            setApplications(prev => prev.map(a => a.id === app.id ? { ...a, status: newStatus } : a))
                            await updateApplicationStatus(app.id, newStatus)
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className={`text-xs font-medium px-2.5 py-1 rounded-full border cursor-pointer ${
                            app.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                            app.status === 'reviewing' ? 'bg-green-100 text-green-800 border-green-200' :
                            app.status === 'approved' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                            app.status === 'rejected' ? 'bg-red-100 text-red-800 border-red-200' :
                            'bg-gray-100 text-gray-800 border-gray-200'
                          }`}
                        >
                          {APPLICATION_STATUSES.map(s => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                          ))}
                        </select>
                      ) : (
                        <StatusBadge status={app.status} type="application" />
                      )}
                      <span className="text-xs text-muted-foreground">{docCounts[app.id] ?? app.documents?.length ?? 0} doc(s)</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {isApplicant && app.status === 'pending' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(app.id, app.property?.title || 'esta propiedad')}
                      disabled={deleting === app.id}
                      className="text-red-400 hover:text-red-600 hover:bg-red-50"
                    >
                      {deleting === app.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleExpand(app.id)}
                    className={isExpanded ? 'text-navy' : ''}
                  >
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* Expanded documents section */}
              {isExpanded && (
                <div className="mt-4 pt-4 border-t">
                  <ApplicationDocuments
                    applicationId={app.id}
                    readOnly={!isApplicant}
                    onAllDocsUploaded={() => handleDocsComplete(app.id)}
                    onDocCountChange={(count) => setDocCounts(prev => ({ ...prev, [app.id]: count }))}
                    onStatusChange={(status) => setApplications(prev => prev.map(a => a.id === app.id ? { ...a, status } : a))}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
