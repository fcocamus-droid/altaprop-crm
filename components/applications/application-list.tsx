'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/status-badge'
import { deleteApplication, updateApplicationStatus, approveApplication, finalizeApplicationStatus } from '@/lib/actions/applications'
import { ApplicationDocuments } from '@/components/applications/application-documents'
import { formatDate } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { APPLICATION_STATUSES } from '@/lib/constants'
import { FileText, ChevronDown, ChevronUp, Trash2, Loader2, Search, ExternalLink, CheckCircle2, XCircle, Home, Clock, FolderOpen, ThumbsDown, User, Key, Trophy, Landmark, Download, CreditCard } from 'lucide-react'
import Link from 'next/link'
import { PaymentPanel } from '@/components/applications/payment-panel'
import { InventoryPanel } from '@/components/applications/inventory-panel'
import { RentalContract } from '@/components/applications/rental-contract'
import { CommissionPayment } from '@/components/applications/commission-payment'
import { OtherServicesPayment } from '@/components/applications/other-services-payment'
import { AgencyBankPanel } from '@/components/applications/agency-bank-panel'

interface ApplicationItem {
  id: string
  property_id?: string
  created_at: string
  status: string
  property?: { id: string; title: string; price?: number | null; currency?: string | null; operation?: string | null } | null
  applicant?: { full_name: string; phone: string } | null
  documents?: any[]
  rental_contract_url?: string | null
  rental_contract_name?: string | null
  commission_amount?: number | null
  commission_paid_applicant?: boolean
  commission_paid_owner?: boolean
}

type StageTab = 'all' | 'pending' | 'reviewing' | 'approved' | 'rejected' | 'rented' | 'sold'

const STAGE_TABS: { value: StageTab; label: string; icon: React.ReactNode; activeClass: string }[] = [
  { value: 'all',       label: 'Todas',        icon: <FileText className="h-3.5 w-3.5" />,     activeClass: 'border-navy text-navy' },
  { value: 'pending',   label: 'Pendientes',   icon: <Clock className="h-3.5 w-3.5" />,        activeClass: 'border-yellow-500 text-yellow-700' },
  { value: 'reviewing', label: 'Docs. Listos', icon: <FolderOpen className="h-3.5 w-3.5" />,   activeClass: 'border-green-500 text-green-700' },
  { value: 'approved',  label: 'Aprobadas',    icon: <CheckCircle2 className="h-3.5 w-3.5" />, activeClass: 'border-emerald-600 text-emerald-700' },
  { value: 'rented',    label: 'Arrendadas',   icon: <Key className="h-3.5 w-3.5" />,          activeClass: 'border-blue-500 text-blue-700' },
  { value: 'sold',      label: 'Vendidas',     icon: <Trophy className="h-3.5 w-3.5" />,       activeClass: 'border-purple-500 text-purple-700' },
  { value: 'rejected',  label: 'Rechazadas',   icon: <ThumbsDown className="h-3.5 w-3.5" />,   activeClass: 'border-red-500 text-red-600' },
]

const BADGE_CLASS: Record<string, string> = {
  all:       'bg-navy text-white',
  pending:   'bg-yellow-100 text-yellow-800',
  reviewing: 'bg-green-100 text-green-800',
  approved:  'bg-emerald-100 text-emerald-800',
  rented:    'bg-blue-100 text-blue-800',
  sold:      'bg-purple-100 text-purple-800',
  rejected:  'bg-red-100 text-red-800',
}

