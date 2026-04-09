'use client'

import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Search, Home, Loader2, Eye, EyeOff, AlertCircle, Pencil, Copy, Check, ExternalLink } from 'lucide-react'

function fmtPrice(price: number, currency: string) {
  if (currency === 'UF') return `${price.toFixed(0)} UF`
  if (currency === 'USD') return `USD $${price.toLocaleString('es-CL')}`
  return `$${price.toLocaleString('es-CL')}`
}

interface SiteProperty {
  id: string
  title: string
  city: string | null
  sector: string | null
  status: string
  operation: string
  price: number
  currency: string
  website_visible: boolean
  images?: { url: string }[]
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  available:   { label: 'Disponible',  cls: 'bg-green-100 text-green-800' },
  reserved:    { label: 'Reservada',   cls: 'bg-yellow-100 text-yellow-800' },
  rented:      { label: 'Arrendada',   cls: 'bg-blue-100 text-blue-800' },
  sold:        { label: 'Vendida',     cls: 'bg-purple-100 text-purple-800' },
  unavailable: { label: 'No disp.',    cls: 'bg-gray-100 text-gray-800' },
}

const OP_LABELS: Record<string, string> = {
  arriendo: 'Arriendo',
  venta: 'Venta',
}

function MigrationBanner({ sql }: { sql: string }) {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(sql).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-900">Actualización de base de datos requerida</p>
          <p className="text-xs text-amber-700 mt-0.5">
            El campo de visibilidad aún no está creado. Ejecuta este SQL una sola vez en el{' '}
            <a
              href="https://supabase.com/dashboard/project/_/sql/new"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-medium inline-flex items-center gap-0.5"
            >
              Editor SQL de Supabase <ExternalLink className="h-3 w-3" />
            </a>
            :
          </p>
          <div className="mt-2 flex items-center gap-2 bg-amber-100 border border-amber-200 rounded-lg px-3 py-2">
            <code className="text-xs text-amber-900 flex-1 break-all font-mono">{sql}</code>
            <button
              type="button"
              onClick={copy}
              title="Copiar SQL"
              className="shrink-0 p-1 rounded hover:bg-amber-200 transition-colors"
            >
              {copied
                ? <Check className="h-4 w-4 text-green-600" />
                : <Copy className="h-4 w-4 text-amber-700" />
              }
            </button>
          </div>
          <p className="text-xs text-amber-600 mt-1.5">
            Después de ejecutarlo, los toggles funcionarán correctamente.
          </p>
        </div>
      </div>
    </div>
  )
}

export function WebsitePropiedadesTab() {
  const [properties, setProperties] = useState<SiteProperty[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [toggling, setToggling] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [migrationSql, setMigrationSql] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/website/properties')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setProperties(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const toggleVisibility = useCallback(async (id: string, current: boolean) => {
    setToggling(id)
    setError('')
    setMigrationSql(null)

    // Optimistic update
    setProperties(prev => prev.map(p => p.id === id ? { ...p, website_visible: !current } : p))

    const res = await fetch('/api/website/property-visibility', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ property_id: id, website_visible: !current }),
    })

    if (!res.ok) {
      // Rollback
      setProperties(prev => prev.map(p => p.id === id ? { ...p, website_visible: current } : p))

      const data = await res.json().catch(() => ({}))
      if (data.error === 'column_missing' && data.sql) {
        setMigrationSql(data.sql)
      } else {
        setError('No se pudo actualizar la visibilidad. Intenta de nuevo.')
      }
    }

    setToggling(null)
  }, [])

  const filtered = properties.filter(p => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      p.title.toLowerCase().includes(q) ||
      (p.city || '').toLowerCase().includes(q) ||
      (p.sector || '').toLowerCase().includes(q)
    )
  })

  const visibleCount = properties.filter(p => p.website_visible).length

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{visibleCount}</span> de{' '}
            <span className="font-semibold text-foreground">{properties.length}</span> propiedades
            publicadas en tu sitio
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Solo las propiedades <span className="font-medium">disponibles</span> y visibles aparecen en tu sitio público.
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar propiedad..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Migration required banner */}
      {migrationSql && <MigrationBanner sql={migrationSql} />}

      {/* Generic error */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
          <AlertCircle className="h-4 w-4 shrink-0" />{error}
        </div>
      )}

      {properties.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Home className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">No tienes propiedades aún</p>
          <p className="text-sm mt-1">Crea propiedades en el módulo Propiedades para que aparezcan aquí.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Search className="h-8 w-8 mx-auto mb-2 opacity-20" />
          <p className="text-sm">No se encontraron propiedades con ese término.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(p => {
            const st = STATUS_LABELS[p.status] || { label: p.status, cls: 'bg-gray-100 text-gray-800' }
            const cover = p.images?.[0]?.url
            const isToggling = toggling === p.id

            return (
              <div
                key={p.id}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  p.website_visible
                    ? 'bg-white hover:shadow-sm'
                    : 'bg-muted/30 opacity-60'
                }`}
              >
                {/* Thumbnail */}
                <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted shrink-0 flex items-center justify-center">
                  {cover
                    ? <img src={cover} alt="" className="w-full h-full object-cover" />
                    : <Home className="h-5 w-5 text-muted-foreground" />
                  }
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{p.title}</p>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                    {p.city && <span className="text-xs text-muted-foreground">{p.city}{p.sector ? `, ${p.sector}` : ''}</span>}
                    <Badge variant="outline" className={`text-xs px-1.5 py-0 ${st.cls}`}>{st.label}</Badge>
                    <span className="text-xs text-muted-foreground">{OP_LABELS[p.operation] || p.operation}</span>
                    <span className="text-xs font-medium">{fmtPrice(p.price, p.currency)}</span>
                  </div>
                </div>

                {/* Edit link */}
                <Link
                  href={`/dashboard/propiedades/${p.id}`}
                  title="Editar propiedad"
                  className="shrink-0 inline-flex items-center justify-center h-7 w-7 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Link>

                {/* Visibility */}
                <div className="shrink-0 flex items-center gap-2">
                  {p.website_visible
                    ? <span className="hidden sm:flex items-center gap-1 text-xs text-green-700 font-medium"><Eye className="h-3.5 w-3.5" />Visible</span>
                    : <span className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground"><EyeOff className="h-3.5 w-3.5" />Oculta</span>
                  }
                  <button
                    type="button"
                    onClick={() => toggleVisibility(p.id, p.website_visible)}
                    disabled={isToggling}
                    title={p.website_visible ? 'Ocultar del sitio' : 'Mostrar en el sitio'}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
                      p.website_visible ? 'bg-gold' : 'bg-gray-300'
                    }`}
                  >
                    {isToggling
                      ? <Loader2 className="h-3 w-3 animate-spin absolute inset-0 m-auto text-white" />
                      : <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm ${p.website_visible ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    }
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
