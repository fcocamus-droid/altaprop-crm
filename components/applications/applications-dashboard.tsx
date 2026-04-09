'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/status-badge'
import { EmptyState } from '@/components/shared/empty-state'
import { formatDate } from '@/lib/utils'
import { deleteApplication, archiveApplication } from '@/lib/actions/applications'
import { FileText, ArrowRight, Building2, ChevronDown, Trash2, Archive, ArchiveRestore, Inbox } from 'lucide-react'

interface PropertyOption {
  id: string
  title: string
  city?: string
  _count?: number
}

interface ApplicationItem {
  id: string
  status: string
  created_at: string
  message?: string
  archived?: boolean
  property?: { id: string; title: string }
  applicant?: { full_name: string; phone: string }
  documents?: { id: string }[]
}

interface Props {
  applications: ApplicationItem[]
  properties: PropertyOption[]
  isApplicant: boolean
}

export function ApplicationsDashboard({ applications: allApplications, properties, isApplicant }: Props) {
  const [selectedProperty, setSelectedProperty] = useState<string>('all')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [archiving, setArchiving] = useState<string | null>(null)
  const router = useRouter()
  const [tab, setTab] = useState<'active' | 'archived'>('active')
  const [localArchived, setLocalArchived] = useState<Set<string>>(
    new Set(allApplications.filter(a => a.archived).map(a => a.id))
  )

  // Split by archived status (using local state for instant UI)
  const activeApps = allApplications.filter(a => !localArchived.has(a.id))
  const archivedApps = allApplications.filter(a => localArchived.has(a.id))
  const applications = tab === 'active' ? activeApps : archivedApps

  const filtered = selectedProperty === 'all'
    ? applications
    : applications.filter(app => app.property?.id === selectedProperty)

  // Count applications per property (only active)
  const propertyCounts = new Map<string, number>()
  applications.forEach(app => {
    const pid = app.property?.id
    if (pid) propertyCounts.set(pid, (propertyCounts.get(pid) || 0) + 1)
  })

  const selectedLabel = selectedProperty === 'all'
    ? `Todas las propiedades (${applications.length})`
    : properties.find(p => p.id === selectedProperty)?.title || 'Seleccionar'

  const statusCounts = {
    total: filtered.length,
    pending: filtered.filter(a => a.status === 'pending').length,
    reviewing: filtered.filter(a => a.status === 'reviewing').length,
    approved: filtered.filter(a => a.status === 'approved').length,
    rejected: filtered.filter(a => a.status === 'rejected').length,
  }

  return (
    <div className="space-y-4">
      {/* Tabs: Activas / Archivadas */}
      {!isApplicant && (
        <div className="flex items-center gap-1 border-b">
          <button
            onClick={() => setTab('active')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === 'active' ? 'border-navy text-navy' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Inbox className="h-4 w-4" />
            Activas
            <span className={`text-xs rounded-full px-1.5 py-0.5 ${tab === 'active' ? 'bg-navy/10' : 'bg-gray-100'}`}>{activeApps.length}</span>
          </button>
          <button
            onClick={() => setTab('archived')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === 'archived' ? 'border-navy text-navy' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Archive className="h-4 w-4" />
            Archivadas
            <span className={`text-xs rounded-full px-1.5 py-0.5 ${tab === 'archived' ? 'bg-navy/10' : 'bg-gray-100'}`}>{archivedApps.length}</span>
          </button>
        </div>
      )}

      {/* Property Dropdown Selector */}
      {!isApplicant && properties.length > 0 && (
        <div className="relative">
          {/* Dropdown trigger */}
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-full flex items-center justify-between px-4 py-3 bg-white border rounded-lg shadow-sm hover:border-navy/40 transition-colors"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Building2 className="h-4 w-4 text-navy flex-shrink-0" />
              <span className="font-medium text-navy truncate">{selectedLabel}</span>
              {selectedProperty !== 'all' && (
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  · {propertyCounts.get(selectedProperty) || 0} postulaciones
                </span>
              )}
            </div>
            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown menu */}
          {dropdownOpen && (
            <>
              {/* Backdrop to close */}
              <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />

              <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-20 max-h-72 overflow-y-auto">
                {/* All option */}
                <button
                  onClick={() => { setSelectedProperty('all'); setDropdownOpen(false) }}
                  className={`w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-gray-50 transition-colors border-b ${
                    selectedProperty === 'all' ? 'bg-navy/5 font-semibold text-navy' : 'text-gray-700'
                  }`}
                >
                  <span>Todas las propiedades</span>
                  <span className="text-xs bg-gray-100 rounded-full px-2 py-0.5">
                    {applications.length} postulaciones
                  </span>
                </button>

                {/* Property options */}
                {properties.map(prop => {
                  const count = propertyCounts.get(prop.id) || 0
                  const isSelected = selectedProperty === prop.id
                  return (
                    <button
                      key={prop.id}
                      onClick={() => { setSelectedProperty(prop.id); setDropdownOpen(false) }}
                      className={`w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-gray-50 transition-colors ${
                        isSelected ? 'bg-navy/5 font-semibold text-navy' : 'text-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Building2 className="h-4 w-4 flex-shrink-0 text-gray-400" />
                        <span className="truncate">{prop.title}</span>
                        {prop.city && (
                          <span className="text-xs text-muted-foreground flex-shrink-0">· {prop.city}</span>
                        )}
                      </div>
                      <span className={`text-xs rounded-full px-2 py-0.5 flex-shrink-0 ${
                        count > 0 ? 'bg-gold/10 text-gold font-medium' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {count}
                      </span>
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {/* Status summary */}
          {statusCounts.total > 0 && (
            <div className="flex items-center gap-4 mt-2 px-1 text-xs text-muted-foreground">
              <span className="font-medium text-navy">{statusCounts.total} postulaciones</span>
              {statusCounts.pending > 0 && (
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400" />{statusCounts.pending} pendientes</span>
              )}
              {statusCounts.reviewing > 0 && (
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400" />{statusCounts.reviewing} en revisión</span>
              )}
              {statusCounts.approved > 0 && (
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400" />{statusCounts.approved} aprobadas</span>
              )}
              {statusCounts.rejected > 0 && (
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" />{statusCounts.rejected} rechazadas</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Applications List */}
      {filtered.length === 0 ? (
        <EmptyState
          title={isApplicant ? 'No tienes postulaciones' : selectedProperty === 'all' ? 'No hay postulaciones' : 'Sin postulaciones para esta propiedad'}
          description={isApplicant ? 'Explora propiedades disponibles y postula.' : 'Las postulaciones apareceran aqui.'}
        >
          {isApplicant && (
            <Button asChild><Link href="/propiedades">Explorar Propiedades</Link></Button>
          )}
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {filtered.map((app) => (
            <Card key={app.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-navy/10 flex items-center justify-center shrink-0">
                      <FileText className="h-5 w-5 text-navy" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold truncate">{app.property?.title || 'Propiedad'}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {!isApplicant && <span className="font-medium">{app.applicant?.full_name || 'Postulante'}</span>}
                        {!isApplicant && app.applicant?.phone && (
                          <span className="text-xs">· {app.applicant.phone}</span>
                        )}
                        <span className="text-xs">{formatDate(app.created_at)}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <StatusBadge status={app.status} type="application" />
                        {app.documents && app.documents.length > 0 && (
                          <span className="text-xs text-muted-foreground">{app.documents.length} doc(s)</span>
                        )}
                        {app.message && (
                          <span className="text-xs text-muted-foreground truncate max-w-[200px]">&ldquo;{app.message}&rdquo;</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isApplicant && app.property?.id && (
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/propiedades/${app.property.id}`}>
                          Ver Propiedad <ArrowRight className="ml-1 h-3 w-3" />
                        </Link>
                      </Button>
                    )}
                    {!isApplicant && (
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/dashboard/postulaciones/${app.id}`}>
                          Ver <ArrowRight className="ml-1 h-3 w-3" />
                        </Link>
                      </Button>
                    )}
                    {!isApplicant && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={archiving === app.id}
                        onClick={async () => {
                          const isArchived = localArchived.has(app.id)
                          setArchiving(app.id)
                          setLocalArchived(prev => {
                            const next = new Set(prev)
                            isArchived ? next.delete(app.id) : next.add(app.id)
                            return next
                          })
                          await archiveApplication(app.id, !isArchived)
                          setArchiving(null)
                        }}
                        className={tab === 'archived'
                          ? 'text-blue-500 border-blue-200 hover:bg-blue-50'
                          : 'text-gray-500 border-gray-200 hover:bg-gray-50'}
                        title={tab === 'archived' ? 'Restaurar' : 'Archivar'}
                      >
                        {tab === 'archived' ? <ArchiveRestore className="h-3 w-3" /> : <Archive className="h-3 w-3" />}
                      </Button>
                    )}
                    {!isApplicant && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={deleting === app.id}
                        onClick={async () => {
                          if (!confirm('¿Eliminar esta postulación? Esta acción no se puede deshacer.')) return
                          setDeleting(app.id)
                          const result = await deleteApplication(app.id)
                          if (result.error) {
                            alert('Error: ' + result.error)
                            setDeleting(null)
                            return
                          }
                          setDeleting(null)
                          router.refresh()
                        }}
                        className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
