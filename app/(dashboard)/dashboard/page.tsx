import { getUserProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getPropertyStats } from '@/lib/queries/properties'
import { getApplicationStats } from '@/lib/queries/applications'
import { isPropertyManager, ROLE_LABELS } from '@/lib/constants'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Building2, FileText, Users, Plus, TrendingUp, Clock, CheckCircle, XCircle } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Panel Principal' }

export default async function DashboardPage({ searchParams }: { searchParams: { plan_activated?: string } }) {
  const profile = await getUserProfile()
  if (!profile) redirect('/login')

  const isOwnerOrAgent = isPropertyManager(profile.role)
  const ownerId = profile.role === 'PROPIETARIO' ? profile.id : undefined
  const subscriberId = profile.role === 'SUPERADMIN' ? (profile.subscriber_id || profile.id) : undefined

  let propertyStats = { total: 0, available: 0, reserved: 0, rented: 0, sold: 0 }
  let appStats = { total: 0, pending: 0, reviewing: 0, approved: 0, rejected: 0 }

  try {
    const [pStats, aStats] = await Promise.all([
      isOwnerOrAgent ? getPropertyStats(ownerId, subscriberId) : Promise.resolve(propertyStats),
      getApplicationStats(ownerId, subscriberId),
    ])
    propertyStats = pStats
    appStats = aStats
  } catch {
    // Supabase may not be configured yet
  }

  const roleLabels = ROLE_LABELS

  return (
    <div>
      <PageHeader
        title={`Hola, ${profile.full_name || 'Usuario'}`}
        description={`Panel de ${roleLabels[profile.role] || profile.role}`}
      >
        {isOwnerOrAgent && (
          <Button asChild>
            <Link href="/dashboard/propiedades/nueva"><Plus className="mr-2 h-4 w-4" />Nueva Propiedad</Link>
          </Button>
        )}
      </PageHeader>

      {searchParams.plan_activated === 'true' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center gap-3">
          <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-green-800">Plan activado exitosamente</p>
            <p className="text-sm text-green-700">Tu prueba gratuita ha comenzado. Ya puedes usar todas las funciones del CRM.</p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      {isOwnerOrAgent && (
        <>
          <h3 className="font-semibold mb-3">Propiedades</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent><p className="text-2xl font-bold">{propertyStats.total}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Disponibles</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent><p className="text-2xl font-bold text-green-600">{propertyStats.available}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Reservadas</CardTitle>
                <Clock className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent><p className="text-2xl font-bold text-yellow-600">{propertyStats.reserved}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Arrendadas/Vendidas</CardTitle>
                <CheckCircle className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent><p className="text-2xl font-bold text-blue-600">{propertyStats.rented + propertyStats.sold}</p></CardContent>
            </Card>
          </div>
        </>
      )}

      <h3 className="font-semibold mb-3">Postulaciones</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{appStats.total}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold text-yellow-600">{appStats.pending}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aprobadas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold text-green-600">{appStats.approved}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rechazadas</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold text-red-600">{appStats.rejected}</p></CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <h3 className="font-semibold mb-3">Acciones Rapidas</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {isOwnerOrAgent && (
          <>
            <Button asChild variant="outline" className="h-auto py-4 justify-start">
              <Link href="/dashboard/propiedades" className="flex items-center gap-3">
                <Building2 className="h-5 w-5" />
                <div className="text-left"><p className="font-medium">Mis Propiedades</p><p className="text-xs text-muted-foreground">Gestiona tus propiedades publicadas</p></div>
              </Link>
            </Button>
          </>
        )}
        <Button asChild variant="outline" className="h-auto py-4 justify-start">
          <Link href="/dashboard/postulaciones" className="flex items-center gap-3">
            <FileText className="h-5 w-5" />
            <div className="text-left"><p className="font-medium">Postulaciones</p><p className="text-xs text-muted-foreground">{isOwnerOrAgent ? 'Revisa las postulaciones recibidas' : 'Revisa el estado de tus postulaciones'}</p></div>
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-auto py-4 justify-start">
          <Link href="/propiedades" className="flex items-center gap-3">
            <TrendingUp className="h-5 w-5" />
            <div className="text-left"><p className="font-medium">Explorar Propiedades</p><p className="text-xs text-muted-foreground">Busca propiedades disponibles</p></div>
          </Link>
        </Button>
      </div>
    </div>
  )
}
