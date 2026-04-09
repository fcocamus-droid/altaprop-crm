'use client'

import { useState, useEffect, useCallback } from 'react'
import { useUser } from '@/hooks/use-user'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Save, CheckCircle, Loader2, ExternalLink, AlertCircle,
  Copy, Palette, Info, Globe,
} from 'lucide-react'

// Hardcoded production domain — avoids env var issues in Edge/Client bundles
const APP_DOMAIN = 'altaprop-app.cl'

function StatusBadge({ ok, text }: { ok: boolean; text: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
      {ok ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
      {text}
    </span>
  )
}

export function WebsiteConfigTab() {
  const { profile } = useUser()
  const router = useRouter()
  const supabase = createClient()

  const [enabled, setEnabled]         = useState(false)
  const [subdomain, setSubdomain]     = useState('')
  const [subdomainStatus, setSubdomainStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')
  const [subdomainMsg, setSubdomainMsg]       = useState('')
  const [customDomain, setCustomDomain]   = useState('')
  // setup: configuring zone in Cloudflare | pending_ns: waiting for NIC.cl | verified | failed
  const [domainStatus, setDomainStatus]   = useState<'idle' | 'setup' | 'pending_ns' | 'verifying' | 'verified' | 'failed'>('idle')
  const [domainMsg, setDomainMsg]         = useState('')
  const [ns1, setNs1]                     = useState('')
  const [ns2, setNs2]                     = useState('')
  const [primaryColor, setPrimaryColor]   = useState('#1a2332')
  const [accentColor, setAccentColor]     = useState('#c9a84c')
  const [heroTitle, setHeroTitle]         = useState('')
  const [heroSubtitle, setHeroSubtitle]   = useState('')
  const [aboutText, setAboutText]         = useState('')
  const [whatsapp, setWhatsapp]           = useState('')
  const [saving, setSaving]               = useState(false)
  const [saveSuccess, setSaveSuccess]     = useState(false)
  const [saveError, setSaveError]         = useState('')
  const [copied, setCopied]               = useState(false)

  // Load profile into state
  useEffect(() => {
    if (!profile) return
    setEnabled(profile.website_enabled ?? false)
    setSubdomain(profile.website_subdomain ?? '')
    setCustomDomain(profile.website_domain ?? '')
    setNs1((profile as any).website_ns1 ?? '')
    setNs2((profile as any).website_ns2 ?? '')
    if ((profile as any).website_ns1) setDomainStatus('pending_ns')
    setPrimaryColor(profile.website_primary_color ?? '#1a2332')
    setAccentColor(profile.website_accent_color ?? '#c9a84c')
    setHeroTitle(profile.website_hero_title ?? '')
    setHeroSubtitle(profile.website_hero_subtitle ?? '')
    setAboutText(profile.website_about_text ?? '')
    setWhatsapp(profile.website_whatsapp ?? '')
  }, [profile])

  // Debounced subdomain availability check
  const checkSubdomain = useCallback(async (value: string) => {
    if (!value || value === profile?.website_subdomain) {
      setSubdomainStatus('idle'); setSubdomainMsg(''); return
    }
    setSubdomainStatus('checking')
    const res = await fetch(`/api/website/check-subdomain?subdomain=${encodeURIComponent(value)}`)
    const data = await res.json()
    if (data.available) {
      setSubdomainStatus('available'); setSubdomainMsg('¡Disponible!')
    } else {
      setSubdomainStatus('taken'); setSubdomainMsg(data.reason || 'No disponible')
    }
  }, [profile?.website_subdomain])

  useEffect(() => {
    if (!subdomain) { setSubdomainStatus('idle'); setSubdomainMsg(''); return }
    const t = setTimeout(() => checkSubdomain(subdomain), 600)
    return () => clearTimeout(t)
  }, [subdomain, checkSubdomain])

  // Step 1 — Platform creates Cloudflare zone, adds DNS records, returns nameservers
  async function setupDomain() {
    if (!customDomain || !profile) return
    const clean = customDomain.toLowerCase().trim().replace(/^www\./, '')
    if (!clean) return

    setDomainStatus('setup')
    setDomainMsg('')

    const res = await fetch('/api/website/setup-domain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain: clean }),
    })
    const data = await res.json()

    if (data.ok && data.ns1 && data.ns2) {
      setNs1(data.ns1)
      setNs2(data.ns2)
      setCustomDomain(data.domain)
      setDomainStatus('pending_ns')
      setDomainMsg('')
    } else {
      setDomainStatus('failed')
      setDomainMsg(data.message || 'Error al configurar el dominio. Intenta de nuevo.')
    }
  }

  // Step 2 — Verify NS propagation (Cloudflare zone active)
  async function verifyDns() {
    if (!customDomain || !profile) return
    setDomainStatus('verifying')
    setDomainMsg('')

    const res = await fetch(`/api/website/verify-domain?domain=${encodeURIComponent(customDomain)}`)
    const data = await res.json()

    if (data.verified) {
      setDomainStatus('verified')
      setDomainMsg('¡Dominio activo y funcionando correctamente!')
      // Ensure domain is saved in DB for middleware routing
      await supabase.from('profiles').update({ website_domain: customDomain } as any).eq('id', profile.id)
      router.refresh()
    } else {
      setDomainStatus('pending_ns')
      setDomainMsg(data.reason || 'DNS aún no propagado. Espera unos minutos y vuelve a intentar.')
    }
  }

  function resetDomain() {
    setCustomDomain('')
    setNs1(''); setNs2('')
    setDomainStatus('idle')
    setDomainMsg('')
  }

  async function handleSave() {
    if (!profile) return
    if (subdomain && subdomainStatus === 'taken') {
      setSaveError('El subdominio no está disponible'); return
    }
    setSaving(true); setSaveError(''); setSaveSuccess(false)

    const { error } = await supabase
      .from('profiles')
      .update({
        website_enabled:       enabled,
        website_subdomain:     subdomain || null,
        website_domain:        customDomain || null,
        website_primary_color: primaryColor,
        website_accent_color:  accentColor,
        website_hero_title:    heroTitle || null,
        website_hero_subtitle: heroSubtitle || null,
        website_about_text:    aboutText || null,
        website_whatsapp:      whatsapp || null,
      })
      .eq('id', profile.id)

    if (error) {
      setSaveError(error.message)
    } else {
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 4000)
      router.refresh()
    }
    setSaving(false)
  }

  function copyUrl(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    })
  }

  const subdomainChanged = subdomain !== (profile?.website_subdomain ?? '')
  const siteUrl = subdomain ? `https://${subdomain}.${APP_DOMAIN}` : null
  // Active URL: custom domain takes priority over subdomain
  const activeSiteUrl = (domainStatus === 'verified' && customDomain)
    ? `https://${customDomain}`
    : siteUrl

  return (
    <div className="space-y-8 max-w-2xl">
      {saveError && (
        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">{saveError}</div>
      )}
      {saveSuccess && (
        <div className="bg-green-50 text-green-700 text-sm p-3 rounded-md flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />Configuración guardada correctamente
        </div>
      )}

      {/* Sitio activo/inactivo */}
      <div className="flex items-center justify-between p-4 border rounded-xl bg-muted/30">
        <div>
          <p className="font-semibold text-sm">Sitio web público</p>
          <p className="text-xs text-muted-foreground">
            {enabled
              ? 'Tu sitio está activo y visible para el público'
              : 'Tu sitio está desactivado — nadie puede verlo'}
          </p>
          {enabled && activeSiteUrl && (
            <a
              href={activeSiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              Ir al sitio web
            </a>
          )}
        </div>
        <button
          type="button"
          onClick={() => setEnabled(v => !v)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${enabled ? 'bg-gold' : 'bg-gray-300'}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>

      {/* ── SUBDOMAIN ── */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Subdominio gratuito</Label>
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-input rounded-md overflow-hidden flex-1">
            <span className="px-3 py-2 text-sm text-muted-foreground bg-muted border-r border-input whitespace-nowrap">https://</span>
            <input
              type="text"
              value={subdomain}
              onChange={e => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              placeholder="tu-inmobiliaria"
              maxLength={63}
              className="flex-1 px-3 py-2 text-sm outline-none bg-transparent min-w-0"
            />
            <span className="px-3 py-2 text-sm text-muted-foreground bg-muted border-l border-input whitespace-nowrap">.{APP_DOMAIN}</span>
          </div>
          {siteUrl && (
            <Button type="button" variant="outline" size="sm" onClick={() => copyUrl(siteUrl)} className="shrink-0">
              {copied ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            </Button>
          )}
          {siteUrl && enabled && (
            <Button type="button" variant="outline" size="sm" asChild className="shrink-0">
              <a href={siteUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          )}
        </div>
        {subdomain && subdomainChanged && (
          <div className="flex items-center gap-2 text-xs">
            {subdomainStatus === 'checking' && <><Loader2 className="h-3 w-3 animate-spin" />Verificando...</>}
            {subdomainStatus === 'available' && <StatusBadge ok text={subdomainMsg} />}
            {subdomainStatus === 'taken' && <StatusBadge ok={false} text={subdomainMsg} />}
          </div>
        )}
        {subdomain && !subdomainChanged && profile?.website_subdomain && (
          <StatusBadge ok text="Subdominio activo" />
        )}
        <p className="text-xs text-muted-foreground">Solo letras minúsculas, números y guiones. Mínimo 3 caracteres.</p>
      </div>

      {/* ── CUSTOM DOMAIN ── */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Dominio personalizado <span className="text-muted-foreground font-normal">(opcional)</span></Label>
        <p className="text-xs text-muted-foreground -mt-1">Ingresa el dominio <strong>sin www</strong> (ej: mipropiedades.cl)</p>

        {/* ── IDLE: Enter domain ── */}
        {domainStatus === 'idle' && (
          <div className="flex gap-2">
            <Input
              placeholder="mipropiedades.cl"
              value={customDomain}
              onChange={e => setCustomDomain(e.target.value.toLowerCase().trim().replace(/^www\./, ''))}
              className="flex-1"
            />
            <Button type="button" size="sm" onClick={setupDomain}
              disabled={!customDomain} className="shrink-0 bg-gold hover:bg-gold/90 text-white">
              Configurar dominio
            </Button>
          </div>
        )}

        {/* ── SETUP: Creating Cloudflare zone ── */}
        {domainStatus === 'setup' && (
          <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-blue-900">Configurando zona DNS…</p>
              <p className="text-xs text-blue-600">Estamos preparando el DNS para <strong>{customDomain}</strong></p>
            </div>
          </div>
        )}

        {/* ── PENDING NS: Show nameservers to enter in NIC.cl ── */}
        {(domainStatus === 'pending_ns' || domainStatus === 'verifying') && ns1 && ns2 && (
          <div className="space-y-3">
            {/* Domain + change link */}
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                {customDomain}
              </p>
              <button type="button" onClick={resetDomain}
                className="text-xs text-blue-600 underline hover:text-blue-800">
                Cambiar dominio
              </button>
            </div>

            {/* Nameservers card */}
            <div className="rounded-xl border border-gray-200 bg-gray-50 divide-y divide-gray-200">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">DNS 1</span>
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono font-semibold text-gray-900">{ns1}</code>
                  <button type="button" onClick={() => copyUrl(ns1)} title="Copiar"
                    className="p-1 rounded hover:bg-gray-200 transition-colors">
                    {copied ? <CheckCircle className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5 text-gray-400" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">DNS 2</span>
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono font-semibold text-gray-900">{ns2}</code>
                  <button type="button" onClick={() => copyUrl(ns2)} title="Copiar"
                    className="p-1 rounded hover:bg-gray-200 transition-colors">
                    {copied ? <CheckCircle className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5 text-gray-400" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 space-y-1.5">
              <p className="text-xs font-semibold text-blue-900 flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 shrink-0" />Ingresa estos nameservers en tu registrador de dominio
              </p>
              <p className="text-xs text-blue-700">
                En{' '}
                <a href="https://clientes.nic.cl" target="_blank" rel="noopener noreferrer"
                  className="underline font-semibold inline-flex items-center gap-0.5">
                  NIC.cl <ExternalLink className="h-2.5 w-2.5" />
                </a>
                {' '}→ Mis Dominios → <strong>{customDomain}</strong> → Modificar → Servidores DNS
              </p>
              <p className="text-xs text-blue-500">
                Los cambios pueden tardar entre <strong>5 minutos y 24 horas</strong> en propagarse.
              </p>
            </div>

            {/* Error message */}
            {domainMsg && domainStatus === 'pending_ns' && (
              <div className="flex items-start gap-2 text-xs p-2 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />{domainMsg}
              </div>
            )}

            {/* Verify button */}
            <Button type="button" onClick={verifyDns}
              disabled={domainStatus === 'verifying'}
              className="w-full bg-gold hover:bg-gold/90 text-white">
              {domainStatus === 'verifying'
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verificando DNS…</>
                : 'Verificar DNS'
              }
            </Button>
          </div>
        )}

        {/* ── VERIFIED ── */}
        {domainStatus === 'verified' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-xl">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-green-900">{customDomain}</p>
                  <p className="text-xs text-green-700">Dominio activo y funcionando</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <a
                  href={`https://${customDomain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-green-700 font-semibold underline hover:text-green-900 inline-flex items-center gap-1"
                >
                  Ir al sitio <ExternalLink className="h-3 w-3" />
                </a>
                <button type="button" onClick={resetDomain}
                  className="text-xs text-green-700 underline hover:text-green-900">
                  Cambiar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── FAILED ── */}
        {domainStatus === 'failed' && (
          <div className="space-y-2">
            <div className="flex items-start gap-2 text-sm p-3 rounded-xl bg-red-50 border border-red-200 text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />{domainMsg}
            </div>
            <button type="button" onClick={resetDomain}
              className="text-xs text-red-600 underline">
              Intentar con otro dominio
            </button>
          </div>
        )}
      </div>

      {/* ── CONTENIDO DEL SITIO ── */}
      <div className="space-y-4 pt-4 border-t">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Contenido del sitio</p>
        <div className="space-y-2">
          <Label htmlFor="ws_hero_title">Título principal</Label>
          <Input id="ws_hero_title" placeholder="Encuentra tu propiedad ideal" value={heroTitle}
            onChange={e => setHeroTitle(e.target.value)} maxLength={80} />
          <p className="text-xs text-muted-foreground">{heroTitle.length}/80</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ws_hero_subtitle">Subtítulo</Label>
          <Input id="ws_hero_subtitle" placeholder="Las mejores propiedades en arriendo y venta" value={heroSubtitle}
            onChange={e => setHeroSubtitle(e.target.value)} maxLength={160} />
          <p className="text-xs text-muted-foreground">{heroSubtitle.length}/160</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ws_about">Texto de presentación</Label>
          <textarea
            id="ws_about" rows={3}
            placeholder="Somos una inmobiliaria con X años de experiencia..."
            value={aboutText} onChange={e => setAboutText(e.target.value)} maxLength={500}
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
          />
          <p className="text-xs text-muted-foreground">{aboutText.length}/500</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ws_whatsapp">WhatsApp de contacto</Label>
          <Input id="ws_whatsapp" placeholder="+56 9 XXXX XXXX" value={whatsapp}
            onChange={e => setWhatsapp(e.target.value)} />
          <p className="text-xs text-muted-foreground">Aparecerá como botón de contacto en tu sitio.</p>
        </div>
      </div>

      {/* ── COLORES ── */}
      <div className="space-y-4 pt-4 border-t">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <Palette className="h-4 w-4" />Colores del sitio
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Color principal</Label>
            <div className="flex items-center gap-3">
              <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)}
                className="h-10 w-14 rounded-md border border-input cursor-pointer p-0.5 bg-transparent" />
              <Input value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="font-mono text-sm" maxLength={7} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Color de acento</Label>
            <div className="flex items-center gap-3">
              <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)}
                className="h-10 w-14 rounded-md border border-input cursor-pointer p-0.5 bg-transparent" />
              <Input value={accentColor} onChange={e => setAccentColor(e.target.value)} className="font-mono text-sm" maxLength={7} />
            </div>
          </div>
        </div>
        {/* Live preview */}
        <div className="rounded-xl overflow-hidden border" style={{ borderColor: primaryColor + '40' }}>
          <div className="p-4 text-white text-sm font-semibold flex items-center gap-2" style={{ background: primaryColor }}>
            <Globe className="h-4 w-4" />Vista previa del encabezado
            <span className="ml-auto px-3 py-1 rounded-full text-xs font-semibold" style={{ background: accentColor, color: primaryColor }}>
              Ver Propiedades
            </span>
          </div>
          <div className="p-3 bg-gray-50 text-xs text-gray-500">
            {heroTitle || 'Título principal del sitio'} — {heroSubtitle || 'Subtítulo descriptivo'}
          </div>
        </div>
      </div>

      {/* ── SAVE ── */}
      <div className="pt-2">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving
            ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</>
            : <><Save className="mr-2 h-4 w-4" />Guardar Configuración</>
          }
        </Button>
      </div>
    </div>
  )
}
