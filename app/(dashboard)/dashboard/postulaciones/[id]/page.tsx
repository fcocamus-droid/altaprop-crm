'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/use-user'
import { updateApplicationStatus } from '@/lib/actions/applications'
import { isAdmin } from '@/lib/constants'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import { FileText, Download, CheckCircle, XCircle, Clock, User, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function PostulacionDetallePage({ params }: { params: { id: string } }) {
  const [application, setApplication] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState('')
  const { profile } = useUser()
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from('applications')
        .select('*, property:properties(id, title, address, city, owner_id), applicant:profiles!applications_applicant_id_fkey(id, full_name, phone), documents:application_documents(*)')
        .eq('id', params.id)
        .single()
      setApplication(data)
      setLoading(false)
    }
    load()
  }, [params.id])

  async function handleStatusChange(newStatus: string) {
    setUpdating(newStatus)
    await updateApplicationStatus(params.id, newStatus)
    setApplication((prev: any) => prev ? { ...prev, status: newStatus } : prev)
    setUpdating('')
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
  if (!application) return <div className="text-center py-12"><p>Postulacion no encontrada</p></div>

  const canManage = profile && (
    isAdmin(profile.role) ||
    profile.role === 'AGENTE' ||
    (application.property as any)?.owner_id === profile.id
  )

  return (
    <div>
      <PageHeader title="Detalle de Postulacion" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Informacion</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Estado</span>
              <StatusBadge status={application.status} type="application" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Propiedad</span>
              <Link href={`/propiedades/${application.property?.id}`} className="text-sm font-medium text-primary hover:underline">
                {application.property?.title}
              </Link>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Postulante</span>
              <span className="text-sm font-medium flex items-center gap-1"><User className="h-3 w-3" />{application.applicant?.full_name}</span>
            </div>
            {application.applicant?.phone && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Telefono</span>
                <span className="text-sm">{application.applicant.phone}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Fecha</span>
              <span className="text-sm">{formatDate(application.created_at)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Mensaje</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{application.message || 'Sin mensaje'}</p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader><CardTitle>Documentos</CardTitle></CardHeader>
          <CardContent>
            {application.documents && application.documents.length > 0 ? (
              <div className="space-y-2">
                {application.documents.map((doc: any) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-navy dark:text-gold" />
                      <div>
                        <p className="text-sm font-medium">{doc.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{doc.type || 'documento'}</p>
                      </div>
                    </div>
                    <a href={doc.url} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm"><Download className="mr-2 h-3 w-3" />Descargar</Button>
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sin documentos adjuntos</p>
            )}
          </CardContent>
        </Card>

        {canManage && application.status !== 'approved' && application.status !== 'rejected' && (
          <Card className="md:col-span-2">
            <CardHeader><CardTitle>Acciones</CardTitle></CardHeader>
            <CardContent className="flex gap-3">
              {application.status === 'pending' && (
                <Button onClick={() => handleStatusChange('reviewing')} disabled={!!updating} variant="outline">
                  {updating === 'reviewing' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Clock className="mr-2 h-4 w-4" />}
                  Marcar en Revision
                </Button>
              )}
              <Button onClick={() => handleStatusChange('approved')} disabled={!!updating} className="bg-green-600 hover:bg-green-700">
                {updating === 'approved' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                Aprobar
              </Button>
              <Button onClick={() => handleStatusChange('rejected')} disabled={!!updating} variant="destructive">
                {updating === 'rejected' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                Rechazar
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
