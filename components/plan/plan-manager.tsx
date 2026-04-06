'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PricingCards } from '@/components/pricing/pricing-cards'
import { PLANS } from '@/lib/constants'
import { CreditCard, Calendar, AlertTriangle, CheckCircle, Pause, Play, XCircle, Loader2 } from 'lucide-react'
import { pauseSubscription, resumeSubscription, cancelSubscription } from '@/lib/actions/subscription'

interface PlanManagerProps {
  currentPlan: string | null
  subscriptionStatus: string
  trialEndsAt: string | null
  subscriptionEndsAt: string | null
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'active':
      return { label: 'Activo', color: 'bg-green-100 text-green-800', icon: CheckCircle }
    case 'trialing':
      return { label: 'Periodo de Prueba', color: 'bg-blue-100 text-blue-800', icon: Calendar }
    case 'past_due':
      return { label: 'Pago Pendiente', color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle }
    case 'canceled':
      return { label: 'Cancelado', color: 'bg-red-100 text-red-800', icon: XCircle }
    case 'paused':
      return { label: 'Pausado', color: 'bg-orange-100 text-orange-800', icon: Pause }
    default:
      return { label: 'Sin Plan', color: 'bg-gray-100 text-gray-800', icon: CreditCard }
  }
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function getDaysRemaining(date: string) {
  const diff = new Date(date).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

export function PlanManager({ currentPlan, subscriptionStatus, trialEndsAt, subscriptionEndsAt }: PlanManagerProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [localStatus, setLocalStatus] = useState(subscriptionStatus)

  const plan = PLANS.find(p => p.id === currentPlan)
  const status = getStatusBadge(localStatus)
  const StatusIcon = status.icon

  const canPause = ['active', 'trialing'].includes(localStatus)
  const canResume = localStatus === 'paused'
  const canCancel = ['active', 'trialing', 'paused', 'past_due'].includes(localStatus)

  const handleSelectPlan = async (planId: string, annual = false) => {
    setLoading(planId)
    try {
      const res = await fetch('/api/mp/create-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, annual }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch {
      alert('Error al procesar. Intenta de nuevo.')
    }
    setLoading(null)
  }

  async function handlePause() {
    if (!confirm('¿Pausar tu suscripción? No se realizarán cobros mientras esté pausada. Podrás reactivarla cuando quieras.')) return
    setLoading('pause')
    setActionMsg(null)
    const result = await pauseSubscription()
    if (result.error) {
      setActionMsg({ type: 'error', text: result.error })
    } else {
      setLocalStatus('paused')
      setActionMsg({ type: 'success', text: 'Suscripción pausada. Te enviamos un correo de confirmación.' })
    }
    setLoading(null)
  }

  async function handleResume() {
    setLoading('resume')
    setActionMsg(null)
    const result = await resumeSubscription()
    if (result.error) {
      setActionMsg({ type: 'error', text: result.error })
    } else {
      setLocalStatus('active')
      setActionMsg({ type: 'success', text: 'Suscripción reactivada correctamente.' })
    }
    setLoading(null)
  }

  async function handleCancel() {
    if (!confirm('¿Cancelar tu suscripción? Mantendrás el acceso hasta que venza el periodo actual, luego tu cuenta volverá al estado gratuito.')) return
    setLoading('cancel')
    setActionMsg(null)
    const result = await cancelSubscription()
    if (result.error) {
      setActionMsg({ type: 'error', text: result.error })
    } else {
      setLocalStatus('canceled')
      setActionMsg({ type: 'success', text: 'Suscripción cancelada. Te enviamos un correo de confirmación.' })
    }
    setLoading(null)
  }

  return (
    <div className="space-y-8">
      {/* Current Plan Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Plan Actual
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-2xl font-bold text-navy">{plan?.name || 'Sin Plan'}</h3>
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${status.color}`}>
                  <StatusIcon className="h-3 w-3" />
                  {status.label}
                </span>
              </div>
              {plan && (
                <p className="text-muted-foreground">
                  ${plan.price} USD/mes · {plan.agents} {plan.agents === 1 ? 'agente' : 'agentes'} incluidos
                </p>
              )}
              {localStatus === 'trialing' && trialEndsAt && (
                <p className="text-sm text-blue-600 mt-1">
                  Tu prueba gratuita termina en {getDaysRemaining(trialEndsAt)} días ({formatDate(trialEndsAt)})
                </p>
              )}
              {localStatus === 'active' && subscriptionEndsAt && (
                <p className="text-sm text-muted-foreground mt-1">
                  Próxima renovación: {formatDate(subscriptionEndsAt)}
                </p>
              )}
              {localStatus === 'paused' && (
                <p className="text-sm text-orange-600 mt-1">
                  Suscripción en pausa — no se realizarán cobros hasta que la reactives.
                </p>
              )}
              {localStatus === 'past_due' && subscriptionEndsAt && (
                <p className="text-sm text-yellow-700 mt-1">
                  Pago pendiente desde {formatDate(subscriptionEndsAt)}. Renueva para mantener el acceso.
                </p>
              )}
              {localStatus === 'canceled' && (
                <p className="text-sm text-red-600 mt-1">
                  Suscripción cancelada{subscriptionEndsAt ? `. Acceso hasta ${formatDate(subscriptionEndsAt)}` : ''}.
                </p>
              )}
            </div>

            {/* Subscription management actions */}
            {(canPause || canResume || canCancel) && (
              <div className="flex flex-col gap-2 min-w-[180px]">
                {canResume && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={loading === 'resume'}
                    onClick={handleResume}
                    className="gap-2 border-green-300 text-green-700 hover:bg-green-50"
                  >
                    {loading === 'resume' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                    Reactivar suscripción
                  </Button>
                )}
                {canPause && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={loading === 'pause'}
                    onClick={handlePause}
                    className="gap-2 border-orange-300 text-orange-700 hover:bg-orange-50"
                  >
                    {loading === 'pause' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Pause className="h-3.5 w-3.5" />}
                    Pausar suscripción
                  </Button>
                )}
                {canCancel && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={loading === 'cancel'}
                    onClick={handleCancel}
                    className="gap-2 border-red-300 text-red-700 hover:bg-red-50"
                  >
                    {loading === 'cancel' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                    Cancelar suscripción
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Action feedback */}
          {actionMsg && (
            <div className={`text-sm rounded-lg px-4 py-3 ${actionMsg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {actionMsg.text}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Plans */}
      <div>
        <h3 className="text-xl font-semibold mb-4">
          {currentPlan ? 'Cambiar de Plan' : 'Elige tu Plan'}
        </h3>
        <PricingCards
          currentPlan={currentPlan}
          onSelect={handleSelectPlan}
          mode="dashboard"
          loading={loading}
        />
      </div>
    </div>
  )
}
