'use client'

import { useState } from 'react'
import { Users, Plus, CheckCircle2, Clock, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { requestExtraAgentSlot, EXTRA_AGENT_PRICE_USD } from '@/lib/actions/users'

const IVA = 1.19

interface AgentSlotsBannerProps {
  planName: string
  usedAgents: number
  maxAgents: number          // base plan slots + extra purchased
  extraSlots: number         // extra slots already purchased
  hasPendingRequest: boolean // already has a pending request
  isSuperAdmin: boolean      // only SUPERADMIN can buy extra slots
}

export function AgentSlotsBanner({
  planName,
  usedAgents,
  maxAgents,
  extraSlots,
  hasPendingRequest,
  isSuperAdmin,
}: AgentSlotsBannerProps) {
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [requested, setRequested] = useState(hasPendingRequest)
  const [error, setError] = useState('')

  const pct = maxAgents > 0 ? Math.min((usedAgents / maxAgents) * 100, 100) : 100
  const atLimit = usedAgents >= maxAgents
  const priceWithIva = (EXTRA_AGENT_PRICE_USD * IVA).toFixed(2)

  async function handleRequest() {
    setLoading(true)
    setError('')
    const result = await requestExtraAgentSlot()
    setLoading(false)
    if (result.error) {
      setError(result.error)
    } else {
      setRequested(true)
      setShowModal(false)
    }
  }

  return (
    <>
      {/* ── Usage bar ─────────────────────────────────────────────────────── */}
      <div className={`rounded-xl border p-4 mb-6 ${
        atLimit
          ? 'border-orange-200 bg-orange-50'
          : 'border-border bg-card'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Left: usage info */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  Agentes del plan <span className="text-navy font-semibold">{planName}</span>
                </span>
              </div>
              <span className={`text-sm font-bold ${atLimit ? 'text-orange-600' : 'text-navy'}`}>
                {usedAgents} / {maxAgents}
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  pct >= 100 ? 'bg-orange-400' : pct >= 75 ? 'bg-amber-400' : 'bg-green-500'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>{maxAgents - usedAgents > 0 ? `${maxAgents - usedAgents} disponible${maxAgents - usedAgents !== 1 ? 's' : ''}` : 'Sin slots disponibles'}</span>
              {extraSlots > 0 && (
                <span className="text-indigo-600 font-medium">
                  Incluye {extraSlots} agente{extraSlots !== 1 ? 's' : ''} adicional{extraSlots !== 1 ? 'es' : ''} contratado{extraSlots !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          {/* Right: CTA */}
          {isSuperAdmin && (
            <div className="flex-shrink-0">
              {requested ? (
                <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <Clock className="h-4 w-4" />
                  Solicitud pendiente de aprobación
                </div>
              ) : (
                <Button
                  size="sm"
                  variant={atLimit ? 'default' : 'outline'}
                  className={atLimit ? 'bg-navy hover:bg-navy/90' : ''}
                  onClick={() => setShowModal(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Agente Adicional
                  <span className="ml-1.5 text-xs opacity-75">${EXTRA_AGENT_PRICE_USD} USD/mes</span>
                </Button>
              )}
            </div>
          )}
        </div>

        {atLimit && !requested && isSuperAdmin && (
          <p className="text-xs text-orange-700 mt-2">
            Has alcanzado el límite de agentes de tu plan. Contrata un agente adicional para poder agregar más.
          </p>
        )}
      </div>

      {/* ── Modal ─────────────────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-navy/10 mb-3">
                <Users className="h-7 w-7 text-navy" />
              </div>
              <h2 className="text-xl font-bold text-navy">Agregar Agente Adicional</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Expande tu equipo más allá del límite de tu plan
              </p>
            </div>

            {/* Pricing card */}
            <div className="rounded-xl border-2 border-navy/20 bg-navy/5 p-4 mb-4 text-center">
              <p className="text-3xl font-bold text-navy">
                ${EXTRA_AGENT_PRICE_USD} <span className="text-base font-normal text-muted-foreground">USD/mes</span>
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Total: ${priceWithIva} USD/mes (IVA incluido)
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Por cada agente adicional que agregues a tu plan
              </p>
            </div>

            {/* What's included */}
            <ul className="space-y-2 mb-5 text-sm">
              {[
                'Un slot de agente adicional activado inmediatamente',
                'Se suma a tu facturación mensual existente',
                'Puedes solicitar tantos como necesites',
                'Sin contrato de permanencia',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>

            {/* Current plan info */}
            <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 text-xs text-muted-foreground mb-5">
              <span className="font-medium">Plan actual:</span> {planName} · {usedAgents}/{maxAgents} agentes usados
              {extraSlots > 0 && <span> · {extraSlots} adicional{extraSlots !== 1 ? 'es' : ''} ya contratado{extraSlots !== 1 ? 's' : ''}</span>}
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2 mb-4">
                {error}
              </p>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowModal(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-navy hover:bg-navy/90"
                onClick={handleRequest}
                disabled={loading}
              >
                {loading
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando...</>
                  : 'Solicitar Agente Extra'
                }
              </Button>
            </div>

            <p className="text-[11px] text-muted-foreground text-center mt-3">
              Tu solicitud será revisada y activada dentro de 24 horas hábiles.
            </p>
          </div>
        </div>
      )}
    </>
  )
}
