'use client'

import { useState } from 'react'
import { Calendar, XCircle, AlertTriangle } from 'lucide-react'
import { PricingCards } from '@/components/pricing/pricing-cards'

interface SubscriptionGateProps {
  planName: string | null
  status: string
  trialEndsAt?: string | null
}

export function SubscriptionGate({ planName, status, trialEndsAt }: SubscriptionGateProps) {
  const [loading, setLoading] = useState<string | null>(null)

  const handleSelectPlan = async (planId: string, annual = false) => {
    setLoading(planId)
    try {
      const res = await fetch('/api/mp/create-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, annual }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else alert(data.error || 'Error al procesar. Intenta de nuevo.')
    } catch {
      alert('Error al procesar. Intenta de nuevo.')
    }
    setLoading(null)
  }

  const isCanceled = status === 'canceled'
  const isPastDue = status === 'past_due'

  const config = isCanceled
    ? {
        icon: XCircle,
        iconColor: 'text-red-600',
        iconBg: 'bg-red-100',
        borderColor: 'border-red-200',
        bgColor: 'bg-red-50',
        titleColor: 'text-red-800',
        textColor: 'text-red-700',
        title: 'Suscripción cancelada',
        description:
          'Tu suscripción fue cancelada. Elige un plan para volver a acceder a todas las funciones. Tus datos están seguros.',
      }
    : isPastDue
    ? {
        icon: AlertTriangle,
        iconColor: 'text-yellow-600',
        iconBg: 'bg-yellow-100',
        borderColor: 'border-yellow-200',
        bgColor: 'bg-yellow-50',
        titleColor: 'text-yellow-800',
        textColor: 'text-yellow-700',
        title: 'Pago pendiente — acceso restringido',
        description:
          'Hay un pago pendiente en tu suscripción. Renueva tu plan para recuperar el acceso completo a la plataforma.',
      }
    : {
        icon: Calendar,
        iconColor: 'text-amber-600',
        iconBg: 'bg-amber-100',
        borderColor: 'border-amber-200',
        bgColor: 'bg-amber-50',
        titleColor: 'text-amber-800',
        textColor: 'text-amber-700',
        title: 'Tu período de prueba ha terminado',
        description:
          'Gracias por probar Altaprop. Para continuar gestionando tus propiedades, postulaciones y agentes, selecciona un plan a continuación. Todos tus datos están seguros.',
      }

  const Icon = config.icon

  return (
    <div className="space-y-8">
      {/* Blocking banner */}
      <div className={`rounded-xl border-2 p-6 ${config.borderColor} ${config.bgColor}`}>
        <div className="flex items-start gap-4">
          <div className={`rounded-full p-3 ${config.iconBg} shrink-0`}>
            <Icon className={`h-6 w-6 ${config.iconColor}`} />
          </div>
          <div className="space-y-1">
            <h2 className={`text-xl font-bold ${config.titleColor}`}>{config.title}</h2>
            <p className={`text-sm leading-relaxed ${config.textColor}`}>{config.description}</p>
          </div>
        </div>
      </div>

      {/* Plan selection */}
      <div>
        <h3 className="text-xl font-semibold text-navy mb-1">Elige tu Plan</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Todos los planes incluyen acceso completo a propiedades, postulaciones y visitas.
        </p>
        <PricingCards
          currentPlan={planName}
          onSelect={handleSelectPlan}
          mode="dashboard"
          loading={loading}
        />
      </div>
    </div>
  )
}
