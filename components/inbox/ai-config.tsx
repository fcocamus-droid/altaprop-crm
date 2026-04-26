'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Bot, CheckCircle2, AlertCircle, Loader2, X, Plus, Sparkles, Clock,
} from 'lucide-react'

type Hours = Record<string, [number, number]>

interface AIConfig {
  enabled: boolean
  persona_name: string
  greeting: string
  system_prompt: string | null
  business_hours: Hours
  handoff_keywords: string[]
  timezone: string
}

const DAYS: { key: keyof Hours | string; label: string }[] = [
  { key: 'mon', label: 'Lunes' },
  { key: 'tue', label: 'Martes' },
  { key: 'wed', label: 'Miércoles' },
  { key: 'thu', label: 'Jueves' },
  { key: 'fri', label: 'Viernes' },
  { key: 'sat', label: 'Sábado' },
  { key: 'sun', label: 'Domingo' },
]

export function AIConfigCard() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [keywordInput, setKeywordInput] = useState('')

  const [config, setConfig] = useState<AIConfig>({
    enabled: true,
    persona_name: 'Sofía',
    greeting: '¡Hola! Soy Sofía, asistente virtual. ¿En qué te puedo ayudar?',
    system_prompt: '',
    business_hours: { mon:[9,19], tue:[9,19], wed:[9,19], thu:[9,19], fri:[9,19], sat:[10,14] },
    handoff_keywords: ['humano','persona real','agente','operador'],
    timezone: 'America/Santiago',
  })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/ai-config')
        const data = await res.json()
        if (cancelled) return
        if (data.config) {
          setConfig({
            enabled: data.config.enabled !== false,
            persona_name: data.config.persona_name || 'Sofía',
            greeting: data.config.greeting || '',
            system_prompt: data.config.system_prompt || '',
            business_hours: data.config.business_hours || { mon:[9,19], tue:[9,19], wed:[9,19], thu:[9,19], fri:[9,19], sat:[10,14] },
            handoff_keywords: data.config.handoff_keywords || [],
            timezone: data.config.timezone || 'America/Santiago',
          })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  function update<K extends keyof AIConfig>(k: K, v: AIConfig[K]) {
    setConfig(prev => ({ ...prev, [k]: v }))
    setSuccess(null)
    setError(null)
  }

  function setDayEnabled(day: string, enabled: boolean) {
    const next = { ...config.business_hours }
    if (enabled) next[day] = next[day] || [9, 18]
    else delete next[day]
    update('business_hours', next)
  }

  function setDayHour(day: string, idx: 0 | 1, value: number) {
    const range = config.business_hours[day] || [9, 18]
    const next: [number, number] = [range[0], range[1]]
    next[idx] = value
    update('business_hours', { ...config.business_hours, [day]: next })
  }

  function addKeyword() {
    const k = keywordInput.trim().toLowerCase()
    if (!k) return
    if (config.handoff_keywords.includes(k)) {
      setKeywordInput('')
      return
    }
    update('handoff_keywords', [...config.handoff_keywords, k])
    setKeywordInput('')
  }

  function removeKeyword(k: string) {
    update('handoff_keywords', config.handoff_keywords.filter(x => x !== k))
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch('/api/ai-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...config,
          system_prompt: config.system_prompt?.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'No se pudo guardar')
      } else {
        setSuccess('Configuración guardada')
      }
    } catch (e: any) {
      setError(e.message || 'Error de red')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando configuración IA…
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="bg-purple-100 rounded-lg p-2">
              <Bot className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold">Asistente IA</h3>
              <p className="text-sm text-muted-foreground">
                Personaliza cómo responde Sofía a tus clientes en WhatsApp
              </p>
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-sm text-muted-foreground">
              {config.enabled ? 'Activado' : 'Desactivado'}
            </span>
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={e => update('enabled', e.target.checked)}
              className="sr-only peer"
            />
            <div className="relative w-10 h-5 bg-gray-200 rounded-full peer-checked:bg-purple-600 transition-colors">
              <div className={`absolute top-0.5 left-0.5 bg-white rounded-full h-4 w-4 transition-transform ${config.enabled ? 'translate-x-5' : ''}`} />
            </div>
          </label>
        </div>

        {/* Identidad */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="h-4 w-4 text-purple-600" />
            Identidad
          </div>

          <div>
            <Label htmlFor="persona-name">Nombre del asistente</Label>
            <Input
              id="persona-name"
              value={config.persona_name}
              onChange={e => update('persona_name', e.target.value)}
              placeholder="Sofía"
              maxLength={50}
            />
          </div>

          <div>
            <Label htmlFor="greeting">Saludo inicial</Label>
            <Textarea
              id="greeting"
              value={config.greeting}
              onChange={e => update('greeting', e.target.value)}
              placeholder="¡Hola! Soy..."
              rows={2}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {config.greeting.length}/500
            </p>
          </div>
        </div>

        {/* Prompt personalizado */}
        <div className="space-y-2">
          <Label htmlFor="system-prompt">
            Instrucciones adicionales <span className="text-muted-foreground font-normal">(opcional)</span>
          </Label>
          <Textarea
            id="system-prompt"
            value={config.system_prompt || ''}
            onChange={e => update('system_prompt', e.target.value)}
            placeholder="Ej: Especialízate en propiedades de Las Condes y Vitacura. Si preguntan por arriendo, menciona que tenemos disponibilidad inmediata desde el 1 de cada mes…"
            rows={5}
            maxLength={4000}
          />
          <p className="text-xs text-muted-foreground">
            Estas instrucciones se agregan al prompt base. Úsalas para reglas específicas de tu inmobiliaria, comunas que cubres, política de comisiones, etc. {(config.system_prompt || '').length}/4000
          </p>
        </div>

        {/* Horario de atención */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Clock className="h-4 w-4 text-purple-600" />
            Horario de atención
          </div>
          <p className="text-xs text-muted-foreground">
            Define los días y horas en que la IA responde automáticamente. Fuera de horario los mensajes quedan pendientes para tu equipo.
          </p>
          <div className="space-y-1.5 border rounded-lg p-3 bg-gray-50/50">
            {DAYS.map(d => {
              const range = config.business_hours[d.key as string]
              const enabled = !!range
              return (
                <div key={d.key} className="flex items-center gap-3 text-sm">
                  <label className="flex items-center gap-2 w-28 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={e => setDayEnabled(d.key as string, e.target.checked)}
                      className="rounded"
                    />
                    <span className={enabled ? '' : 'text-muted-foreground'}>{d.label}</span>
                  </label>
                  {enabled ? (
                    <div className="flex items-center gap-1.5">
                      <select
                        value={range[0]}
                        onChange={e => setDayHour(d.key as string, 0, parseInt(e.target.value, 10))}
                        className="border rounded px-2 py-1 text-sm bg-white"
                      >
                        {Array.from({ length: 24 }).map((_, h) => (
                          <option key={h} value={h}>{String(h).padStart(2,'0')}:00</option>
                        ))}
                      </select>
                      <span className="text-muted-foreground">a</span>
                      <select
                        value={range[1]}
                        onChange={e => setDayHour(d.key as string, 1, parseInt(e.target.value, 10))}
                        className="border rounded px-2 py-1 text-sm bg-white"
                      >
                        {Array.from({ length: 24 }).map((_, h) => (
                          <option key={h} value={h}>{String(h).padStart(2,'0')}:00</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">Cerrado</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Handoff keywords */}
        <div className="space-y-2">
          <Label>Palabras clave para derivar a humano</Label>
          <p className="text-xs text-muted-foreground">
            Si el cliente escribe una de estas palabras, la conversación se marca para que un agente la atienda.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {config.handoff_keywords.map(k => (
              <Badge key={k} variant="secondary" className="gap-1 pr-1">
                {k}
                <button
                  type="button"
                  onClick={() => removeKeyword(k)}
                  className="hover:bg-gray-300 rounded-sm p-0.5"
                  aria-label={`Eliminar ${k}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {config.handoff_keywords.length === 0 && (
              <span className="text-xs text-muted-foreground italic">Sin palabras clave</span>
            )}
          </div>
          <div className="flex gap-2">
            <Input
              value={keywordInput}
              onChange={e => setKeywordInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addKeyword() } }}
              placeholder="Ej: humano, ejecutivo…"
              className="flex-1"
              maxLength={40}
            />
            <Button type="button" variant="outline" size="sm" onClick={addKeyword}>
              <Plus className="h-4 w-4 mr-1" /> Agregar
            </Button>
          </div>
        </div>

        {/* Feedback */}
        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        <div className="flex justify-end pt-2 border-t">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Guardar configuración
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
