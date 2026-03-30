'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/status-badge'
import { deleteApplication } from '@/lib/actions/applications'
import { formatDate } from '@/lib/utils'
import { FileText, ArrowRight, Trash2, Loader2 } from 'lucide-react'
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

  async function handleDelete(id: string, title: string) {
    if (!confirm(`¿Eliminar postulación a "${title}"? Esta acción no se puede deshacer.`)) return
    setDeleting(id)
    const result = await deleteApplication(id)
    if (!result.error) {
      setApplications(prev => prev.filter(a => a.id !== id))
    }
    setDeleting(null)
  }

  return (
    <div className="space-y-4">
      {applications.map((app) => (
        <Card key={app.id} className={deleting === app.id ? 'opacity-50' : ''}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-full bg-navy/10 flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5 text-navy" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold truncate">{app.property?.title || 'Propiedad'}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {!isApplicant && <span>{app.applicant?.full_name || 'Postulante'}</span>}
                    <span>{formatDate(app.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <StatusBadge status={app.status} type="application" />
                    {app.documents && <span className="text-xs text-muted-foreground">{app.documents.length} doc(s)</span>}
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
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/dashboard/postulaciones/${app.id}`}><ArrowRight className="h-4 w-4" /></Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
