'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2, X, Send, AlertCircle, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface MetaTemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS'
  format?: string
  text?: string
  example?: any
}

interface MetaTemplate {
  name: string
  status: string
  language: string
  category: string
  components: MetaTemplateComponent[]
}

interface Props {
  conversationId: string
  subscriberId: string | null
  contactName: string | null
  onClose: () => void
  onSent: () => void
}

// Count {{1}} {{2}} placeholders in a string
function countPlaceholders(text: string | undefined): number {
  if (!text) return 0
  const matches = text.match(/\{\{\d+\}\}/g)
  return matches ? matches.length : 0
}

// Replace placeholders with values for live preview
function fillPlaceholders(text: string, values: string[]): string {
  return text.replace(/\{\{(\d+)\}\}/g, (_, n) => {
    const idx = parseInt(n, 10) - 1
    return values[idx] || `{{${n}}}`
  })
}

export function TemplatePicker({ conversationId, subscriberId, contactName, onClose, onSent }: Props) {
  const [templates, setTemplates] = useState<MetaTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<MetaTemplate | null>(null)
  const [bodyParams, setBodyParams] = useState<string[]>([])
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)

  useEffect(() => {
    const url = subscriberId
      ? `/api/integrations/whatsapp/templates?subscriber_id=${subscriberId}`
      : '/api/integrations/whatsapp/templates'
    fetch(url)
      .then(r => r.json())
      .then(data => {
        setTemplates(data.templates || [])
        setError(data.error || null)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [subscriberId])

  const bodyComponent = useMemo(
    () => selected?.components.find(c => c.type === 'BODY'),
    [selected],
  )
  const headerComponent = useMemo(
    () => selected?.components.find(c => c.type === 'HEADER'),
    [selected],
  )
  const footerComponent = useMemo(
    () => selected?.components.find(c => c.type === 'FOOTER'),
    [selected],
  )

  function selectTemplate(t: MetaTemplate) {
    setSelected(t)
    const body = t.components.find(c => c.type === 'BODY')
    setBodyParams(new Array(countPlaceholders(body?.text)).fill(''))
    setSendError(null)
  }

  const filledBody = bodyComponent?.text ? fillPlaceholders(bodyComponent.text, bodyParams) : ''

  async function send() {
    if (!selected) return
    setSending(true)
    setSendError(null)
    try {
      const res = await fetch(`/api/conversations/${conversationId}/template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: selected.name,
          language: selected.language,
          bodyParams,
          preview: filledBody || `[Plantilla: ${selected.name}]`,
        }),
      })
      const data = await res.json()
      if (!res.ok || data.sendError) {
        setSendError(data.sendError || data.error || 'Error al enviar')
        return
      }
      onSent()
      onClose()
    } catch (e: any) {
      setSendError(e.message)
    } finally {
      setSending(false)
    }
  }

  const ready = selected && bodyParams.every(p => p.trim().length > 0)

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <h2 className="font-semibold text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-600" /> Enviar plantilla de WhatsApp
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Para reabrir la conversación con {contactName || 'este contacto'} fuera de la ventana de 24h.
            </p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Cargando plantillas…
            </div>
          ) : error ? (
            <div className="p-5 flex items-start gap-2 text-sm text-red-700 bg-red-50 m-4 rounded-lg border border-red-200">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">No se pudieron cargar plantillas</p>
                <p className="text-xs mt-0.5">{error}</p>
              </div>
            </div>
          ) : templates.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>No tienes plantillas aprobadas en Meta.</p>
              <p className="text-xs mt-1">
                Crea y aprueba plantillas en{' '}
                <a
                  href="https://business.facebook.com/wa/manage/message-templates"
                  target="_blank"
                  rel="noopener"
                  className="underline text-emerald-700"
                >
                  Meta Business Manager
                </a>
                .
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-0 h-full">
              {/* List */}
              <div className="border-r overflow-y-auto max-h-[60vh]">
                {templates.map(t => (
                  <button
                    key={`${t.name}-${t.language}`}
                    onClick={() => selectTemplate(t)}
                    className={`w-full text-left px-4 py-3 border-b hover:bg-slate-50 transition-colors ${
                      selected?.name === t.name && selected?.language === t.language
                        ? 'bg-emerald-50 border-l-4 border-l-emerald-500'
                        : ''
                    }`}
                  >
                    <p className="font-medium text-sm truncate">{t.name}</p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-2 mt-0.5">
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded">{t.language}</span>
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded">{t.category}</span>
                    </p>
                    <p className="text-xs text-slate-500 truncate mt-1">
                      {t.components.find(c => c.type === 'BODY')?.text?.slice(0, 80) || ''}
                    </p>
                  </button>
                ))}
              </div>

              {/* Editor */}
              <div className="p-4 overflow-y-auto max-h-[60vh]">
                {!selected ? (
                  <p className="text-sm text-muted-foreground text-center py-10">
                    Selecciona una plantilla para configurar parámetros.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {bodyParams.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-xs">
                          Parámetros del cuerpo ({bodyParams.length})
                        </Label>
                        {bodyParams.map((v, i) => (
                          <div key={i}>
                            <p className="text-[10px] text-muted-foreground mb-0.5">
                              {`{{${i + 1}}}`}
                            </p>
                            <Input
                              value={v}
                              onChange={e => {
                                const next = [...bodyParams]
                                next[i] = e.target.value
                                setBodyParams(next)
                              }}
                              placeholder={`Valor para {{${i + 1}}}`}
                              className="h-8 text-sm"
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Preview */}
                    <div>
                      <Label className="text-xs">Vista previa</Label>
                      <div className="mt-1 bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm space-y-2">
                        {headerComponent?.text && (
                          <p className="font-semibold text-slate-900">{headerComponent.text}</p>
                        )}
                        {bodyComponent?.text && (
                          <p className="whitespace-pre-wrap text-slate-800">
                            {filledBody}
                          </p>
                        )}
                        {footerComponent?.text && (
                          <p className="text-[10px] text-slate-500 italic">{footerComponent.text}</p>
                        )}
                      </div>
                    </div>

                    {sendError && (
                      <div className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                        <AlertCircle className="h-3 w-3 flex-shrink-0 mt-0.5" /> {sendError}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="border-t px-5 py-3 flex justify-end gap-2 bg-slate-50">
          <Button variant="outline" onClick={onClose} disabled={sending}>Cancelar</Button>
          <Button
            onClick={send}
            disabled={!ready || sending}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Enviar plantilla
          </Button>
        </div>
      </div>
    </div>
  )
}
