'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  MessageSquare, Bot, UserCheck, Mail, TrendingUp, Loader2,
  Users, BarChart3,
} from 'lucide-react'
import { CONVERSATION_STATUSES, getStatusConfig } from '@/lib/conversations-constants'

type Range = 'today' | 'week' | 'month'

interface Stats {
  range: Range
  total: number
  byStatus: Record<string, number>
  bySender: { ai: number; agent: number; contact: number; system?: number }
  conversions: number
  conversionRate: number
  captured: number
  captureRate: number
  byDay: { date: string; count: number }[]
  perSubscriber: { subscriber_id: string | null; name: string | null; count: number; conversions: number }[]
}

const RANGE_LABELS: Record<Range, string> = {
  today: 'Hoy',
  week: 'Últimos 7 días',
  month: 'Últimos 30 días',
}

export function ConversationsMetrics({ isBoss }: { isBoss: boolean }) {
  const [range, setRange] = useState<Range>('week')
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/conversations/stats?range=${range}`)
      .then(r => r.json())
      .then(setStats)
      .finally(() => setLoading(false))
  }, [range])

  const maxDay = useMemo(
    () => stats ? Math.max(1, ...stats.byDay.map(d => d.count)) : 1,
    [stats],
  )

  return (
    <div className="space-y-5">
      {/* Range tabs */}
      <div className="flex gap-1 border-b">
        {(Object.keys(RANGE_LABELS) as Range[]).map(r => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-4 py-2 text-sm border-b-2 transition-colors ${
              range === r
                ? 'border-navy text-navy font-medium'
                : 'border-transparent text-muted-foreground hover:text-slate-700'
            }`}
          >
            {RANGE_LABELS[r]}
          </button>
        ))}
      </div>

      {loading || !stats ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Top KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard
              icon={<MessageSquare className="h-4 w-4 text-navy" />}
              label="Conversaciones"
              value={stats.total}
              tone="navy"
            />
            <KpiCard
              icon={<TrendingUp className="h-4 w-4 text-emerald-600" />}
              label="Convertidas"
              value={stats.conversions}
              hint={`${stats.conversionRate}% conversión`}
              tone="emerald"
            />
            <KpiCard
              icon={<Mail className="h-4 w-4 text-blue-600" />}
              label="Email capturado"
              value={stats.captured}
              hint={`${stats.captureRate}% captura`}
              tone="blue"
            />
            <KpiCard
              icon={<Bot className="h-4 w-4 text-purple-600" />}
              label="Mensajes IA"
              value={stats.bySender.ai}
              hint={`${stats.bySender.agent} de agentes`}
              tone="purple"
            />
          </div>

          {/* Daily chart */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4" /> Conversaciones por día
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-1 h-40">
                {stats.byDay.map(d => {
                  const h = (d.count / maxDay) * 100
                  return (
                    <div key={d.date} className="flex-1 flex flex-col items-center justify-end">
                      <div
                        className="w-full bg-gradient-to-t from-navy to-blue-400 rounded-t-sm relative group"
                        style={{ height: `${Math.max(h, 2)}%` }}
                      >
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap">
                          {d.count}
                        </div>
                      </div>
                      <span className="text-[9px] text-muted-foreground mt-1">
                        {d.date.slice(5)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Status breakdown */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Estado de conversaciones</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {CONVERSATION_STATUSES.map(s => {
                  const count = stats.byStatus[s.value] || 0
                  const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0
                  return (
                    <div key={s.value} className="flex items-center gap-2 text-sm">
                      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                      <span className="flex-1">{s.label}</span>
                      <span className="text-muted-foreground text-xs">{pct}%</span>
                      <span className="font-medium w-8 text-right">{count}</span>
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            {/* Sender breakdown */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Quién responde</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                <SenderBar label="IA" count={stats.bySender.ai} total={totalSent(stats)} icon={<Bot className="h-3.5 w-3.5 text-purple-600" />} color="bg-purple-500" />
                <SenderBar label="Agentes" count={stats.bySender.agent} total={totalSent(stats)} icon={<UserCheck className="h-3.5 w-3.5 text-blue-600" />} color="bg-blue-500" />
                <SenderBar label="Contactos" count={stats.bySender.contact} total={totalSent(stats)} icon={<MessageSquare className="h-3.5 w-3.5 text-slate-600" />} color="bg-slate-400" />
              </CardContent>
            </Card>
          </div>

          {/* Per-subscriber (Boss only) */}
          {isBoss && stats.perSubscriber.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4" /> Desglose por suscriptor
                </CardTitle>
              </CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b text-xs text-muted-foreground">
                      <th className="pb-2 font-medium">Suscriptor</th>
                      <th className="pb-2 font-medium text-right">Conversaciones</th>
                      <th className="pb-2 font-medium text-right">Convertidas</th>
                      <th className="pb-2 font-medium text-right">% Conv.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.perSubscriber.map((s, i) => {
                      const rate = s.count > 0 ? Math.round((s.conversions / s.count) * 100) : 0
                      return (
                        <tr key={s.subscriber_id || `none-${i}`} className="border-b last:border-0">
                          <td className="py-2">
                            {s.name || (s.subscriber_id ? '(sin nombre)' : <span className="text-amber-700">Sin asignar</span>)}
                          </td>
                          <td className="py-2 text-right font-medium">{s.count}</td>
                          <td className="py-2 text-right text-emerald-700">{s.conversions}</td>
                          <td className="py-2 text-right text-muted-foreground">{rate}%</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

function totalSent(s: Stats): number {
  return s.bySender.ai + s.bySender.agent + s.bySender.contact + (s.bySender.system || 0)
}

function KpiCard({
  icon, label, value, hint, tone,
}: {
  icon: React.ReactNode
  label: string
  value: number
  hint?: string
  tone: 'navy' | 'emerald' | 'blue' | 'purple'
}) {
  const toneBg = {
    navy: 'bg-slate-50 border-slate-200',
    emerald: 'bg-emerald-50 border-emerald-200',
    blue: 'bg-blue-50 border-blue-200',
    purple: 'bg-purple-50 border-purple-200',
  }[tone]
  return (
    <div className={`rounded-xl border p-4 ${toneBg}`}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-muted-foreground">{label}</span>
        {icon}
      </div>
      <p className="text-2xl font-bold tabular-nums">{value.toLocaleString('es-CL')}</p>
      {hint && <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>}
    </div>
  )
}

function SenderBar({
  label, count, total, icon, color,
}: {
  label: string
  count: number
  total: number
  icon: React.ReactNode
  color: string
}) {
  const pct = total > 0 ? (count / total) * 100 : 0
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs mb-1">
        {icon}
        <span className="flex-1">{label}</span>
        <span className="text-muted-foreground">{count.toLocaleString('es-CL')}</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
