import { getPlatformStats, getAllOrganizations } from '@/lib/queries/platform'
import {
  Building2,
  CheckCircle2,
  Clock,
  DollarSign,
} from 'lucide-react'
import Link from 'next/link'

export default async function AdminDashboardPage() {
  const stats = await getPlatformStats()
  const recentOrgs = await getAllOrganizations()
  const last10 = recentOrgs.slice(0, 10)

  const kpis = [
    {
      label: 'Total Organizaciones',
      value: stats.totalOrgs,
      icon: Building2,
      color: 'bg-blue-500',
    },
    {
      label: 'Suscripciones Activas',
      value: stats.activeOrgs,
      icon: CheckCircle2,
      color: 'bg-emerald-500',
    },
    {
      label: 'En Trial',
      value: stats.trialingOrgs,
      icon: Clock,
      color: 'bg-amber-500',
    },
    {
      label: 'MRR Estimado',
      value: `$${stats.mrr.toLocaleString()} USD`,
      icon: DollarSign,
      color: 'bg-[#c9a94e]',
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#0f1a2e]">Dashboard</h1>
        <p className="text-slate-500 mt-1">
          Vista general de la plataforma Altaprop
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div
                className={`${kpi.color} h-12 w-12 rounded-lg flex items-center justify-center`}
              >
                <kpi.icon className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-500">{kpi.label}</p>
                <p className="text-2xl font-bold text-[#0f1a2e]">
                  {kpi.value}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Organizations */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#0f1a2e]">
            Organizaciones Recientes
          </h2>
          <Link
            href="/admin/organizations"
            className="text-sm text-[#c9a94e] hover:text-[#b8982e] font-medium"
          >
            Ver todas &rarr;
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left">
                <th className="px-6 py-3 font-medium text-slate-500">Nombre</th>
                <th className="px-6 py-3 font-medium text-slate-500">Plan</th>
                <th className="px-6 py-3 font-medium text-slate-500">Estado</th>
                <th className="px-6 py-3 font-medium text-slate-500">Creado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {last10.map((org: any) => (
                <tr key={org.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3 font-medium text-[#0f1a2e]">
                    <Link
                      href={`/admin/organizations/${org.id}`}
                      className="hover:text-[#c9a94e] transition-colors"
                    >
                      {org.name}
                    </Link>
                  </td>
                  <td className="px-6 py-3 text-slate-600 capitalize">
                    {org.plan || '-'}
                  </td>
                  <td className="px-6 py-3">
                    <StatusBadge status={org.subscription_status} />
                  </td>
                  <td className="px-6 py-3 text-slate-500">
                    {org.created_at
                      ? new Date(org.created_at).toLocaleDateString('es-CL')
                      : '-'}
                  </td>
                </tr>
              ))}
              {last10.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-400">
                    No hay organizaciones registradas
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string | null }) {
  const styles: Record<string, string> = {
    trialing: 'bg-blue-100 text-blue-700',
    active: 'bg-emerald-100 text-emerald-700',
    canceled: 'bg-red-100 text-red-700',
  }
  const label: Record<string, string> = {
    trialing: 'Trial',
    active: 'Activo',
    canceled: 'Cancelado',
  }
  const s = status || 'unknown'
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        styles[s] || 'bg-slate-100 text-slate-600'
      }`}
    >
      {label[s] || s}
    </span>
  )
}
