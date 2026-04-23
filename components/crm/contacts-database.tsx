'use client'

import { useEffect, useState, useMemo } from 'react'
import {
  Search, Download, Copy, Phone, Mail, MessageCircle,
  Users, Building2, UserCheck, Home, User, ChevronUp,
  ChevronDown, ChevronsUpDown, RefreshCw, Filter, X, TrendingUp, Eye,
} from 'lucide-react'
import { getTipoConfig } from '@/lib/prospectos-constants'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Contact {
  id: string
  role: string
  full_name: string
  rut: string
  email: string
  phone: string
  empresa: string
  subscriber_id: string
  subscriber_name: string
  avatar_url: string | null
  created_at: string
  tipo: string
  city: string
  country: string
}

interface Stats {
  total: number
  suscriptores: number
  agentes: number
  propietarios: number
  postulantes: number
  prospectos: number
  visitas: number
}

// ── Role config ───────────────────────────────────────────────────────────────
const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  SUPERADMINBOSS: { label: 'Boss',        color: '#7c3aed', bg: '#ede9fe', icon: Crown  },
  SUPERADMIN:     { label: 'Suscriptor',  color: '#0369a1', bg: '#e0f2fe', icon: Building2 },
  AGENTE:         { label: 'Agente',      color: '#1d4ed8', bg: '#dbeafe', icon: UserCheck },
  PROPIETARIO:    { label: 'Propietario', color: '#15803d', bg: '#dcfce7', icon: Home },
  POSTULANTE:     { label: 'Postulante',  color: '#92400e', bg: '#fef3c7', icon: User },
  PROSPECTO:      { label: 'Prospecto',   color: '#be185d', bg: '#fce7f3', icon: TrendingUp },
  VISITA:         { label: 'Visita',      color: '#0284c7', bg: '#e0f2fe', icon: Eye },
}
function Crown(props: any) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 20h20M4 20 2 8l5 5 5-7 5 7 5-5-2 12"/>
    </svg>
  )
}

const SEGMENT_TABS = [
  { value: 'all',          label: 'Todos',         icon: Users },
  { value: 'SUPERADMIN',   label: 'Suscriptores',  icon: Building2 },
  { value: 'AGENTE',       label: 'Agentes',       icon: UserCheck },
  { value: 'PROPIETARIO',  label: 'Propietarios',  icon: Home },
  { value: 'POSTULANTE',   label: 'Postulantes',   icon: User },
  { value: 'PROSPECTO',    label: 'Prospectos',    icon: TrendingUp },
  { value: 'VISITA',       label: 'Visitas',       icon: Eye },
]

type SortField = 'full_name' | 'role' | 'empresa' | 'created_at'
type SortDir = 'asc' | 'desc'

// ── Utilities ─────────────────────────────────────────────────────────────────
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })
}

function copyToClipboard(text: string, label: string) {
  if (!text) return
  navigator.clipboard.writeText(text).then(() => {
    // subtle feedback via title change would require state; skip for simplicity
  })
}

