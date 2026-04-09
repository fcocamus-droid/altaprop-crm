'use client'

import { useEffect, useState, useTransition } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Building2,
  Users,
  CreditCard,
  Globe,
  Calendar,
  AlertTriangle,
  Clock,
  RefreshCw,
} from 'lucide-react'
import {
  disableOrganization,
  extendTrial,
  changeOrgPlan,
} from '@/lib/actions/platform'
import { createClient } from '@/lib/supabase/client'

interface Organization {
  id: string
  name: string
  slug: string
  custom_domain: string | null
  plan: string | null
  subscription_status: string | null
  max_agents: number | null
  trial_ends_at: string | null
  created_at: string
}

interface Member {
  id: string
  org_role: string
  profile: { full_name: string | null; phone: string | null; role: string } | null
}

interface SubEvent {
  id: string
  event_type: string
  plan: string | null
  created_at: string
  metadata: any
}

export default function OrganizationDetailPage() {
  const params = useParams()
  const router = useRouter()
  const orgId = params.id as string
  const [isPending, startTransition] = useTransition()

  const [org, setOrg] = useState<Organization | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [events, setEvents] = useState<SubEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [trialDays, setTrialDays] = useState(14)
  const [selectedPlan, setSelectedPlan] = useState('')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [{ data: orgData }, { data: membersData }, { data: eventsData }] =
        await Promise.all([
          supabase.from('organizations').select('*').eq('id', orgId).single(),
          supabase
            .from('org_members')
            .select('*, profile:profiles(full_name, phone, role)')
            .eq('org_id', orgId),
          supabase
            .from('subscription_events')
            .select('*')
            .eq('org_id', orgId)
            .order('created_at', { ascending: false })
            .limit(20),
        ])
      setOrg(orgData)
      setMembers(membersData || [])
      setEvents(eventsData || [])
      if (orgData?.plan) setSelectedPlan(orgData.plan)
      setLoading(false)
    }
    load()
  }, [orgId])

  function handleDisable() {
    if (!confirm('Estas seguro de deshabilitar esta organizacion?')) return
    startTransition(async () => {
      await disableOrganization(orgId)
      router.refresh()
      setOrg((prev) => prev ? { ...prev, subscription_status: 'canceled' } : prev)
    })
  }

  function handleExtendTrial() {
    startTransition(async () => {
      await extendTrial(orgId, trialDays)
      router.refresh()
      setOrg((prev) =>
        prev
          ? {
              ...prev,
              subscription_status: 'trialing',
              trial_ends_at: new Date(
                Date.now() + trialDays * 86400000
              ).toISOString(),
            }
          : prev
      )
    })
  }

  function handleChangePlan() {
    if (!selectedPlan) return
    startTransition(async () => {
      await changeOrgPlan(orgId, selectedPlan)
      router.refresh()
      const maxAgents =
        selectedPlan === 'basico' ? 1 : selectedPlan === 'pro' ? 3 : 10
      setOrg((prev) =>
        prev ? { ...prev, plan: selectedPlan, max_agents: maxAgents } : prev
      )
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    )
  }

  if (!org) {
    return (
      <div className="text-center py-20 text-slate-500">
        Organizacion no encontrada
      </div>
    )
  }

  const statusStyles: Record<string, string> = {
    trialing: 'bg-blue-100 text-blue-700',
    active: 'bg-emerald-100 text-emerald-700',
    canceled: 'bg-red-100 text-red-700',
  }
  const statusLabel: Record<string, string> = {
    trialing: 'Trial',
    active: 'Activo',
    canceled: 'Cancelado',
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/organizations"
          className="h-9 w-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-[#0f1a2e] hover:border-slate-300 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[#0f1a2e]">{org.name}</h1>
          <p className="text-slate-500 text-sm font-mono">{org.slug}</p>
        </div>
        <span
          className={`ml-auto inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            statusStyles[org.subscription_status || ''] ||
            'bg-slate-100 text-slate-600'
          }`}
        >
          {statusLabel[org.subscription_status || ''] ||
            org.subscription_status ||
            'Sin estado'}
        </span>
      </div>

      {/* Org Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Details Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-[#0f1a2e] mb-4 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-[#c9a94e]" />
              Informacion de la Organizacion
            </h2>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-slate-500">Nombre</dt>
                <dd className="font-medium text-[#0f1a2e]">{org.name}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Slug</dt>
                <dd className="font-mono text-[#0f1a2e]">{org.slug}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Dominio personalizado</dt>
                <dd className="text-[#0f1a2e]">{org.custom_domain || '-'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Plan</dt>
                <dd className="capitalize font-medium text-[#0f1a2e]">
                  {org.plan || '-'}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Max agentes</dt>
                <dd className="text-[#0f1a2e]">{org.max_agents ?? '-'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Trial hasta</dt>
                <dd className="text-[#0f1a2e]">
                  {org.trial_ends_at
                    ? new Date(org.trial_ends_at).toLocaleDateString('es-CL')
                    : '-'}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Creada</dt>
                <dd className="text-[#0f1a2e]">
                  {new Date(org.created_at).toLocaleDateString('es-CL')}
                </dd>
              </div>
            </dl>
          </div>

          {/* Members */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-[#0f1a2e] flex items-center gap-2">
                <Users className="h-5 w-5 text-[#c9a94e]" />
                Miembros ({members.length})
              </h2>
            </div>
            <div className="divide-y divide-slate-100">
              {members.map((m) => (
                <div
                  key={m.id}
                  className="px-6 py-3 flex items-center justify-between text-sm"
                >
                  <div>
                    <p className="font-medium text-[#0f1a2e]">
                      {m.profile?.full_name || 'Sin nombre'}
                    </p>
                    <p className="text-slate-500 text-xs">
                      {m.profile?.phone || ''}
                    </p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 uppercase">
                    {m.org_role}
                  </span>
                </div>
              ))}
              {members.length === 0 && (
                <div className="px-6 py-8 text-center text-slate-400 text-sm">
                  No hay miembros
                </div>
              )}
            </div>
          </div>

          {/* Subscription Events */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-[#0f1a2e] flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-[#c9a94e]" />
                Historial de Suscripcion
              </h2>
            </div>
            <div className="divide-y divide-slate-100">
              {events.map((ev) => (
                <div
                  key={ev.id}
                  className="px-6 py-3 flex items-center justify-between text-sm"
                >
                  <div>
                    <p className="font-medium text-[#0f1a2e] capitalize">
                      {ev.event_type}
                    </p>
                    <p className="text-slate-500 text-xs">
                      Plan: {ev.plan || '-'}
                    </p>
                  </div>
                  <span className="text-slate-400 text-xs">
                    {new Date(ev.created_at).toLocaleString('es-CL')}
                  </span>
                </div>
              ))}
              {events.length === 0 && (
                <div className="px-6 py-8 text-center text-slate-400 text-sm">
                  Sin eventos de suscripcion
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions Sidebar */}
        <div className="space-y-6">
          {/* Extend Trial */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-sm font-semibold text-[#0f1a2e] mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#c9a94e]" />
              Extender Trial
            </h3>
            <div className="flex items-center gap-2 mb-3">
              <input
                type="number"
                value={trialDays}
                onChange={(e) => setTrialDays(Number(e.target.value))}
                min={1}
                max={365}
                className="w-20 px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a94e]/50"
              />
              <span className="text-sm text-slate-500">dias</span>
            </div>
            <button
              onClick={handleExtendTrial}
              disabled={isPending}
              className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isPending ? 'Procesando...' : 'Extender Trial'}
            </button>
          </div>

          {/* Change Plan */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-sm font-semibold text-[#0f1a2e] mb-3 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-[#c9a94e]" />
              Cambiar Plan
            </h3>
            <select
              value={selectedPlan}
              onChange={(e) => setSelectedPlan(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-[#c9a94e]/50"
            >
              <option value="">Seleccionar plan</option>
              <option value="basico">Basico ($29/mes)</option>
              <option value="pro">Pro ($49/mes)</option>
              <option value="enterprise">Enterprise ($99/mes)</option>
            </select>
            <button
              onClick={handleChangePlan}
              disabled={isPending || !selectedPlan}
              className="w-full px-4 py-2 bg-[#0f1a2e] text-white text-sm font-medium rounded-lg hover:bg-[#1a2a4a] disabled:opacity-50 transition-colors"
            >
              {isPending ? 'Procesando...' : 'Cambiar Plan'}
            </button>
          </div>

          {/* Disable Org */}
          <div className="bg-white rounded-xl border border-red-200 shadow-sm p-6">
            <h3 className="text-sm font-semibold text-red-700 mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Zona de Peligro
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              Deshabilitar la organizacion cancela su suscripcion y bloquea el
              acceso.
            </p>
            <button
              onClick={handleDisable}
              disabled={isPending || org.subscription_status === 'canceled'}
              className="w-full px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {org.subscription_status === 'canceled'
                ? 'Ya deshabilitada'
                : isPending
                  ? 'Procesando...'
                  : 'Deshabilitar Organizacion'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
