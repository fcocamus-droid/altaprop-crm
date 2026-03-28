'use client'

import { PLANS } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle } from 'lucide-react'

interface PricingCardsProps {
  currentPlan?: string | null
  onSelect?: (planId: string) => void
  mode?: 'landing' | 'dashboard'
  loading?: string | null
}

export function PricingCards({ currentPlan, onSelect, mode = 'landing', loading }: PricingCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {PLANS.map((plan) => {
        const isCurrentPlan = currentPlan === plan.id
        const isRecommended = 'recommended' in plan && plan.recommended

        return (
          <Card
            key={plan.id}
            className={`relative flex flex-col transition-all hover:shadow-lg ${
              isRecommended ? 'border-2 border-gold shadow-md scale-[1.02]' : ''
            } ${isCurrentPlan ? 'border-2 border-navy bg-navy/5' : ''}`}
          >
            {isRecommended && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gold text-navy text-xs font-bold px-4 py-1 rounded-full">
                Recomendado
              </div>
            )}

            <CardHeader className="text-center pb-2">
              <CardTitle className="text-lg">{plan.name}</CardTitle>
              <div className="mt-2">
                <span className="text-4xl font-bold text-navy">${plan.price}</span>
                <span className="text-muted-foreground text-sm"> USD/mes</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {plan.agents} {plan.agents === 1 ? 'agente' : 'agentes'} incluidos
              </p>
              {plan.trial && (
                <p className="text-xs text-gold font-medium mt-1">
                  {plan.trialDays} dias de prueba gratis
                </p>
              )}
            </CardHeader>

            <CardContent className="flex-1 flex flex-col">
              <ul className="space-y-2 flex-1 mb-4">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {isCurrentPlan ? (
                <Button disabled className="w-full bg-navy/20 text-navy">
                  Plan Actual
                </Button>
              ) : (
                <Button
                  onClick={() => onSelect?.(plan.id)}
                  disabled={loading === plan.id}
                  className={`w-full ${
                    isRecommended
                      ? 'bg-gold text-navy hover:bg-gold/90'
                      : 'bg-navy hover:bg-navy/90'
                  }`}
                >
                  {loading === plan.id
                    ? 'Procesando...'
                    : mode === 'dashboard'
                    ? 'Cambiar Plan'
                    : plan.trial
                    ? 'Prueba Gratis'
                    : 'Comenzar'}
                </Button>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
