'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Wrench, Plus, CheckCircle2, Loader2, Trash2,
  Paperclip, X, FileText, ChevronDown, ChevronUp, Upload,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface OtherServicePayment {
  id: string
  application_id: string
  description: string
  amount: number
  currency: string
  payer_type: 'applicant' | 'owner'
  file_url: string | null
  file_name: string | null
  receipt_url?: string | null
  receipt_name?: string | null
  paid: boolean
  created_at: string
}

interface OtherServicesPaymentProps {
  applicationId: string
  isApplicant: boolean
  userRole?: string
  currency?: string | null
}

export function OtherServicesPayment({
  applicationId,
  isApplicant,
  userRole,
  currency: defaultCurrency,
}: OtherServicesPaymentProps) {
  const isOwner = userRole === 'PROPIETARIO'
  const canManage = !isApplicant && !isOwner
  const [payments, setPayments] = useState<OtherServicePayment[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [expanded, setExpanded] = useState(true)

  // Form state
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [payerType, setPayerType] = useState<'applicant' | 'owner'>('applicant')
  const [file, setFile] = useState<File | null>(null)
  const [fileUploading, setFileUploading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [uploadingReceiptId, setUploadingReceiptId] = useState<string | null>(null)
  const [receiptError, setReceiptError] = useState<string | null>(null)

  const formFileRef = useRef<HTMLInputElement>(null)
  // Per-item receipt file refs stored in a map
  const receiptRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const currency = defaultCurrency || 'CLP'

  useEffect(() => {
    fetchPayments()
    // fetchPayments is defined inside the component and only depends on
    // applicationId via closure; keeping the deps array minimal avoids
    // refetching on every parent re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationId])

  async function fetchPayments() {
    setLoading(true)
    try {
      const res = await fetch(`/api/applications/${applicationId}/other-services`)
      const data = await res.json()
      setPayments(data.payments ?? [])
    } catch { } finally { setLoading(false) }
  }

  function formatCurrency(amount: number, cur: string) {
    if (cur === 'UF') return `${amount.toFixed(2)} UF`
    if (cur === 'USD') return `USD $${amount.toLocaleString('es-CL')}`
    return `$${amount.toLocaleString('es-CL')} CLP`
  }

  function resetForm() {
    setDescription(''); setAmount(''); setPayerType('applicant')
    setFile(null); setFormError(null); setShowForm(false)
    if (formFileRef.current) formFileRef.current.value = ''
  }

  async function handleSubmit() {
    if (!description.trim()) { setFormError('Ingresa una descripción'); return }
    const numAmount = parseFloat(amount)
    if (!amount || isNaN(numAmount) || numAmount <= 0) { setFormError('Ingresa un monto válido'); return }

    setSubmitting(true); setFormError(null)
    try {
      let fileUrl: string | null = null
      let fileName: string | null = null

      if (file) {
        setFileUploading(true)
        const fd = new FormData()
        fd.append('file', file)
        const uploadRes = await fetch(`/api/applications/${applicationId}/other-services/upload`, { method: 'POST', body: fd })
        const uploadData = await uploadRes.json()
        setFileUploading(false)
        if (!uploadRes.ok || !uploadData.url) { setFormError(uploadData.error || 'Error al subir el archivo'); setSubmitting(false); return }
        fileUrl = uploadData.url; fileName = uploadData.name
      }

      // Create the charge (without MP)
      const res = await fetch(`/api/applications/${applicationId}/other-services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, amount: numAmount, payerType, fileUrl, fileName, currency }),
      })
      const data = await res.json()

      if (!res.ok) { setFormError(data.error || 'Error al crear el cobro'); setSubmitting(false); return }

      // Add to list (use payment from response if available, otherwise refetch)
      if (data.payment) {
        setPayments(prev => [...prev, data.payment])
      } else {
        await fetchPayments()
      }
      resetForm()
    } catch { setFormError('Error de conexión') }
    finally { setSubmitting(false); setFileUploading(false) }
  }

  async function handleUploadReceipt(paymentId: string, file: File) {
    setUploadingReceiptId(paymentId)
    setReceiptError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('paymentId', paymentId)
      const res = await fetch(`/api/applications/${applicationId}/other-services/receipt`, { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok || data.error) {
        setReceiptError(data.error || 'Error al subir el comprobante')
      } else {
        setPayments(prev => prev.map(p =>
          p.id === paymentId ? { ...p, paid: true, receipt_url: data.receiptUrl } : p
        ))
      }
    } catch { setReceiptError('Error de conexión') }
    finally {
      setUploadingReceiptId(null)
      if (receiptRefs.current[paymentId]) receiptRefs.current[paymentId]!.value = ''
    }
  }

  async function handleDelete(paymentId: string) {
    setDeletingId(paymentId)
    try {
      const res = await fetch(`/api/applications/${applicationId}/other-services?paymentId=${paymentId}`, { method: 'DELETE' })
      if (res.ok) setPayments(prev => prev.filter(p => p.id !== paymentId))
    } finally { setDeletingId(null) }
  }

  const payerLabel = (type: 'applicant' | 'owner') => type === 'applicant' ? 'Postulante' : 'Propietario'

  const visiblePayments = isApplicant
    ? payments.filter(p => p.payer_type === 'applicant')
    : isOwner
    ? payments.filter(p => p.payer_type === 'owner')
    : payments

  const hasPending = visiblePayments.some(p => !p.paid)

  return (
    <div className={`rounded-xl border p-4 space-y-3 ${hasPending || visiblePayments.length === 0 ? 'border-blue-200 bg-blue-50' : 'border-emerald-200 bg-emerald-50'}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wrench className={`h-4 w-4 shrink-0 ${hasPending || visiblePayments.length === 0 ? 'text-blue-600' : 'text-emerald-600'}`} />
          <p className={`text-sm font-semibold ${hasPending || visiblePayments.length === 0 ? 'text-blue-900' : 'text-emerald-900'}`}>
            Otros Servicios
          </p>
          {visiblePayments.length > 0 && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${hasPending ? 'bg-blue-200 text-blue-800' : 'bg-emerald-200 text-emerald-800'}`}>
              {visiblePayments.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {canManage && !showForm && (
            <Button size="sm" variant="outline"
              className="h-7 text-xs border-blue-300 text-blue-700 hover:bg-blue-100 gap-1"
              onClick={() => setShowForm(true)}>
              <Plus className="h-3 w-3" /> Nuevo cobro
            </Button>
          )}
          <button onClick={() => setExpanded(!expanded)} className="text-blue-400 hover:text-blue-600 transition-colors">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <>
          {/* New charge form (admin/agent only) */}
          {showForm && canManage && (
            <div className="bg-white rounded-lg border border-blue-200 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-blue-900">Nuevo cobro</p>
                <button onClick={resetForm} className="text-gray-400 hover:text-gray-600"><X className="h-3.5 w-3.5" /></button>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Descripción *</label>
                <Input placeholder="Ej: Reparación gasfitería, Pintura dpto..."
                  value={description} onChange={e => setDescription(e.target.value)} className="h-8 text-sm border-blue-200" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Monto ({currency}) *</label>
                <Input type="number" placeholder="Ej: 150000"
                  value={amount} onChange={e => setAmount(e.target.value)} className="h-8 text-sm border-blue-200" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">¿Quién paga? *</label>
                <div className="flex gap-2">
                  {(['applicant', 'owner'] as const).map(type => (
                    <button key={type} onClick={() => setPayerType(type)}
                      className={`flex-1 text-xs py-1.5 rounded-md border font-medium transition-colors ${payerType === type ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-300 text-gray-600 hover:border-blue-400'}`}>
                      {payerLabel(type)}
                    </button>
                  ))}
                </div>
              </div>

              {/* File attachment (invoice/quote from admin) */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Adjunto (boleta, cotización) — opcional</label>
                {file ? (
                  <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-md px-2 py-1.5">
                    <FileText className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                    <span className="text-xs text-blue-800 flex-1 truncate">{file.name}</span>
                    <button onClick={() => { setFile(null); if (formFileRef.current) formFileRef.current.value = '' }} className="text-blue-400 hover:text-blue-700">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => formFileRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 border border-dashed border-blue-300 rounded-md py-2 text-xs text-blue-600 hover:bg-blue-50 transition-colors">
                    <Paperclip className="h-3.5 w-3.5" /> Seleccionar archivo (PDF, imagen, etc.)
                  </button>
                )}
                <input ref={formFileRef} type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx"
                  className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0]
                    if (f) {
                      if (f.size > 20 * 1024 * 1024) { setFormError('El archivo supera los 20 MB'); return }
                      setFormError(null); setFile(f)
                    }
                  }} />
              </div>

              {formError && <p className="text-xs text-red-600 font-medium bg-red-50 rounded px-2 py-1">{formError}</p>}

              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2" size="sm"
                disabled={submitting || fileUploading} onClick={handleSubmit}>
                {submitting || fileUploading ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" />{fileUploading ? 'Subiendo archivo...' : 'Creando cobro...'}</>
                ) : (
                  <><Plus className="h-3.5 w-3.5" /> Crear cobro</>
                )}
              </Button>
            </div>
          )}

          {/* Receipt error */}
          {receiptError && (
            <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2 border border-red-200">
              <span>{receiptError}</span>
              <button onClick={() => setReceiptError(null)} className="ml-auto text-red-400 hover:text-red-600">×</button>
            </div>
          )}

          {/* Payments list */}
          {loading ? (
            <div className="flex items-center justify-center py-3"><Loader2 className="h-4 w-4 animate-spin text-blue-500" /></div>
          ) : visiblePayments.length === 0 ? (
            <p className="text-xs text-blue-600 italic">
              {(isApplicant || isOwner) ? 'No hay cobros pendientes para ti.' : 'No hay cobros adicionales registrados.'}
            </p>
          ) : (
            <div className="space-y-2">
              {visiblePayments.map(payment => (
                <div key={payment.id}
                  className={`rounded-lg border px-3 py-2.5 space-y-2 ${payment.paid ? 'bg-white border-emerald-200' : 'bg-white border-blue-200'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">{payment.description}</p>
                      <p className={`text-sm font-bold ${payment.paid ? 'text-emerald-700' : 'text-blue-800'}`}>
                        {formatCurrency(payment.amount, payment.currency)}
                      </p>
                      {canManage && <p className="text-xs text-gray-500">Cobro a: {payerLabel(payment.payer_type)}</p>}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Admin's document attachment */}
                      {payment.file_url && (
                        <a href={payment.file_url} target="_blank" rel="noopener noreferrer"
                          title={payment.file_name || 'Ver documento'} className="text-blue-400 hover:text-blue-700">
                          <Paperclip className="h-3.5 w-3.5" />
                        </a>
                      )}

                      {/* Paid state */}
                      {payment.paid ? (
                        <div className="flex items-center gap-1 text-emerald-600 text-xs font-semibold">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Pagado
                          {payment.receipt_url && (
                            <a href={payment.receipt_url} target="_blank" rel="noopener noreferrer"
                              title="Ver comprobante" className="text-blue-400 hover:text-blue-700 ml-0.5">
                              <Paperclip className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      ) : (
                        /* Per-item receipt upload */
                        <>
                          <input
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg,.webp"
                            className="hidden"
                            ref={el => { receiptRefs.current[payment.id] = el }}
                            onChange={e => {
                              const f = e.target.files?.[0]
                              if (f) handleUploadReceipt(payment.id, f)
                            }}
                          />
                          <Button size="sm" variant="outline"
                            className="h-6 text-xs border-blue-300 text-blue-700 hover:bg-blue-100 gap-1 px-2"
                            disabled={uploadingReceiptId === payment.id}
                            onClick={() => receiptRefs.current[payment.id]?.click()}>
                            {uploadingReceiptId === payment.id
                              ? <Loader2 className="h-3 w-3 animate-spin" />
                              : <Upload className="h-3 w-3" />}
                            {uploadingReceiptId === payment.id ? 'Subiendo...' : 'Comprobante'}
                          </Button>
                        </>
                      )}

                      {/* Delete (admin/agent only, unpaid) */}
                      {canManage && !payment.paid && (
                        <button onClick={() => handleDelete(payment.id)} disabled={deletingId === payment.id}
                          className="text-gray-300 hover:text-red-500 transition-colors" title="Eliminar cobro">
                          {deletingId === payment.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