function exportCSV(contacts: Contact[]) {
  const headers = ['Tipo', 'Empresa', 'Nombre', 'RUT', 'Email', 'Teléfono', 'País', 'Fecha Registro']
  const rows = contacts.map(c => [
    ROLE_CONFIG[c.role]?.label || c.role,
    c.empresa,
    c.full_name,
    c.rut,
    c.email,
    c.phone,
    c.country,
    formatDate(c.created_at),
  ])
  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `altaprop-base-datos-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color, bg }: {
  icon: React.ElementType; label: string; value: number; color: string; bg: string
}) {
  return (
    <div className="flex items-center gap-3 bg-white rounded-xl border border-slate-100 px-4 py-3 shadow-sm">
      <div className="rounded-lg p-2" style={{ background: bg }}>
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
      <div>
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className="text-xl font-bold text-slate-800 leading-none mt-0.5">{value}</p>
      </div>
    </div>
  )
}

// ── Sort button ───────────────────────────────────────────────────────────────
function SortBtn({ field, current, dir, onSort }: {
  field: SortField; current: SortField; dir: SortDir
  onSort: (f: SortField) => void
}) {
  const active = field === current
  return (
    <button onClick={() => onSort(field)} className="flex items-center gap-1 hover:text-navy transition-colors">
      {active
        ? dir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
        : <ChevronsUpDown className="h-3 w-3 opacity-40" />}
    </button>
  )
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ name, url }: { name: string; url: string | null }) {
  const initials = name.split(' ').slice(0, 2).map(n => n[0]?.toUpperCase() ?? '').join('')
  if (url) return <img src={url} alt={name} className="w-8 h-8 rounded-full object-cover shrink-0" />
  return (
    <div className="w-8 h-8 rounded-full bg-navy/10 flex items-center justify-center shrink-0">
      <span className="text-xs font-bold text-navy">{initials || '?'}</span>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function ContactsDatabase() {
  const [contacts, setContacts]   = useState<Contact[]>([])
  const [stats, setStats]         = useState<Stats | null>(null)
  const [loading, setLoading]     = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError]         = useState('')

  // Filters
  const [search, setSearch]           = useState('')
  const [segment, setSegment]         = useState('all')
  const [filterSubscriber, setFilterSubscriber] = useState('all')

  // Sort
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortDir, setSortDir]     = useState<SortDir>('desc')

  // Pagination
  const [page, setPage] = useState(1)
  const PER_PAGE = 50

  // Copy feedback
  const [copied, setCopied] = useState<string | null>(null)

  async function load(showRefreshing = false) {
    if (showRefreshing) setRefreshing(true)
    else setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/base-datos')
      if (!res.ok) throw new Error('Error al cargar')
      const json = await res.json()
      setContacts(json.contacts || [])
      setStats(json.stats || null)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [])

  // Derived: subscriber list for filter
  const subscribers = useMemo(() => {
    const map = new Map<string, string>()
    contacts
      .filter(c => c.role === 'SUPERADMIN')
      .forEach(c => map.set(c.id, c.full_name || c.email))
    const result: { id: string; name: string }[] = []
    map.forEach((name, id) => result.push({ id, name }))
    return result
  }, [contacts])

  // Filtered + sorted
  const filtered = useMemo(() => {
    let list = contacts

    if (segment !== 'all') list = list.filter(c => c.role === segment)

    if (filterSubscriber !== 'all') {
      list = list.filter(c => c.subscriber_id === filterSubscriber || c.id === filterSubscriber)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(c =>
        c.full_name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.rut.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.empresa.toLowerCase().includes(q)
      )
    }

    list = [...list].sort((a, b) => {
      const va = a[sortField] ?? ''
      const vb = b[sortField] ?? ''
      const cmp = String(va).localeCompare(String(vb), 'es-CL')
      return sortDir === 'asc' ? cmp : -cmp
    })

    return list
  }, [contacts, segment, filterSubscriber, search, sortField, sortDir])

  const totalPages = Math.ceil(filtered.length / PER_PAGE)
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  function handleSort(field: SortField) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
    setPage(1)
  }

  function handleCopy(text: string, key: string) {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 1500)
  }

  function clearFilters() {
    setSearch('')
    setSegment('all')
    setFilterSubscriber('all')
    setPage(1)
  }

  const hasFilters = search || segment !== 'all' || filterSubscriber !== 'all'

  // ── Render ──────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  )

  if (error) return (
    <div className="rounded-xl bg-red-50 border border-red-200 p-6 text-center text-red-700">
      {error} — <button onClick={() => load()} className="underline">Reintentar</button>
    </div>
  )

  return (
    <div className="space-y-5">

      {/* ── Stats ── */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          <StatCard icon={Users}     label="Total contactos"  value={stats.total}        color="#1e293b" bg="#f1f5f9" />
          <StatCard icon={Building2} label="Suscriptores"     value={stats.suscriptores}  color="#0369a1" bg="#e0f2fe" />
          <StatCard icon={UserCheck} label="Agentes"          value={stats.agentes}       color="#1d4ed8" bg="#dbeafe" />
          <StatCard icon={Home}      label="Propietarios"     value={stats.propietarios}  color="#15803d" bg="#dcfce7" />
          <StatCard icon={User}      label="Postulantes"      value={stats.postulantes}   color="#92400e" bg="#fef3c7" />
          <StatCard icon={TrendingUp} label="Prospectos"      value={stats.prospectos}    color="#be185d" bg="#fce7f3" />
          <StatCard icon={Eye}        label="Visitas"          value={stats.visitas}       color="#0284c7" bg="#e0f2fe" />
        </div>
      )}

      {/* ── Segment tabs ── */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit flex-wrap">
        {SEGMENT_TABS.map(tab => {
          const Icon = tab.icon
          const active = segment === tab.value
          return (
            <button
              key={tab.value}
              onClick={() => { setSegment(tab.value); setPage(1) }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                active
                  ? 'bg-white text-navy shadow-sm'
                  : 'text-muted-foreground hover:text-slate-700'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-1 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Nombre, email, RUT, teléfono, empresa..."
              className="pl-9 h-9 bg-white"
            />
          </div>

          {/* Subscriber filter */}
          <Select value={filterSubscriber} onValueChange={v => { setFilterSubscriber(v); setPage(1) }}>
            <SelectTrigger className="h-9 w-[180px] bg-white">
              <SelectValue placeholder="Suscriptor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los suscriptores</SelectItem>
              {subscribers.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 gap-1.5 text-muted-foreground">
              <X className="h-3.5 w-3.5" /> Limpiar
            </Button>
          )}
        </div>

        <div className="flex gap-2 shrink-0">
          <Button
            variant="outline" size="sm" onClick={() => load(true)} disabled={refreshing}
            className="h-9 gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button
            variant="outline" size="sm"
            onClick={() => exportCSV(filtered)}
            className="h-9 gap-1.5 border-navy text-navy hover:bg-navy hover:text-white"
          >
            <Download className="h-3.5 w-3.5" />
            Exportar CSV ({filtered.length})
          </Button>
        </div>
      </div>

      {/* ── Result count ── */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {filtered.length === 0
            ? 'Sin resultados'
            : `${filtered.length} contacto${filtered.length !== 1 ? 's' : ''}${hasFilters ? ' (filtrado)' : ''}`
          }
        </span>
        {totalPages > 1 && (
          <span>Página {page} de {totalPages}</span>
        )}
      </div>

      {/* ── Table ── */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 py-16 text-center">
          <Users className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Sin contactos</p>
          <p className="text-slate-400 text-sm mt-1">Ajusta los filtros para ver resultados</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 w-[130px]">
                    <div className="flex items-center gap-1">
                      Tipo
                      <SortBtn field="role" current={sortField} dir={sortDir} onSort={handleSort} />
                    </div>
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 min-w-[160px]">
                    <div className="flex items-center gap-1">
                      Empresa / Suscriptor
                      <SortBtn field="empresa" current={sortField} dir={sortDir} onSort={handleSort} />
                    </div>
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 min-w-[180px]">
                    <div className="flex items-center gap-1">
                      Nombre
                      <SortBtn field="full_name" current={sortField} dir={sortDir} onSort={handleSort} />
                    </div>
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 w-[130px]">RUT</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 min-w-[200px]">Email</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 w-[140px]">Teléfono</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 w-[100px]">País</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 w-[120px]">
                    <div className="flex items-center gap-1">
                      Registro
                      <SortBtn field="created_at" current={sortField} dir={sortDir} onSort={handleSort} />
                    </div>
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 w-[110px]">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {paginated.map((c, i) => {
                  const rc = ROLE_CONFIG[c.role] || { label: c.role, color: '#64748b', bg: '#f1f5f9', icon: User }
                  const RoleIcon = rc.icon
                  const whatsapp = c.phone
                    ? `https://wa.me/${c.phone.replace(/\D/g, '')}`
                    : null

                  return (
                    <tr
                      key={c.id}
                      className={`group hover:bg-slate-50/80 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-50/30'}`}
                    >
                      {/* Tipo */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold w-fit"
                            style={{ background: rc.bg, color: rc.color }}
                          >
                            <RoleIcon className="h-3 w-3" />
                            {rc.label}
                          </span>
                          {c.role === 'PROSPECTO' && c.tipo && (() => {
                            const tc = getTipoConfig(c.tipo)
                            return tc ? (
                              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium w-fit ${tc.color}`}>
                                {tc.icon} {tc.label}
                              </span>
                            ) : null
                          })()}
                          {c.role === 'VISITA' && c.tipo && (
                            <span className="text-[10px] text-slate-500 truncate max-w-[140px]" title={c.tipo}>
                              🏠 {c.tipo}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Empresa */}
                      <td className="px-4 py-3">
                        <span className="text-slate-700 font-medium truncate max-w-[150px] block">
                          {c.empresa || <span className="text-slate-300">—</span>}
                        </span>
                      </td>

                      {/* Nombre */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={c.full_name || '?'} url={c.avatar_url} />
                          <span className="font-semibold text-slate-800 truncate max-w-[150px]">
                            {c.full_name || <span className="text-slate-400 font-normal">Sin nombre</span>}
                          </span>
                        </div>
                      </td>

                      {/* RUT */}
                      <td className="px-4 py-3">
                        <span className="font-mono text-slate-600 text-xs">
                          {c.rut || <span className="text-slate-300">—</span>}
                        </span>
                      </td>

                      {/* Email */}
                      <td className="px-4 py-3">
                        {c.email ? (
                          <div className="flex items-center gap-1.5 group/email">
                            <span className="text-slate-700 truncate max-w-[170px] text-xs">{c.email}</span>
                            <button
                              onClick={() => handleCopy(c.email, `email-${c.id}`)}
                              title="Copiar email"
                              className="opacity-0 group-hover/email:opacity-100 transition-opacity p-0.5 hover:text-navy rounded"
                            >
                              {copied === `email-${c.id}`
                                ? <span className="text-green-600 text-[10px] font-bold">✓</span>
                                : <Copy className="h-3 w-3 text-slate-400" />}
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* Teléfono */}
                      <td className="px-4 py-3">
                        {c.phone ? (
                          <div className="flex items-center gap-1.5 group/phone">
                            <span className="text-slate-700 text-xs font-mono">{c.phone}</span>
                            <button
                              onClick={() => handleCopy(c.phone, `phone-${c.id}`)}
                              title="Copiar teléfono"
                              className="opacity-0 group-hover/phone:opacity-100 transition-opacity p-0.5 hover:text-navy rounded"
                            >
                              {copied === `phone-${c.id}`
                                ? <span className="text-green-600 text-[10px] font-bold">✓</span>
                                : <Copy className="h-3 w-3 text-slate-400" />}
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* País */}
                      <td className="px-4 py-3">
                        <span className="text-slate-600 text-xs">{c.country || 'Chile'}</span>
                      </td>

                      {/* Fecha */}
                      <td className="px-4 py-3">
                        <span className="text-slate-500 text-xs">{formatDate(c.created_at)}</span>
                      </td>

                      {/* Acciones */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {c.email && (
                            <a
                              href={`mailto:${c.email}`}
                              title={`Enviar email a ${c.full_name}`}
                              className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors"
                            >
                              <Mail className="h-4 w-4" />
                            </a>
                          )}
                          {whatsapp && (
                            <a
                              href={whatsapp}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={`WhatsApp a ${c.full_name}`}
                              className="p-1.5 rounded-lg hover:bg-green-50 text-slate-400 hover:text-green-600 transition-colors"
                            >
                              <MessageCircle className="h-4 w-4" />
                            </a>
                          )}
                          {c.phone && (
                            <a
                              href={`tel:${c.phone}`}
                              title={`Llamar a ${c.full_name}`}
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                            >
                              <Phone className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50">
              <p className="text-xs text-muted-foreground">
                Mostrando {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} de {filtered.length}
              </p>
              <div className="flex gap-1">
                <Button
                  variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1} className="h-7 px-2 text-xs"
                >
                  ← Anterior
                </Button>
                {/* Page numbers (show up to 5) */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i
                  if (p < 1 || p > totalPages) return null
                  return (
                    <Button
                      key={p} variant={p === page ? 'default' : 'outline'}
                      size="sm" onClick={() => setPage(p)}
                      className={`h-7 w-7 p-0 text-xs ${p === page ? 'bg-navy text-white' : ''}`}
                    >
                      {p}
                    </Button>
                  )
                })}
                <Button
                  variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages} className="h-7 px-2 text-xs"
                >
                  Siguiente →
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
