'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Crown, CreditCard, Calendar, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { PLANS } from '@/lib/constants'

interface Subscriber {
  id: string
  full_name: string | null
  phone: string | null
  email: string
  plan: string | null
  subscription_status: string
  trial_ends_at: string | null
  subscription_ends_at: string | null
  max_agents: number
  created_at: string
}

function getStatusInfo(status: string) {
  switch (status) {
    case 'active':
      return { label: 'Activo', color: 'bg-green-100 text-green-800', icon: CheckCircle }
    case 'trialing':
      return { label: 'Prueba', color: 'bg-blue-100 text-blue-800', icon: Calendar }
    case 'past_due':
      return { label: 'Pago Pendiente', color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle }
    case 'canceled':
      return { label: 'Cancelado', color: 'bg-red-100 text-red-800', icon: XCircle }
    default:
      return { label: 'Sin Plan', color: 'bg-gray-100 text-gray-800', icon: CreditCard }
  }
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('es-CL', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

export function SubscriberList({ subscribers }: { subscribers: Subscriber[] }) {
  const activeCount = subscribers.filter(s => s.subscription_status === 'active').length
  const trialingCount = subscribers.filter(s => s.subscription_status === 'trialing').length
  const totalRevenue = subscribers
    .filter(s => s.subscription_status === 'active')
    .reduce((sum, s) => {
      const plan = PLANS.find(p => p.id === s.plan)
      return sum + (plan?.price || 0)
    }, 0)

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-navy">{subscribers.length}</p>
            <p className="text-xs text-muted-foreground">Total Suscriptores</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-green-600">{activeCount}</p>
            <p className="text-xs text-muted-foreground">Activos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{trialingCount}</p>
            <p className="text-xs text-muted-foreground">En Prueba</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-gold-dark">${totalRevenue}</p>
            <p className="text-xs text-muted-foreground">MRR (USD)</p>
          </CardContent>
        </Card>
      </div>

      {/* Subscriber List */}
      <div className="space-y-3">
        {subscribers.map((sub) => {
          const status = getStatusInfo(sub.subscription_status)
          const StatusIcon = status.icon
          const plan = PLANS.find(p => p.id === sub.plan)

          return (
            <Card key={sub.id}>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-navy/10 flex items-center justify-center flex-shrink-0">
                      <Crown className="h-5 w-5 text-navy" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{sub.full_name || 'Sin nombre'}</p>
                      <p className="text-xs text-muted-foreground truncate">{sub.email}</p>
                      <p className="text-xs text-muted-foreground">{sub.phone || 'Sin telefono'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    {plan ? (
                      <span className="text-xs font-medium px-3 py-1.5 rounded-full bg-navy/10 text-navy">
                        {plan.name} - ${plan.price}/mes
                      </span>
                    ) : (
                      <span className="text-xs font-medium px-3 py-1.5 rounded-full bg-gray-100 text-gray-600">
                        Sin plan
                      </span>
                    )}
                    <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium ${status.color}`}>
                      <StatusIcon className="h-3 w-3" />
                      {status.label}
                    </span>
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      {formatDate(sub.created_at)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}

        {subscribers.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Crown className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No hay suscriptores aun</p>
            <p className="text-sm">Los clientes que se registren apareceran aqui</p>
          </div>
        )}
      </div>
    </div>
  )
}
