'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  CheckCircle2, AlertCircle, Loader2, Phone, Trash2, Eye, EyeOff,
  ExternalLink, Info,
} from 'lucide-react'

interface IntegrationView {
  id: string
  enabled: boolean
  last_verified_at: string | null
  config: {
    phone_number_id: string
    waba_id: string
    display_phone_number: string
    access_token_preview: string
    app_secret_preview: string
    has_token: boolean
    has_app_secret: boolean
  }
}

export function WhatsAppIntegrationCard() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [integration, setIntegration] = useState<IntegrationView | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)

  // Form state
  const [phoneNumberId, setPhoneNumberId] = useState('')
  const [wabaId, setWabaId] = useState('')
  const [accessToken, setAccessToken] = useState('')
  const [appSecret, setAppSecret] = useState('')
  const [displayPhone, setDisplayPhone] = useState('')
  const [showToken, setShowToken] = useState(false)
  const [showSecret, setShowSecret] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/integrations/whatsapp')
      const data = await res.json()
      setIntegration(data.integration)
      if (data.integration) {
        setPhoneNumberId(data.integration.config.phone_number_id)
        setWabaId(data.integration.config.waba_id)
        setDisplayPhone(data.integration.config.display_phone_number)
      }
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  async function handleSave(testOnly: boolean) {
    setError(null); setSuccess(null)
    if (testOnly) setTesting(true); else setSaving(true)
    try {
      const res = await fetch('/api/integrations/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number_id: phoneNumberId,
          waba_id: wabaId,
          access_token: accessToken,
          app_secret: appSecret,
          display_phone_number: displayPhone,
          test: testOnly,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error + (data.detail ? ` (${data.detail})` : ''))
        return
      }
      if (testOnly) {
        setSuccess(`Conexión exitosa con ${data.verified.display_phone_number} (${data.verified.verified_name || 'sin nombre verificado'})`)
      } else {
        setSuccess('WhatsApp conectado correctamente')
        setEditing(false)
        setAccessToken('')
        setAppSecret('')
        await load()
      }
    } catch (e: any) {
      setError(e.message || 'Error inesperado')
    } finally {
      setTesting(false); setSaving(false)
    }
  }

  async function handleDisconnect() {
    if (!confirm('¿Desconectar tu WhatsApp Business? Las conversaciones existentes se mantienen, pero no recibirás nuevos mensajes ni la IA responderá hasta que reconectes.')) return
    setDeleting(true)
    try {
      const res = await fetch('/api/integrations/whatsapp', { method: 'DELETE' })
      if (res.ok) {
        setIntegration(null)
        setEditing(false)
        setPhoneNumberId(''); setWabaId(''); setDisplayPhone(''); setAccessToken(''); setAppSecret('')
        setSuccess('WhatsApp desconectado')
      }
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <Card><CardContent className="p-8 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </CardContent></Card>
    )
  }

  // ── Connected view ──────────────────────────────────────────────────────────
  if (integration && !editing) {
    const c = integration.config
    return (
      <Card className="border-green-200">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
                <Phone className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-navy">WhatsApp Business</h3>
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800 border border-green-300">
                    <CheckCircle2 className="h-3 w-3" /> Conectado
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {c.display_phone_number || 'Número conectado'}
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Editar</Button>
              <Button size="sm" variant="outline" onClick={handleDisconnect} disabled={deleting}
                className="text-red-600 border-red-200 hover:bg-red-50">
                {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm bg-slate-50 rounded-lg p-3">
            <div>
              <p className="text-xs text-muted-foreground">Phone Number ID</p>
              <p className="font-mono text-xs">{c.phone_number_id}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">WABA ID</p>
              <p className="font-mono text-xs">{c.waba_id || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Access Token</p>
              <p className="font-mono text-xs">{c.access_token_preview}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">App Secret</p>
              <p className="font-mono text-xs">{c.has_app_secret ? c.app_secret_preview : <span className="text-amber-600">No configurado (signature check deshabilitado)</span>}</p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
            <div className="flex gap-2">
              <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">URL del Webhook (configurada en Meta):</p>
                <p className="font-mono text-[11px] mt-1">https://www.altaprop-app.cl/api/webhooks/whatsapp</p>
                <p className="mt-1.5">Cuando configures tu app en Meta for Developers, usa esta URL como webhook callback.</p>
              </div>
            </div>
          </div>

          {success && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">{success}</p>}
        </CardContent>
      </Card>
    )
  }

  // ── Form view (new or editing) ──────────────────────────────────────────────
  return (
    <Card>
      <CardContent className="p-5 space-y-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
            <Phone className="h-5 w-5 text-green-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-navy">
              {integration ? 'Editar conexión de WhatsApp' : 'Conectar WhatsApp Business'}
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Conecta tu propio número de WhatsApp Business para recibir mensajes y que tu asistente IA responda automáticamente.
            </p>
          </div>
        </div>

        {/* Setup steps */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 space-y-1.5">
          <div className="flex gap-2">
            <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="font-semibold">Necesitas estos datos de Meta for Developers:</p>
              <ol className="list-decimal list-inside space-y-1 ml-1">
                <li>Crea una app en <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener" className="underline inline-flex items-center gap-0.5">developers.facebook.com <ExternalLink className="h-3 w-3" /></a></li>
                <li>Agrega el caso de uso &quot;WhatsApp Business Messaging&quot;</li>
                <li>En &quot;Configuración de la API&quot; copia tu Phone Number ID y WABA ID</li>
                <li>Genera un Access Token (System User token recomendado para producción)</li>
                <li>Configura el webhook con la URL de abajo y el Verify Token <span className="font-mono bg-amber-100 px-1 rounded">altaprop_fc_fel_2026</span></li>
              </ol>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="phone_number_id">Phone Number ID *</Label>
            <Input id="phone_number_id" value={phoneNumberId} onChange={e => setPhoneNumberId(e.target.value)}
              placeholder="123456789012345" className="font-mono text-sm" />
            <p className="text-[11px] text-muted-foreground">No es el número en sí, es el ID interno que Meta asigna.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="waba_id">WABA ID *</Label>
            <Input id="waba_id" value={wabaId} onChange={e => setWabaId(e.target.value)}
              placeholder="987654321098765" className="font-mono text-sm" />
            <p className="text-[11px] text-muted-foreground">WhatsApp Business Account ID</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="access_token">Access Token *</Label>
          <div className="relative">
            <Input id="access_token" type={showToken ? 'text' : 'password'}
              value={accessToken} onChange={e => setAccessToken(e.target.value)}
              placeholder={integration ? '••••••••••••• (deja vacío para mantener el actual)' : 'EAAxxxxxxxxxxxxxxxx...'}
              className="font-mono text-sm pr-10" />
            <button type="button" onClick={() => setShowToken(!showToken)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-navy">
              {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground">Token permanente recomendado. Si no, renueva cada 24h.</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="app_secret">App Secret <span className="text-muted-foreground">(opcional pero recomendado)</span></Label>
          <div className="relative">
            <Input id="app_secret" type={showSecret ? 'text' : 'password'}
              value={appSecret} onChange={e => setAppSecret(e.target.value)}
              placeholder={integration?.config.has_app_secret ? '••••••••••••• (deja vacío para mantener el actual)' : '32 chars hex'}
              className="font-mono text-sm pr-10" />
            <button type="button" onClick={() => setShowSecret(!showSecret)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-navy">
              {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground">Permite verificar la firma de los webhooks de Meta. Sin esto, los mensajes igual llegan pero sin verificación criptográfica.</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="display_phone">Número de teléfono <span className="text-muted-foreground">(solo display)</span></Label>
          <Input id="display_phone" value={displayPhone} onChange={e => setDisplayPhone(e.target.value)}
            placeholder="+56 9 1234 5678" />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700 flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <p>{success}</p>
          </div>
        )}

        <div className="flex gap-2 pt-2 border-t">
          <Button variant="outline" onClick={() => handleSave(true)} disabled={testing || saving || !phoneNumberId || !accessToken}>
            {testing ? <><Loader2 className="h-3 w-3 animate-spin mr-1" />Probando...</> : 'Probar conexión'}
          </Button>
          <Button onClick={() => handleSave(false)} disabled={saving || testing || !phoneNumberId || !accessToken}
            className="bg-navy hover:bg-navy/90">
            {saving ? <><Loader2 className="h-3 w-3 animate-spin mr-1" />Guardando...</> : 'Guardar'}
          </Button>
          {editing && (
            <Button variant="ghost" onClick={() => { setEditing(false); setAccessToken(''); setAppSecret(''); setError(null); setSuccess(null) }}>
              Cancelar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
