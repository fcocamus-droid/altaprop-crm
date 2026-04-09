'use client'

import { useState } from 'react'
import { updateApplicationStatus } from '@/lib/actions/applications'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import {
  FileText, Download, CheckCircle, XCircle, Clock, User,
  Loader2, Building2, Phone, Calendar, MessageSquare, ArrowLeft, Eye, Mail
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any; description: string }> = {
  pending: { label: 'Pendiente', color: 'bg-yellow-50 border-yellow-200 text-yellow-800', icon: Clock, description: 'Esta postulación está pendiente de revisión.' },
  reviewing: { label: 'En Revisión', color: 'bg-blue-50 border-blue-200 text-blue-800', icon: Eye, description: 'Estamos evaluando la documentación del postulante.' },
  approved: { label: 'Aprobada', color: 'bg-green-50 border-green-200 text-green-800', icon: CheckCircle, description: 'El postulante cumple los requisitos. Proceder con firma de contrato.' },
  rejected: { label: 'Rechazada', color: 'bg-red-50 border-red-200 text-red-800', icon: XCircle, description: 'Esta postulación fue rechazada.' },
}

interface Props {
  application: any
  canManage: boolean
}

export function ApplicationDetail({ application: initialApp, canManage }: Props) {
  const [application, setApplication] = useState(initialApp)
  const [updating, setUpdating] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [pendingStatus, setPendingStatus] = useState<string | null>(null)
  const [emailMessage, setEmailMessage] = useState('')
  const router = useRouter()

  const EMAIL_TEMPLATES: Record<string, string> = {
    reviewing: 'Estimado(a) postulante,\n\nEstamos gestionando su solicitud. Revisaremos los antecedentes entregados y le notificaremos cuando tengamos una resolución.\n\nGracias por su paciencia.\n\nAltaprop - Gestión Inmobiliaria',
    approved: 'Estimado(a) postulante,\n\n¡Felicidades! Su postulación ha sido Aprobada.\n\nAhora pasaremos al proceso de revisión de contrato y firma digital para hacerle entrega de la propiedad.\n\nMuchas gracias por preferir nuestros servicios de gestión inmobiliaria.\n\nAltaprop - Gestión Inmobiliaria',
    rejected: 'Estimado(a) postulante,\n\nLamentablemente en esta oportunidad no ha sido seleccionado para esta propiedad.\n\nLo dejamos invitado si gusta a visitar y postular a otra de nuestras propiedades disponibles. Agradecemos su preferencia y esperamos poder ayudarlo a encontrar su próximo hogar lo antes posible.\n\nAltaprop - Gestión Inmobiliaria',
  }

  function openStatusChange(status: string) {
    setPendingStatus(status)
    setEmailMessage(EMAIL_TEMPLATES[status] || '')
  }

  async function confirmStatusChange() {
    if (!pendingStatus) return
    setUpdating(pendingStatus)
    setSuccessMsg('')

    const result = await updateApplicationStatus(application.id, pendingStatus)

    if (result.error) {
      alert(result.error)
    } else {
      setApplication((prev: any) => ({ ...prev, status: pendingStatus }))
      const labels: Record<string, string> = { reviewing: 'en revisión', approved: 'aprobada', rejected: 'rechazada', pending: 'pendiente' }
      setSuccessMsg(`Postulación marcada como ${labels[pendingStatus]}. Email enviado al postulante.`)
    }
    setUpdating('')
    setPendingStatus(null)
  }

  const st = STATUS_CONFIG[application.status] || STATUS_CONFIG.pending
  const StIcon = st.icon

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Volver
        </Button>
      </div>

      <PageHeader title="Gestión de Postulación" description={application.property?.title || ''} />

      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm mb-4 flex items-center gap-2">
          <Mail className="h-4 w-4" />{successMsg}
        </div>
      )}

      <div className={`border rounded-lg p-4 mb-6 flex items-center gap-3 ${st.color}`}>
        <StIcon className="h-6 w-6 flex-shrink-0" />
        <div><p className="font-semibold">{st.label}</p><p className="text-sm opacity-80">{st.description}</p></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Postulante */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><User className="h-5 w-5" /> Postulante</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gold/20 flex items-center justify-center">
                  <span className="font-bold text-navy text-xl">{application.applicant?.full_name?.[0]?.toUpperCase() || '?'}</span>
                </div>
                <div>
                  <p className="font-semibold text-lg">{application.applicant?.full_name || 'Sin nombre'}</p>
                  {application.applicant?.rut && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1"><FileText className="h-3 w-3" /> RUT: {application.applicant.rut}</p>
                  )}
                  {application.applicant?.phone && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" /> {application.applicant.phone}</p>
                  )}
                  {application.applicant_email && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" /> {application.applicant_email}</p>
                  )}
                  <p className="text-sm text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatDate(application.created_at)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Mensaje */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5" /> Mensaje</CardTitle></CardHeader>
            <CardContent>
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{application.message || 'Sin mensaje'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Documentos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" /> Documentos
                {application.documents?.length > 0 && <span className="text-xs font-normal bg-navy/10 text-navy px-2 py-0.5 rounded-full">{application.documents.length}</span>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {application.documents?.length > 0 ? (
                <div className="space-y-2">
                  {application.documents.map((doc: any) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-navy/10 rounded-lg flex items-center justify-center"><FileText className="h-5 w-5 text-navy" /></div>
                        <div><p className="text-sm font-medium">{doc.name}</p><p className="text-xs text-muted-foreground capitalize">{doc.type || 'documento'}</p></div>
                      </div>
                      <a href={doc.url} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm"><Download className="mr-2 h-3 w-3" /> Descargar</Button>
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Sin documentos adjuntos</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" /> Propiedad</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Link href={`/propiedades/${application.property?.id}`} className="text-sm font-semibold text-navy hover:underline block">{application.property?.title}</Link>
              {application.property?.address && <p className="text-xs text-muted-foreground">{application.property.address}, {application.property.city}</p>}
              <div className="flex gap-2 text-xs">
                <span className="bg-gold/10 text-gold px-2 py-1 rounded capitalize">{application.property?.operation}</span>
                <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded capitalize">{application.property?.type}</span>
              </div>
            </CardContent>
          </Card>

          {canManage && !pendingStatus && (
            <Card className="border-2 border-navy/20">
              <CardHeader><CardTitle className="text-base">Cambiar Estado</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {application.status !== 'pending' && (
                  <Button onClick={() => openStatusChange('pending')} disabled={!!updating} variant="outline" className="w-full justify-start border-yellow-200 text-yellow-700 hover:bg-yellow-50">
                    <Clock className="mr-2 h-4 w-4" /> Volver a Pendiente
                  </Button>
                )}
                {application.status !== 'reviewing' && (
                  <Button onClick={() => openStatusChange('reviewing')} disabled={!!updating} variant="outline" className="w-full justify-start border-blue-200 text-blue-700 hover:bg-blue-50">
                    <Eye className="mr-2 h-4 w-4" /> Marcar en Revisión
                  </Button>
                )}
                {application.status !== 'approved' && (
                  <Button onClick={() => openStatusChange('approved')} disabled={!!updating} className="w-full justify-start bg-green-600 hover:bg-green-700">
                    <CheckCircle className="mr-2 h-4 w-4" /> Aprobar
                  </Button>
                )}
                {application.status !== 'rejected' && (
                  <Button onClick={() => openStatusChange('rejected')} disabled={!!updating} variant="destructive" className="w-full justify-start">
                    <XCircle className="mr-2 h-4 w-4" /> Rechazar
                  </Button>
                )}
                <div className="border-t pt-3 mt-3">
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" /> Se enviará email al postulante.</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Email editor panel */}
          {canManage && pendingStatus && (
            <Card className="border-2 border-gold/40">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Notificación al Postulante
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className={`text-xs font-medium px-3 py-1.5 rounded-full inline-block ${
                  pendingStatus === 'reviewing' ? 'bg-blue-100 text-blue-700' :
                  pendingStatus === 'approved' ? 'bg-green-100 text-green-700' :
                  pendingStatus === 'rejected' ? 'bg-red-100 text-red-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {pendingStatus === 'reviewing' ? 'En Revisión' :
                   pendingStatus === 'approved' ? 'Aprobada' :
                   pendingStatus === 'rejected' ? 'Rechazada' : 'Pendiente'}
                </div>

                <div>
                  <label className="text-xs text-gray-500 block mb-1">Mensaje que recibirá el postulante:</label>
                  <textarea
                    value={emailMessage}
                    onChange={(e) => setEmailMessage(e.target.value)}
                    rows={8}
                    className="w-full border rounded-md px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={confirmStatusChange}
                    disabled={!!updating}
                    className="flex-1 bg-navy hover:bg-navy/90"
                    size="sm"
                  >
                    {updating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                    Confirmar y Enviar
                  </Button>
                  <Button
                    onClick={() => setPendingStatus(null)}
                    variant="outline"
                    size="sm"
                    disabled={!!updating}
                  >
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
