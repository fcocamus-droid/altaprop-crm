import { getUserProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getSubscriptionDetails, getSubscriptionEvents } from '@/lib/actions/billing'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckoutButton } from '@/components/billing/checkout-button'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Facturación - Altaprop' }

const PLANS = [
  {
    id: 'basico',
    name: 'Básico',
    monthlyPrice: 27550,
    annualPrice: 263280,
    maxAgents: 1,
    features: [
      'Hasta 1 agente',
      'Hasta 50 propiedades',
      'Gestión de visitas',
      'Portal de propiedades',
      'Soporte por email',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyPrice: 46550,
    annualPrice: 446880,
    maxAgents: 3,
    popular: true,
    features: [
      'Hasta 3 agentes',
      'Propiedades ilimitadas',
      'Gestión de visitas',
      'Portal de propiedades',
      'Importación automática',
      'Reportes avanzados',
      'Soporte prioritario',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    monthlyPrice: 94050,
    annualPrice: 902880,
    maxAgents: 10,
    features: [
      'Hasta 10 agentes',
      'Propiedades ilimitadas',
      'Gestión de visitas',
      'Portal de propiedades',
      'Importación automática',
      'Reportes avanzados',
      'API access',
      'Soporte dedicado',
      'Personalización de marca',
    ],
  },
]

function formatCLP(amount: number) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
  }).format(amount)
}

function StatusBadge({ status }: { status: string | null }) {
  const variants: Record<string, string> = {
    active: 'bg-green-100 text-green-700 border-green-300',
    trialing: 'bg-blue-100 text-blue-700 border-blue-300',
    past_due: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    canceled: 'bg-red-100 text-red-700 border-red-300',
    inactive: 'bg-gray-100 text-gray-700 border-gray-300',
  }
  const labels: Record<string, string> = {
    active: 'Activo',
    trialing: 'Prueba',
    past_due: 'Pago pendiente',
    canceled: 'Cancelado',
    inactive: 'Inactivo',
  }
  const key = status || 'inactive'
  return (
    <Badge variant="outline" className={variants[key] || variants.inactive}>
      {labels[key] || key}
    </Badge>
  )
}

function formatDate(date: string | null) {
  if (!date) return '-'
  return new Intl.DateTimeFormat('es-CL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date))
}

export default async function BillingPage() {
  const profile = await getUserProfile()
  if (!profile) redirect('/login')

  const org = await getSubscriptionDetails()
  const events = await getSubscriptionEvents()

  const currentPlan = org?.plan || 'basico'
  const subscriptionStatus = org?.subscription_status || 'inactive'
  const orgId = org?.id || (profile as any).org_id || ''

  return (
    <div>
      <PageHeader
        title="Facturación"
        description="Administra tu plan y método de pago"
      />

      <div className="space-y-8 max-w-6xl">
        {/* Current Plan Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tu Suscripción</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Plan actual</p>
                <p className="text-2xl font-bold capitalize">{currentPlan}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estado</p>
                <div className="mt-1">
                  <StatusBadge status={subscriptionStatus} />
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Agentes</p>
                <p className="text-2xl font-bold">
                  {org?.agent_count ?? 0}{' '}
                  <span className="text-base font-normal text-muted-foreground">
                    / {org?.max_agents ?? 1} máx
                  </span>
                </p>
              </div>
            </div>
            {org?.trial_ends_at && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-700">
                  Tu periodo de prueba termina el{' '}
                  <strong>{formatDate(org.trial_ends_at)}</strong>
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Plan Cards */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Planes disponibles</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLANS.map((plan) => {
              const isCurrent = plan.id === currentPlan
              return (
                <Card
                  key={plan.id}
                  className={`relative ${
                    plan.popular
                      ? 'border-2 border-navy shadow-lg'
                      : isCurrent
                      ? 'border-2 border-green-400'
                      : ''
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-navy text-white">
                        Más popular
                      </Badge>
                    </div>
                  )}
                  {isCurrent && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-green-600 text-white">
                        Tu plan actual
                      </Badge>
                    </div>
                  )}
                  <CardHeader className="pt-6">
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <CardDescription>
                      <span className="text-2xl font-bold text-foreground">
                        {formatCLP(plan.monthlyPrice)}
                      </span>
                      <span className="text-muted-foreground"> /mes</span>
                    </CardDescription>
                    <p className="text-xs text-muted-foreground">
                      o {formatCLP(plan.annualPrice)} /año (ahorra{' '}
                      {Math.round(
                        (1 - plan.annualPrice / (plan.monthlyPrice * 12)) * 100
                      )}
                      %)
                    </p>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {plan.features.map((feature) => (
                        <li
                          key={feature}
                          className="flex items-center gap-2 text-sm"
                        >
                          <svg
                            className="h-4 w-4 text-green-500 flex-shrink-0"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter className="flex flex-col gap-2">
                    <CheckoutButton
                      plan={plan.id}
                      billing="monthly"
                      orgId={orgId}
                      currentPlan={currentPlan}
                    />
                    {!isCurrent && (
                      <CheckoutButton
                        plan={plan.id}
                        billing="annual"
                        orgId={orgId}
                        currentPlan={currentPlan}
                      />
                    )}
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Payment History */}
        {events && events.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Historial de pagos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 font-medium">Fecha</th>
                      <th className="text-left py-2 font-medium">Evento</th>
                      <th className="text-left py-2 font-medium">Plan</th>
                      <th className="text-right py-2 font-medium">Monto</th>
                      <th className="text-left py-2 font-medium">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((event: any) => (
                      <tr key={event.id} className="border-b last:border-0">
                        <td className="py-2">
                          {formatDate(event.created_at)}
                        </td>
                        <td className="py-2 capitalize">
                          {event.event_type?.replace('payment.', '') || '-'}
                        </td>
                        <td className="py-2 capitalize">
                          {event.plan || '-'}
                        </td>
                        <td className="py-2 text-right">
                          {event.amount
                            ? formatCLP(event.amount)
                            : '-'}
                        </td>
                        <td className="py-2">
                          <StatusBadge status={event.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
