'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PLANS } from '@/lib/constants'
import { CheckCircle, CreditCard, Zap } from 'lucide-react'
import { signOut } from '@/lib/auth-actions'

export default function ActivarPlanPage() {
  const [loading, setLoading] = useState<string | null>(null)
  const router = useRouter()

  async function handleSelectPlan(planId: string) {
    setLoading(planId)
    const plan = PLANS.find(p => p.id === planId)
    if (!plan) return

    if (plan.trial) {
      // Plans with trial: activate trial immediately
      const res = await fetch('/api/mp/activate-trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      })
      const data = await res.json()
      if (data.success) {
        router.push('/dashboard')
        router.refresh()
      }
    } else {
      // Started plan: redirect to Mercado Pago
      const res = await fetch('/api/mp/create-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    }
    setLoading(null)
  }

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4">
      <div className="text-center mb-8">
        <CreditCard className="h-12 w-12 text-gold mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-navy mb-2">Activa tu Plan</h1>
        <p className="text-muted-foreground max-w-lg">
          Selecciona un plan para comenzar a usar el CRM. Los planes Basico, Pro y Enterprise incluyen 7 dias de prueba gratis.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl w-full">
        {PLANS.map((plan) => {
          const isRecommended = 'recommended' in plan && plan.recommended
          return (
            <Card key={plan.id} className={`relative flex flex-col ${isRecommended ? 'border-2 border-gold shadow-lg scale-[1.02]' : ''}`}>
              {isRecommended && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gold text-navy text-xs font-bold px-4 py-1 rounded-full">
                  Recomendado
                </div>
              )}
              <CardHeader className="text-center pb-2">
                <CardTitle>{plan.name}</CardTitle>
                <div className="mt-2">
                  <span className="text-4xl font-bold text-navy">${plan.price}</span>
                  <span className="text-muted-foreground text-sm"> USD/mes</span>
                </div>
                <p className="text-sm text-muted-foreground">{plan.agents} {plan.agents === 1 ? 'agente' : 'agentes'}</p>
                {plan.trial && <p className="text-xs text-gold font-medium">{plan.trialDays} dias gratis</p>}
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <ul className="space-y-2 flex-1 mb-4">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={loading === plan.id}
                  className={`w-full ${isRecommended ? 'bg-gold text-navy hover:bg-gold/90' : 'bg-navy hover:bg-navy/90'}`}
                >
                  {loading === plan.id ? 'Procesando...' : plan.trial ? (
                    <><Zap className="mr-2 h-4 w-4" />Prueba Gratis</>
                  ) : (
                    <><CreditCard className="mr-2 h-4 w-4" />Pagar ${plan.price}</>
                  )}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <form action={signOut} className="mt-6">
        <Button variant="ghost" type="submit" className="text-muted-foreground">
          Cerrar sesion
        </Button>
      </form>
    </div>
  )
}
