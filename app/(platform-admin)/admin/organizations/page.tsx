import { getAllOrganizations } from '@/lib/queries/platform'
import Link from 'next/link'
import { Search, Building2 } from 'lucide-react'

export default async function OrganizationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const params = await searchParams
  const search = params.q || ''
  const organizations = await getAllOrganizations(search)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0f1a2e]">Organizaciones</h1>
        <p className="text-slate-500 mt-1">
          Gestiona todas las organizaciones de la plataforma
        </p>
      </div>

      {/* Search */}
      <form className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            name="q"
            defaultValue={search}
            placeholder="Buscar por nombre o slug..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a94e]/50 focus:border-[#c9a94e]"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2.5 bg-[#0f1a2e] text-white text-sm font-medium rounded-lg hover:bg-[#1a2a4a] transition-colors"
        >
          Buscar
        </button>
      </form>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left">
                <th className="px-6 py-3 font-semibold text-slate-600">Nombre</th>
                <th className="px-6 py-3 font-semibold text-slate-600">Slug</th>
                <th className="px-6 py-3 font-semibold text-slate-600">Plan</th>
                <th className="px-6 py-3 font-semibold text-slate-600">Estado</th>
                <th className="px-6 py-3 font-semibold text-slate-600">Agentes</th>
                <th className="px-6 py-3 font-semibold text-slate-600">Creado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {organizations.map((org: any) => (
                <tr
                  key={org.id}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <Link
                      href={`/admin/organizations/${org.id}`}
                      className="font-medium text-[#0f1a2e] hover:text-[#c9a94e] transition-colors flex items-center gap-2"
                    >
                      <Building2 className="h-4 w-4 text-slate-400" />
                      {org.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-slate-500 font-mono text-xs">
                    {org.slug}
                  </td>
                  <td className="px-6 py-4">
                    <span className="capitalize text-slate-700 font-medium">
                      {org.plan || '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={org.subscription_status} />
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {org.max_agents ?? '-'}
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    {org.created_at
                      ? new Date(org.created_at).toLocaleDateString('es-CL')
                      : '-'}
                  </td>
                </tr>
              ))}
              {organizations.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-slate-400"
                  >
                    {search
                      ? `No se encontraron resultados para "${search}"`
                      : 'No hay organizaciones registradas'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Count footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 text-xs text-slate-500">
          {organizations.length} organizacion{organizations.length !== 1 ? 'es' : ''}
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
