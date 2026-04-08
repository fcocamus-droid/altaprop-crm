'use client'

import { useState, useRef } from 'react'
import { CreditCard, CheckCircle2, Loader2, Pencil, Save, Upload, Paperclip } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { saveCommissionAmount } from '@/lib/actions/applications'

interface CommissionPaymentProps {
  applicationId: string
  status: 'rented' | 'sold'
  propertyPrice?: number | null
  propertyCurrency?: string | null
  commissionAmount?: number | null
  paidApplicant: boolean
  paidOwner: boolean
  isApplicant: boolean
  userRole?: string
}

export function CommissionPayment({
  applicationId,
  status,
  propertyPrice,
  propertyCurrency,
  commissionAmount,
  paidApplicant,
  paidOwner,
  isApplicant,
  userRole,
}: CommissionPaymentProps) {
  const isSold = status === 'sold'
  const isOwner = userRole === 'PROPIETARIO'
  const canManage = !isApplicant && !isOwner
  const currency = propertyCurrency || 'CLP'

  const autoAmount = !isSold && propertyPrice ? Math.round(propertyPrice / 2) : null
  const initialAmount = commissionAmount
    ? String(commissionAmount)
    : autoAmount
    ? String(autoAmount)
    : ''

  const [customAmount, setCustomAmount] = useState(initialAmount)
  const [editingAmount, setEditingAmount] = useState(false)
  const [savingAmount, setSavingAmount] = useState(false)
  const [savedAmount, setSavedAmount] = useState<number | null>(commissionAmount ?? null)
  const [uploadingPayer, setUploadingPayer] = useState<'applicant' | 'owner' | null>(null)
  const [localPaidApplicant, setLocalPaidApplicant] = useState(paidApplicant)
  const [localPaidOwner, setLocalPaidOwner] = useState(paidOwner)
  const [receiptUrlApplicant, setReceiptUrlApplicant] = useState<string | null>(null)
  const [receiptUrlOwner, setReceiptUrlOwner] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fileInputApplicant = useRef<HTMLInputElement>(null)
  const fileInputOwner = useRef<HTMLInputElement>(null)

  const effectiveAmount = isSold
    ? savedAmount ?? (customAmount ? parseFloat(customAmount) : null)
    : autoAmount

  const formatCurrency = (amount: number) => {
    if (currency === 'UF') return `${amount.toFixed(2)} UF`
    if (currency === 'USD') return `USD $${amount.toLocaleString('es-CL')}`
    return `$${amount.toLocaleString('es-CL')} CLP`
  }

  async function handleSaveAmount() {
    const val = parseFloat(customAmount)
    if (!val || isNaN(val) || val <= 0) { setError('Ingresa un monto válido'); return }
    setSavingAmount(true)
    setError(null)
    const result = await saveCommissionAmount(applicationId, val)
    if (result.error) { setError(result.error) } else { setSavedAmount(val); setEditingAmount(false) }
    setSavingAmount(false)
  }

  async function handleUploadReceipt(payerType: 'applicant' | 'owner', file: File) {
    if (!file) return
    setUploadingPayer(payerType)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('payerType', payerType)
      const res = await fetch(`/api/applications/${applicationId}/commission/receipt`, {
        method: 'POST',
        body: fd,
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setError(data.error || 'Error al subir el comprobante')
      } else {
        if (payerType === 'applicant') { setLocalPaidApplicant(true); setReceiptUrlApplicant(data.receiptUrl) }
        else { setLocalPaidOwner(true); setReceiptUrlOwner(data.receiptUrl) }
      }
    } catch {
      setError('Error de conexión')
    }
    setUploadingPayer(null)
    // Reset file input
    if (payerType === 'applicant' && fileInputApplicant.current) fileInputApplicant.current.value = ''
    if (payerType === 'owner' && fileInputOwner.current) fileInputOwner.current.value = ''
  }

  function UploadButton({ payerType }: { payerType: 'applicant' | 'owner' }) {
    const inputRef = payerType === 'applicant' ? fileInputApplicant : fileInputOwner
    const isUploading = uploadingPayer === payerType
    return (
      <>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) handleUploadReceipt(payerType, file)
          }}
        />
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs border-orange-300 text-orange-700 hover:bg-orange-100 gap-1"
          disabled={!effectiveAmount || isUploading || uploadingPayer !== null}
          onClick={() => inputRef.current?.click()}
        >
          {isUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
          {isUploading ? 'Subiendo...' : 'Adjuntar Comprobante'}
        </Button>
      </>
    )
  }

  function PaidBadge({ receiptUrl }: { receiptUrl?: string | null }) {
    return (
      <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-semibold">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Pagado
        {receiptUrl && (
          <a href={receiptUrl} target="_blank" rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-700" title="Ver comprobante">
            <Paperclip className="h-3 w-3" />
          </a>
        )}
      </div>
    )
  }

  const bothPaid = localPaidApplicant && localPaidOwner
  const myPaid = isApplicant ? localPaidApplicant : isOwner ? localPaidOwner : bothPaid
  const showPaid = isApplicant || isOwner ? myPaid : bothPaid

  return (
    <div className={`rounded-xl border p-4 space-y-3 ${showPaid ? 'border-emerald-200 bg-emerald-50' : 'border-orange-200 bg-orange-50'}`}>
      {/* Header */}
      <div className="flex items-center gap-2">
        {showPaid ? <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" /> : <CreditCard className="h-4 w-4 text-orange-600 shrink-0" />}
        <p className={`text-sm font-semibold ${showPaid ? 'text-emerald-900' : 'text-orange-900'}`}>
          {showPaid ? 'Comisión Pagada ✓' : 'Pago de Comisión'}
        </p>
      </div>

      {/* Amount */}
      {isSold && canManage ? (
        <div className="space-y-2">
          {editingAmount || !savedAmount ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 space-y-1">
                <label className="text-xs font-medium text-orange-800">Monto de comisión ({currency}) — libre para venta</label>
                <Input type="number" placeholder="Ej: 500000" value={customAmount}
                  onChange={e => setCustomAmount(e.target.value)} className="h-8 text-sm border-orange-300 bg-white" />
              </div>
              <Button size="sm" className="h-8 mt-5 bg-orange-600 hover:bg-orange-700 text-white gap-1"
                disabled={savingAmount} onClick={handleSaveAmount}>
                {savingAmount ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Guardar
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between bg-white rounded-lg border border-orange-200 px-3 py-2">
              <div>
                <p className="text-xs text-orange-700">Comisión (cada parte)</p>
                <p className="text-lg font-bold text-orange-900">{formatCurrency(savedAmount)}</p>
              </div>
              <button onClick={() => setEditingAmount(true)} className="text-orange-400 hover:text-orange-600" title="Editar monto">
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      ) : effectiveAmount ? (
        <div className="bg-white rounded-lg border border-orange-200 px-3 py-2">
          <p className="text-xs text-orange-700">{isSold ? 'Comisión (cada parte)' : '50% del arriendo — comisión de agencia'}</p>
          <p className="text-lg font-bold text-orange-900">{formatCurrency(effectiveAmount)}</p>
        </div>
      ) : (
        <p className="text-xs text-orange-700 italic">El monto de comisión aún no ha sido definido por el agente.</p>
      )}

      {error && <p className="text-xs text-red-600 font-medium bg-red-50 rounded px-2 py-1">{error}</p>}

      {/* Payment area */}
      {isApplicant ? (
        localPaidApplicant ? (
          <div className="flex items-center gap-2 bg-white border border-emerald-200 rounded-lg px-3 py-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="text-sm font-semibold text-emerald-700">Tu comisión fue pagada</span>
            {receiptUrlApplicant && (
              <a href={receiptUrlApplicant} target="_blank" rel="noopener noreferrer" className="ml-auto text-blue-500 hover:text-blue-700 text-xs flex items-center gap-1">
                <Paperclip className="h-3.5 w-3.5" /> Ver comprobante
              </a>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-orange-700">Adjunta el comprobante de transferencia bancaria para confirmar tu pago:</p>
            <UploadButton payerType="applicant" />
          </div>
        )
      ) : isOwner ? (
        localPaidOwner ? (
          <div className="flex items-center gap-2 bg-white border border-emerald-200 rounded-lg px-3 py-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="text-sm font-semibold text-emerald-700">Tu comisión fue pagada</span>
            {receiptUrlOwner && (
              <a href={receiptUrlOwner} target="_blank" rel="noopener noreferrer" className="ml-auto text-blue-500 hover:text-blue-700 text-xs flex items-center gap-1">
                <Paperclip className="h-3.5 w-3.5" /> Ver comprobante
              </a>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-orange-700">Adjunta el comprobante de transferencia bancaria para confirmar tu pago:</p>
            <UploadButton payerType="owner" />
          </div>
        )
      ) : (
        // Admin/Agente: shows both payer rows
        !bothPaid && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-orange-800">Postulante:</span>
              {localPaidApplicant
                ? <PaidBadge receiptUrl={receiptUrlApplicant} />
                : <UploadButton payerType="applicant" />}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-orange-800">Propietario:</span>
              {localPaidOwner
                ? <PaidBadge receiptUrl={receiptUrlOwner} />
                : <UploadButton payerType="owner" />}
            </div>
          </div>
        )
      )}
    </div>
  )
}
