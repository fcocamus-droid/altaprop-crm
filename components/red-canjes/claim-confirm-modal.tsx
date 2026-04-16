'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, X, CheckSquare, Square, AlertCircle, Calculator, Lock } from 'lucide-react'

interface Listing {
  id: string
  title: string
  price: number | null
  currency: string | null
  operation: string
  type: string
}

interface Props {
  listing: Listing
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}

const UF_API = 'https://mindicador.cl/api/uf'
const IVA = 0.19

function formatCLP(value: number) {
  return value.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 })
}

function getOperationLabel(op: string) {
  if (op === 'arriendo' || op === 'arriendo_temporal') return 'arriendo'
  return 'venta'
}

export function ClaimConfirmModal({ listing, onConfirm, onCancel, loading }: Props) {
  const [checks, setChecks] = useState([false, false, false, false, false])
  const [ufValue, setUfValue] = useState<number | null>(null)
  const [ufLoading, setUfLoading] = useState(true)

  const opType = getOperationLabel(listing.operation)

  // Fetch live UF value on mount
  useEffect(() => {
    setUfLoading(true)
    fetch(UF_API)
      .then(r => r.json())
      .then(data => {
        const valor = data?.serie?.[0]?.valor
        if (valor) setUfValue(valor)
      })
      .catch(() => {
        // Fallback to approximate UF value if API fails
        setUfValue(37500)
      })
      .finally(() => setUfLoading(false))
  }, [])

  // Commission calculation
  const priceCLP = (() => {
    if (!listing.price) return null
    if (listing.currency === 'UF' && ufValue) return listing.price * ufValue
    if (listing.currency === 'CLP' || listing.currency === '$') return listing.price
    return null
  })()

  const commissionBase = priceCLP
    ? opType === 'venta'
      ? priceCLP * 0.005
      : priceCLP * 0.25
    : null

  const commissionWithIva = commissionBase ? commissionBase * (1 + IVA) : null

  const allChecked = checks.every(Boolean)

  const toggle = (i: number) => setChecks(prev => prev.map((v, idx) => idx === i ? !v : v))

  const conditions = [
    {
      text: (
        <>
          Debo pagar <strong>comisiones</strong> por las ventas o arriendos que cierre exitosamente
          con propiedades captadas a través de la Red de Canjes de Altaprop.
        </>
      ),
    },
    {
      text: (
        <>
          Si <strong className="text-emerald-700">vendo</strong> una propiedad captada a través de la Red de Canjes,
          la comisión a pagar es{' '}
          <strong className="text-emerald-700">0,5% + IVA del valor de venta</strong> de la propiedad.
        </>
      ),
    },
    {
      text: (
        <>
          Si <strong className="text-blue-700">arriendo</strong> una propiedad captada a través de la Red de Canjes,
          la comisión de arriendo es{' '}
          <strong className="text-blue-700">25% + IVA de un mes</strong> de arriendo.
        </>
      ),
    },
    {
      text: (
        <>
          Entiendo que mis resultados afectan mi posicionamiento en la plataforma.
          Si no cierro operaciones, puedo perder acceso a propiedades de la red.
        </>
      ),
    },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b">
          <div>
            <h2 className="text-base font-bold text-gray-900">Condiciones Comerciales</h2>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{listing.title}</p>
          </div>
          <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* Intro */}
          <p className="text-sm text-center text-gray-600 font-medium">
            Confirma que entiendes y aceptas las condiciones comerciales del servicio:
          </p>

          {/* Condition checkboxes */}
          <div className="space-y-3">
            {conditions.map((cond, i) => (
              <button
                key={i}
                type="button"
                onClick={() => toggle(i)}
                className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                  checks[i]
                    ? 'border-emerald-200 bg-emerald-50'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <span className="mt-0.5 shrink-0">
                  {checks[i]
                    ? <CheckSquare className="h-4 w-4 text-emerald-600" />
                    : <Square className="h-4 w-4 text-gray-400" />
                  }
                </span>
                <span className="text-xs text-gray-700 leading-relaxed">{cond.text}</span>
              </button>
            ))}
          </div>

          {/* Commission calculator */}
          <div className="rounded-xl border border-navy/20 bg-navy/5 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-navy shrink-0" />
                      <p className="text-xs font-semibold text-navy">
                Comisión estimada — {opType === 'venta' ? 'Venta (0,5% + IVA)' : 'Arriendo (25% de un mes + IVA)'}
              </p>
            </div>

            {ufLoading ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Obteniendo valor UF del día...
              </div>
            ) : !listing.price ? (
              <p className="text-xs text-muted-foreground">Precio no disponible para esta propiedad.</p>
            ) : (
              <div className="space-y-1.5 text-xs">
                {listing.currency === 'UF' && ufValue && (
                  <div className="flex justify-between text-gray-500">
                    <span>UF del día</span>
                    <span>{formatCLP(ufValue)}</span>
                  </div>
                )}
                {listing.currency === 'UF' && ufValue && (
                  <div className="flex justify-between text-gray-500">
                    <span>Valor propiedad ({listing.price.toLocaleString('es-CL')} UF)</span>
                    <span>{priceCLP ? formatCLP(priceCLP) : '—'}</span>
                  </div>
                )}
                {commissionBase && (
                  <div className="flex justify-between text-gray-600">
                    <span>Comisión base ({opType === 'venta' ? '0,5%' : '25%'})</span>
                    <span>{formatCLP(commissionBase)}</span>
                  </div>
                )}
                {commissionBase && (
                  <div className="flex justify-between text-gray-600">
                    <span>IVA (19%)</span>
                    <span>{formatCLP(commissionBase * IVA)}</span>
                  </div>
                )}
                {commissionWithIva && (
                  <div className="flex justify-between font-bold text-navy border-t pt-1.5 mt-1.5 text-sm">
                    <span>Total comisión</span>
                    <span>{formatCLP(commissionWithIva)}</span>
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground pt-1">
                  * Monto referencial. El pago se genera al cierre exitoso de la operación.
                </p>
              </div>
            )}
          </div>

          {/* Info banner */}
          <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-800">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>
              Al tomar gestión, bloqueas esta propiedad para otras organizaciones por <strong>30 días</strong>.
              Solo podrá ser retomada por otra organización si la liberas o vence el plazo.
            </span>
          </div>

          {/* Final acceptance checkbox */}
          <button
            type="button"
            onClick={() => toggle(4)}
            className={`w-full flex items-center gap-3 p-3 rounded-xl border font-medium transition-all ${
              checks[4]
                ? 'border-navy/30 bg-navy/5 text-navy'
                : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
            }`}
          >
            {checks[4]
              ? <CheckSquare className="h-4 w-4 shrink-0 text-navy" />
              : <Square className="h-4 w-4 shrink-0 text-gray-400" />
            }
            <span className="text-xs">
              Confirmo que <strong>acepto</strong> las condiciones comerciales del servicio
            </span>
          </button>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={onCancel}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              className="flex-1 gap-2 bg-navy hover:bg-navy/90 disabled:opacity-40"
              disabled={!allChecked || loading}
              onClick={onConfirm}
            >
              {loading
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Procesando...</>
                : <><Lock className="h-3.5 w-3.5" /> Tomar gestión</>
              }
            </Button>
          </div>

        </div>
      </div>
    </div>
  )
}
