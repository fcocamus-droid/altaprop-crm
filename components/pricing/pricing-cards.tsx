'use client'

import { useState } from 'react'
import Link from 'next/link'
import { PLANS } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle } from 'lucide-react'

const IVA = 1.19
const ANNUAL_DISCOUNT = 0.80 // 20% off monthly price

function fmt(n: number) {
  return n % 1 === 0 ? n.toString() : n.toFixed(2)
}

interface PricingCardsProps {
  currentPlan?: string | null
  onSelect?: (planId: string, annual: boolean) => void
  mode?: 'landing' | 'dashboard'
  loading?: string | null
}

export function PricingCards({ currentPlan, onSelect, mode = 'landing', loading }: PricingCardsProps) {
  const [annual, setAnnual] = useState(false)

  return (
    <div>
      {/* Annual / Monthly toggle */}
      <div className="flex items-center justify-center flex-wrap gap-3 mb-8">
        <span className={`text-sm font-medium ${!annual ? 'text-navy' : 'text-muted-foreground'}`}>
          Pago mensual
        </span>

        <button
          type="button"
          role="switch"
          aria-checked={annual}
          onClick={() => setAnnual(v => !v)}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
            annual ? 'bg-indigo-500' : 'bg-gray-300'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              annual ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>

        <span className={`text-sm font-medium ${annual ? 'text-navy' : 'text-muted-foreground'}`}>
          Pago anual
        </span>

        {annual && (
          <span className="bg-indigo-100 text-indigo-700 text-xs font-semibold px-3 py-1 rounded-full">
            Ahorra hasta un 20% con pago anual
          </span>
        )}
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {PLANS.map((plan) => {
          const isCurrentPlan = currentPlan === plan.id
          const isRecommended = 'recommended' in plan && plan.recommended

          // Prices
          const monthlyBase = annual ? plan.price * ANNUAL_DISCOUNT : plan.price
          const totalWithIva = annual
            ? monthlyBase * 12 * IVA          // yearly charge
            : monthlyBase * IVA               // monthly charge
          const savingsPerYear = annual
            ? Math.round((plan.price * 12 - plan.price * ANNUAL_DISCOUNT * 12) * 100) / 100
            : 0

          return (
            <Card
              key={plan.id}
              className={`relative flex flex-col transition-all hover:shadow-lg ${
                isRecommended ? 'border-2 border-gold shadow-md scale-[1.02]' : ''
              } ${isCurrentPlan ? 'border-2 border-navy bg-navy/5' : ''}`}
            >
              {isRecommended && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gold text-navy text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap">
                  Recomendado
                </div>
              )}

              {annual && (
                <div className="absolute -top-3 right-3 bg-indigo-500 text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
                  -20%
                </div>
              )}

              <CardHeader className="text-center pb-2">
                <CardTitle className="text-lg">{plan.name}</CardTitle>

                {/* Price display */}
                <div className="mt-2 flex items-end justify-center gap-1">
                  <span className="text-4xl font-bold text-navy">${fmt(monthlyBase)}</span>
                  <div className="flex flex-col items-start pb-1">
                    <span className="text-muted-foreground text-xs leading-tight">USD/mes</span>
                    <span className="text-muted-foreground text-xs leading-tight">+ IVA</span>
                  </div>
                </div>

                {/* Billing detail */}
                {annual ? (
                  <div className="mt-1 space-y-0.5">
                    <p className="text-xs text-indigo-600 font-medium">
                      ${fmt(Math.round(totalWithIva * 100) / 100)} USD/año (IVA incl.)
                    </p>
                    <p className="text-xs text-green-600 font-medium">
                      Ahorras ${fmt(savingsPerYear)} USD al año
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1">
                    Total mensual: ${fmt(Math.round(totalWithIva * 100) / 100)} USD (IVA incl.)
                  </p>
                )}

                <p className="text-sm text-muted-foreground mt-2">
                  {plan.agents} {plan.agents === 1 ? 'agente' : 'agentes'} incluidos
                </p>

                {plan.trial && !annual && (
                  <p className="text-xs text-gold font-medium mt-1">
                    {plan.trialDays} días de prueba gratis
                  </p>
                )}
              </CardHeader>

              <CardContent className="flex-1 flex flex-col">
                <ul className="space-y-2 flex-1 mb-4">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {isCurrentPlan ? (
                  <Button disabled className="w-full bg-navy/20 text-navy">
                    Plan Actual
                  </Button>
                ) : mode === 'landing' ? (
                  <Button
                    asChild
                    className={`w-full ${
                      isRecommended
                        ? 'bg-gold text-navy hover:bg-gold/90'
                        : 'bg-navy hover:bg-navy/90'
                    }`}
                  >
                    <Link href={`/register?plan=${plan.id}&annual=${annual}`}>
                      {!annual && plan.trial ? 'Prueba Gratis' : annual ? 'Suscribirse anual' : 'Comenzar'}
                    </Link>
                  </Button>
                ) : (
                  <Button
                    onClick={() => onSelect?.(plan.id, annual)}
                    disabled={loading === plan.id}
                    className={`w-full ${
                      isRecommended
                        ? 'bg-gold text-navy hover:bg-gold/90'
                        : 'bg-navy hover:bg-navy/90'
                    }`}
                  >
                    {loading === plan.id
                      ? 'Procesando...'
                      : annual
                      ? 'Suscribirse anual'
                      : 'Cambiar Plan'}
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
