'use client'

import { useState } from 'react'
import { CreditCard, CheckCircle2, Loader2, Pencil, Save } from 'lucide-react'
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
}: CommissionPaymentProps) {
  const isSold = status === 'sold'
  const currency = propertyCurrency || 'CLP'

  // For rented: auto-calculated half price. For sold: use stored amount or let admin enter
  const autoAmount =
    !isSold && propertyPrice ? Math.round(propertyPrice / 2) : null
  const initialAmount = commissionAmount
    ? String(commissionAmount)
    : autoAmount
    ? String(autoAmount)
    : ''

  const [customAmount, setCustomAmount] = useState(initialAmount)
  const [editingAmount, setEditingAmount] = useState(false)
  const [savingAmount, setSavingAmount] = useState(false)
  const [savedAmount, setSavedAmount] = useState<number | null>(commissionAmount ?? null)
  const [loadingPayer, setLoadingPayer] = useState<'applicant' | 'owner' | null>(null)
  const [localPaidApplicant, setLocalPaidApplicant] = useState(paidApplicant)
  const [localPaidOwner, setLocalPaidOwner] = useState(paidOwner)
  const [error, setError] = useState<string | null>(null)

  // The effective amount shown
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
    if (!val || isNaN(val) || val <= 0) {
      setError('Ingresa un monto válido')
      return
    }
    setSavingAmount(true)
    setError(null)
    const result = await saveCommissionAmount(applicationId, val)
    if (result.error) {
      setError(result.error)
    } else {
      setSavedAmount(val)
      setEditingAmount(false)
    }
    setSavingAmount(false)
  }

  async function handlePay(payerType: 'applicant' | 'owner') {
    const amount = effectiveAmount
    if (!amount || isNaN(amount) || amount <= 0) {
      setError(
        isSold
          ? 'Primero guarda el monto de la comisión'
          : 'No hay monto calculado para pagar'
      )
      return
    }
    setLoadingPayer(payerType)
    setError(null)
    try {
      const res = await fetch(`/api/applications/${applicationId}/commission`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payerType, amount }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.error || 'Error al crear el pago')
        setLoadingPayer(null)
      }
    } catch {
      setError('Error de conexión')
      setLoadingPayer(null)
    }
  }

  const bothPaid = localPaidApplicant && localPaidOwner

  return (
    <div
      className={`rounded-xl border p-4 space-y-3 ${
        bothPaid
          ? 'border-emerald-200 bg-emerald-50'
          : 'border-orange-200 bg-orange-50'
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        {bothPaid ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
        ) : (
          <CreditCard className="h-4 w-4 text-orange-600 shrink-0" />
        )}
        <p
          className={`text-sm font-semibold ${
            bothPaid ? 'text-emerald-900' : 'text-orange-900'
          }`}
        >
          {bothPaid ? 'Comisión Pagada ✓' : 'Pago de Comisión'}
        </p>
      </div>

      {/* Amount section */}
      {isSold && !isApplicant ? (
        // Admin: editable amount for sold
        <div className="space-y-2">
          {editingAmount || !savedAmount ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 space-y-1">
                <label className="text-xs font-medium text-orange-800">
                  Monto de comisión ({currency}) — libre para venta
                </label>
                <Input
                  type="number"
                  placeholder="Ej: 500000"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="h-8 text-sm border-orange-300 bg-white"
                />
              </div>
              <Button
                size="sm"
                className="h-8 mt-5 bg-orange-600 hover:bg-orange-700 text-white gap-1"
                disabled={savingAmount}
                onClick={handleSaveAmount}
              >
                {savingAmount ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Guardar
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between bg-white rounded-lg border border-orange-200 px-3 py-2">
              <div>
                <p className="text-xs text-orange-700">Comisión (cada parte)</p>
                <p className="text-lg font-bold text-orange-900">
                  {formatCurrency(savedAmount)}
                </p>
              </div>
              <button
                onClick={() => setEditingAmount(true)}
                className="text-orange-400 hover:text-orange-600 transition-colors"
                title="Editar monto"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      ) : effectiveAmount ? (
        // Auto-calculated amount (rented) or fixed amount shown to applicant
        <div className="bg-white rounded-lg border border-orange-200 px-3 py-2">
          <p className="text-xs text-orange-700">
            {isSold ? 'Comisión (cada parte)' : '50% del arriendo — comisión de agencia'}
          </p>
          <p className="text-lg font-bold text-orange-900">
            {formatCurrency(effectiveAmount)}
          </p>
        </div>
      ) : (
        <p className="text-xs text-orange-700 italic">
          El monto de comisión aún no ha sido definido por el agente.
        </p>
      )}

      {error && (
        <p className="text-xs text-red-600 font-medium bg-red-50 rounded px-2 py-1">
          {error}
        </p>
      )}

      {/* Payment buttons */}
      {isApplicant ? (
        // Applicant: only their own payment
        localPaidApplicant ? (
          <div className="flex items-center gap-2 bg-white border border-emerald-200 rounded-lg px-3 py-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="text-sm font-semibold text-emerald-700">
              Tu comisión fue pagada
            </span>
          </div>
        ) : (
          <Button
            className="w-full bg-orange-600 hover:bg-orange-700 text-white gap-2"
            size="sm"
            disabled={!effectiveAmount || loadingPayer !== null}
            onClick={() => handlePay('applicant')}
          >
            {loadingPayer === 'applicant' ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Procesando...
              </>
            ) : (
              <>
                <CreditCard className="h-3.5 w-3.5" /> Pagar Comisión con
                MercadoPago
              </>
            )}
          </Button>
        )
      ) : (
        // Admin: shows both payer rows
        !bothPaid && (
          <div className="space-y-2">
            {/* Applicant row */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-orange-800">
                Postulante:
              </span>
              {localPaidApplicant ? (
                <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-semibold">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Pagado
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs border-orange-300 text-orange-700 hover:bg-orange-100 gap-1"
                  disabled={!effectiveAmount || loadingPayer !== null}
                  onClick={() => handlePay('applicant')}
                >
                  {loadingPayer === 'applicant' ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <CreditCard className="h-3 w-3" />
                  )}
                  Pagar
                </Button>
              )}
            </div>
            {/* Owner row */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-orange-800">
                Propietario:
              </span>
              {localPaidOwner ? (
                <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-semibold">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Pagado
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs border-orange-300 text-orange-700 hover:bg-orange-100 gap-1"
                  disabled={!effectiveAmount || loadingPayer !== null}
                  onClick={() => handlePay('owner')}
                >
                  {loadingPayer === 'owner' ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <CreditCard className="h-3 w-3" />
                  )}
                  Pagar
                </Button>
              )}
            </div>
          </div>
        )
      )}
    </div>
  )
}
