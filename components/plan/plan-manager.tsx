'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PricingCards } from '@/components/pricing/pricing-cards'
import { PLANS } from '@/lib/constants'
import { CreditCard, Calendar, AlertTriangle, CheckCircle } from 'lucide-react'

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
      return { label: 'Cancelado', color: 'bg-red-100 text-red-800', icon: AlertTriangle }
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
  const plan = PLANS.find(p => p.id === currentPlan)
  const status = getStatusBadge(subscriptionStatus)
  const StatusIcon = status.icon

  const handleSelectPlan = async (planId: string) => {
    setLoading(planId)
    try {
      const res = await fetch('/api/mp/create-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
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
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
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
                  ${plan.price} USD/mes - {plan.agents} {plan.agents === 1 ? 'agente' : 'agentes'} incluidos
                </p>
              )}
              {subscriptionStatus === 'trialing' && trialEndsAt && (
                <p className="text-sm text-blue-600 mt-1">
                  Tu prueba gratuita termina en {getDaysRemaining(trialEndsAt)} dias ({formatDate(trialEndsAt)})
                </p>
              )}
              {subscriptionStatus === 'active' && subscriptionEndsAt && (
                <p className="text-sm text-muted-foreground mt-1">
                  Proxima renovacion: {formatDate(subscriptionEndsAt)}
                </p>
              )}
            </div>
          </div>
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