export function ApplicationList({ applications: initial, isApplicant, userRole }: { applications: ApplicationItem[]; isApplicant: boolean; userRole?: string }) {
  const [applications, setApplications] = useState(initial)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [stageTab, setStageTab] = useState<StageTab>('all')
  const [docCounts, setDocCounts] = useState<Record<string, number>>({})
  const [pendingApproval, setPendingApproval] = useState<string | null>(null)
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [savingStatus, setSavingStatus] = useState<string | null>(null)  // app id being saved
  const [statusError, setStatusError] = useState<string | null>(null)    // app id that failed
  // Rental contract state (url/name per application id)
  const [contracts, setContracts] = useState<Record<string, { url: string | null; name: string | null }>>(() => {
    const map: Record<string, { url: string | null; name: string | null }> = {}
    initial.forEach(a => {
      if (a.rental_contract_url) {
        map[a.id] = { url: a.rental_contract_url, name: a.rental_contract_name || null }
      }
    })
    return map
  })

  // Sync when parent passes updated props (e.g. after server refresh)
  useEffect(() => {
    setApplications(initial)
  }, [initial])

  async function handleDelete(id: string, title: string, applicantName?: string) {
    const who = applicantName ? `de ${applicantName} ` : ''
    const msg = isApplicant
      ? `¿Retirar tu postulación a "${title}"?\n\nEsta acción no se puede deshacer.`
      : `¿Eliminar la postulación ${who}a "${title}"?\n\nEsta acción no se puede deshacer.`
    if (!confirm(msg)) return
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
    if (app.status === 'reviewing' || app.status === 'approved') return
    const result = await updateApplicationStatus(id, 'reviewing')
    if (!result.error) {
      setApplications(prev => prev.map(a => a.id === id ? { ...a, status: 'reviewing' } : a))
    }
  }

  async function handleApprove(appId: string) {
    setApprovingId(appId)
    const result = await approveApplication(appId)
    if (!result.error) {
      const targetPropertyId = applications.find(a => a.id === appId)?.property_id ||
                               applications.find(a => a.id === appId)?.property?.id
      setApplications(prev => prev.map(a => {
        if (a.id === appId) return { ...a, status: 'approved' }
        const aPropertyId = a.property_id || a.property?.id
        if (aPropertyId === targetPropertyId && (a.status === 'pending' || a.status === 'reviewing')) {
          return { ...a, status: 'rejected' }
        }
        return a
      }))
      setPendingApproval(null)
    }
    setApprovingId(null)
  }

  // Counts per stage
  const counts: Record<StageTab, number> = {
    all:       applications.length,
    pending:   applications.filter(a => a.status === 'pending').length,
    reviewing: applications.filter(a => a.status === 'reviewing').length,
    approved:  applications.filter(a => a.status === 'approved').length,
    rented:    applications.filter(a => a.status === 'rented').length,
    sold:      applications.filter(a => a.status === 'sold').length,
    rejected:  applications.filter(a => a.status === 'rejected').length,
  }

  const filtered = applications.filter(app => {
    if (stageTab !== 'all' && app.status !== stageTab) return false
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
      {/* STAGE TABS */}
      <div className="flex gap-0 border-b overflow-x-auto">
        {STAGE_TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => setStageTab(tab.value)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              stageTab === tab.value
                ? tab.activeClass
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.icon}
            {tab.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ml-0.5 ${
              stageTab === tab.value ? BADGE_CLASS[tab.value] : 'bg-muted text-muted-foreground'
            }`}>
              {counts[tab.value]}
            </span>
          </button>
        ))}
      </div>

      {/* SEARCH */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por propiedad o postulante..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* EMPTY STATES */}
      {filtered.length === 0 && applications.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">No hay postulaciones aún</p>
        </div>
      )}

      {filtered.length === 0 && applications.length > 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Search className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p className="font-medium">Sin resultados en esta categoría</p>
          <p className="text-sm">Prueba buscando o cambia la pestaña</p>
        </div>
      )}

      {/* APPLICATION CARDS */}
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
                  <div className="min-w-0 flex-1">
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
                      <p className="flex items-center gap-1 text-sm font-semibold text-navy">
                        <User className="h-3.5 w-3.5 shrink-0 opacity-70" />
                        {app.applicant.full_name}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{formatDate(app.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {!isApplicant && userRole !== 'PROPIETARIO' ? (
                        // Admin/Agente — full editable dropdown for ALL statuses (can always correct mistakes)
                        <div className="relative flex items-center gap-1">
                          <select
                            value={app.status}
                            disabled={savingStatus === app.id}
                            onChange={async (e) => {
                              e.stopPropagation()
                              const newStatus = e.target.value
                              setStatusError(null)
                              // Approve → confirmation panel (side effects: reserve property, reject others)
                              if (newStatus === 'approved') {
                                if (!isExpanded) setExpanded(app.id)
                                setPendingApproval(app.id)
                                return
                              }
                              // All transitions — wait for DB confirmation before updating UI
                              setSavingStatus(app.id)
                              let result: { error?: string; success?: boolean }
                              if (newStatus === 'rented' || newStatus === 'sold') {
                                const propertyId = app.property_id || app.property?.id || ''
                                result = await finalizeApplicationStatus(app.id, propertyId, newStatus as 'rented' | 'sold')
                              } else {
                                result = await updateApplicationStatus(app.id, newStatus)
                              }
                              setSavingStatus(null)
                              if (result.error) {
                                setStatusError(app.id)
                                setTimeout(() => setStatusError(null), 3000)
                              } else {
                                setApplications(prev => prev.map(a => a.id === app.id ? { ...a, status: newStatus } : a))
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className={`text-xs font-medium px-2.5 py-1 rounded-full border cursor-pointer ${
                              savingStatus === app.id ? 'opacity-50 cursor-wait' : ''
                            } ${
                              app.status === 'pending'   ? 'bg-amber-100 text-amber-800 border-amber-300' :
                              app.status === 'reviewing' ? 'bg-sky-100 text-sky-800 border-sky-300' :
                              app.status === 'approved'  ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                              app.status === 'rejected'  ? 'bg-rose-100 text-rose-800 border-rose-300' :
                              app.status === 'rented'    ? 'bg-blue-100 text-blue-800 border-blue-300' :
                              app.status === 'sold'      ? 'bg-violet-100 text-violet-800 border-violet-300' :
                              'bg-gray-100 text-gray-800 border-gray-200'
                            }`}
                          >
                            <option value="pending">⏳ Pendiente</option>
                            <option value="reviewing">📂 Docs. Listos</option>
                            <option value="approved">✅ Aprobada</option>
                            <option value="rejected">❌ Rechazada</option>
                            <option value="rented">🔑 Arrendada</option>
                            <option value="sold">🏆 Vendida</option>
                          </select>
                          {savingStatus === app.id && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground shrink-0" />}
                          {statusError === app.id && <span className="text-xs text-red-500 font-medium">Error al guardar</span>}
                        </div>
                      ) : (
                        // Read-only badge — applicant and propietario view
                        <StatusBadge status={app.status} type="application" />
                      )}
                      <span className="text-xs text-muted-foreground">{docCounts[app.id] ?? app.documents?.length ?? 0} doc(s)</span>
                      {/* Contract download pill — visible in compact bar when contract exists */}
                      {contracts[app.id]?.url && (
                        <a
                          href={contracts[app.id].url!}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-full transition-colors"
                          title={contracts[app.id].name || 'Contrato de arriendo'}
                        >
                          <Download className="h-3 w-3" />
                          Contrato
                        </a>
                      )}
                      {/* Commission payment pill — visible when rented or sold */}
                      {['rented', 'sold'].includes(app.status) && (
                        <button
                          onClick={(e) => { e.stopPropagation(); if (!isExpanded) setExpanded(app.id) }}
                          className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border transition-colors ${
                            app.commission_paid_applicant && app.commission_paid_owner
                              ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                              : 'text-orange-700 bg-orange-50 border-orange-200 hover:bg-orange-100'
                          }`}
                          title="Pago de comisión"
                        >
                          {app.commission_paid_applicant && app.commission_paid_owner
                            ? <><CheckCircle2 className="h-3 w-3" /> Comisión</>
                            : <><CreditCard className="h-3 w-3" /> Comisión</>
                          }
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {/* Applicant self-delete — allowed except for approved/rented/sold */}
                  {isApplicant && !['approved','rented','sold'].includes(app.status) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); handleDelete(app.id, app.property?.title || 'esta propiedad') }}
                      disabled={deleting === app.id}
                      title="Retirar postulación"
                      className="text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      {deleting === app.id ? <Loader2 className="h-4 w-4 animate-spin text-red-400" /> : <Trash2 className="h-4 w-4" />}
                    </Button>
                  )}
                  {/* Admin delete button */}
                  {!isApplicant && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); handleDelete(app.id, app.property?.title || 'esta propiedad', (app.applicant as any)?.full_name) }}
                      disabled={deleting === app.id}
                      title="Eliminar postulación"
                      className="text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      {deleting === app.id ? <Loader2 className="h-4 w-4 animate-spin text-red-400" /> : <Trash2 className="h-4 w-4" />}
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
                <div className="mt-4 pt-4 border-t space-y-4">
                  <ApplicationDocuments
                    applicationId={app.id}
                    readOnly={!isApplicant}
                    onAllDocsUploaded={() => handleDocsComplete(app.id)}
                    onDocCountChange={(count) => setDocCounts(prev => ({ ...prev, [app.id]: count }))}
                    onStatusChange={(status) => setApplications(prev => prev.map(a => a.id === app.id ? { ...a, status } : a))}
                  />

                  {/* APPROVE BUTTON — hidden for finalized applications */}
                  {!isApplicant && !['approved','rejected','rented','sold'].includes(app.status) && (
                    <div className="pt-3 border-t">
                      {pendingApproval !== app.id ? (
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                          onClick={() => setPendingApproval(app.id)}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Aprobar Postulante y Reservar Propiedad
                        </Button>
                      ) : (
                        <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-4 space-y-3">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                            <p className="font-semibold text-emerald-900">Confirmar Aprobación</p>
                          </div>
                          <p className="text-sm text-emerald-800">
                            Estás aprobando a <strong>{app.applicant?.full_name || 'este postulante'}</strong> para la propiedad <strong>{app.property?.title || 'seleccionada'}</strong>.
                          </p>
                          <div className="space-y-1.5 text-sm">
                            <div className="flex items-center gap-2 text-emerald-700">
                              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                              <span>La postulación pasará a <strong>Aprobada</strong></span>
                            </div>
                            <div className="flex items-center gap-2 text-amber-700">
                              <Home className="h-3.5 w-3.5 shrink-0" />
                              <span>La propiedad cambiará de <strong>Disponible → Reservada</strong></span>
                            </div>
                            <div className="flex items-center gap-2 text-red-600">
                              <XCircle className="h-3.5 w-3.5 shrink-0" />
                              <span>Las demás postulaciones pendientes serán <strong>Rechazadas</strong></span>
                            </div>
                          </div>
                          <div className="flex gap-2 pt-1">
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white"
                              disabled={approvingId === app.id}
                              onClick={() => handleApprove(app.id)}
                            >
                              {approvingId === app.id
                                ? <><Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />Aprobando...</>
                                : <><CheckCircle2 className="mr-1 h-3.5 w-3.5" />Confirmar Aprobación</>
                              }
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={approvingId === app.id}
                              onClick={() => setPendingApproval(null)}
                            >
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* APPROVED BADGE */}
                  {!isApplicant && app.status === 'approved' && (
                    <div className="pt-3 border-t flex items-center gap-2 text-emerald-700 bg-emerald-50 rounded-lg p-3">
                      <CheckCircle2 className="h-5 w-5 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold">Postulante Aprobado</p>
                        <p className="text-xs text-emerald-600">La propiedad fue reservada para {app.applicant?.full_name || 'este postulante'}</p>
                      </div>
                    </div>
                  )}

                  {/* RENTED BADGE */}
                  {app.status === 'rented' && (
                    <div className="pt-3 border-t flex items-center gap-2 text-blue-700 bg-blue-50 rounded-lg p-3">
                      <Key className="h-5 w-5 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold">Arriendo Confirmado</p>
                        <p className="text-xs text-blue-600">
                          {isApplicant ? 'Tu arriendo fue confirmado exitosamente.' : `La propiedad fue arrendada a ${app.applicant?.full_name || 'este postulante'}.`}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* SOLD BADGE */}
                  {app.status === 'sold' && (
                    <div className="pt-3 border-t flex items-center gap-2 text-purple-700 bg-purple-50 rounded-lg p-3">
                      <Trophy className="h-5 w-5 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold">Venta Confirmada</p>
                        <p className="text-xs text-purple-600">
                          {isApplicant ? 'Tu compra fue confirmada exitosamente.' : `La propiedad fue vendida a ${app.applicant?.full_name || 'este postulante'}.`}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* RENTAL CONTRACT — upload for admin/agent, download for all */}
                  <div className="pt-3 border-t">
                    <RentalContract
                      applicationId={app.id}
                      initialUrl={contracts[app.id]?.url}
                      initialName={contracts[app.id]?.name}
                      canManage={!isApplicant}
                      onContractChange={(url, name) =>
                        setContracts(prev => ({ ...prev, [app.id]: { url, name } }))
                      }
                    />
                  </div>

                  {/* PAYMENT PANEL — visible to all roles when approved/rented/sold */}
                  {['approved', 'rented', 'sold'].includes(app.status) && (
                    <div className="pt-3 border-t space-y-2">
                      <div className="flex items-center gap-2 mb-1">
                        <Landmark className="h-4 w-4 text-navy shrink-0" />
                        <p className="text-sm font-semibold text-navy">{isApplicant ? 'Realizar Pago' : 'Datos Bancarios del Propietario'}</p>
                      </div>
                      <PaymentPanel applicationId={app.id} canUpload={isApplicant} />
                    </div>
                  )}

                  {/* INVENTORY PANEL — visible to all roles when rented or sold */}
                  {['rented', 'sold'].includes(app.status) && (
                    <div className="pt-3 border-t">
                      <InventoryPanel
                        applicationId={app.id}
                        userRole={userRole}
                        isApplicant={isApplicant}
                      />
                    </div>
                  )}

                  {/* COMMISSION PAYMENT — visible when rented or sold */}
                  {['rented', 'sold'].includes(app.status) && (
                    <div className="pt-3 border-t">
                      <CommissionPayment
                        applicationId={app.id}
                        status={app.status as 'rented' | 'sold'}
                        propertyPrice={app.property?.price ?? null}
                        propertyCurrency={app.property?.currency ?? null}
                        commissionAmount={app.commission_amount ?? null}
                        paidApplicant={app.commission_paid_applicant ?? false}
                        paidOwner={app.commission_paid_owner ?? false}
                        isApplicant={isApplicant}
                        userRole={userRole}
                      />
                    </div>
                  )}

                  {/* OTHER SERVICES PAYMENT — visible when rented or sold */}
                  {['rented', 'sold'].includes(app.status) && (
                    <div className="pt-3 border-t">
                      <OtherServicesPayment
                        applicationId={app.id}
                        isApplicant={isApplicant}
                        userRole={userRole}
                        currency={app.property?.currency ?? null}
                      />
                    </div>
                  )}

                  {/* AGENCY BANK TRANSFER — visible to PROPIETARIO and POSTULANTE when rented or sold */}
                  {['rented', 'sold'].includes(app.status) && (
                    <div className="pt-3 border-t">
                      <AgencyBankPanel
                        applicationId={app.id}
                        isApplicant={isApplicant}
                        userRole={userRole}
                      />
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
