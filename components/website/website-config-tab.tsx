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
const CNAME_TARGET = `www.${APP_DOMAIN}`

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
  const [domainStatus, setDomainStatus]   = useState<'idle' | 'checking' | 'verified' | 'failed'>('idle')
  const [domainMsg, setDomainMsg]         = useState('')
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

  async function verifyDomain() {
    if (!customDomain) return
    setDomainStatus('checking')
    const res = await fetch(`/api/website/verify-domain?domain=${encodeURIComponent(customDomain)}`)
    const data = await res.json()
    if (data.verified) {
      setDomainStatus('verified'); setDomainMsg('¡Dominio verificado correctamente!')
    } else {
      setDomainStatus('failed'); setDomainMsg(data.reason || 'No se pudo verificar el dominio')
    }
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
        <div className="flex gap-2">
          <Input
            placeholder="mipropiedades.cl"
            value={customDomain}
            onChange={e => { setCustomDomain(e.target.value.toLowerCase().trim()); setDomainStatus('idle') }}
            className="flex-1"
          />
          <Button type="button" variant="outline" size="sm" onClick={verifyDomain}
            disabled={!customDomain || domainStatus === 'checking'} className="shrink-0">
            {domainStatus === 'checking' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verificar'}
          </Button>
        </div>
        {domainMsg && (
          <div className={`flex items-start gap-2 text-xs p-2 rounded-md ${domainStatus === 'verified' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {domainStatus === 'verified' ? <CheckCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" /> : <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />}
            {domainMsg}
          </div>
        )}
        {customDomain && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
            <p className="text-xs font-semibold text-blue-800 flex items-center gap-1">
              <Info className="h-3.5 w-3.5" />Instrucciones para configurar tu dominio
            </p>
            <p className="text-xs text-blue-700">
              En el panel DNS de tu proveedor (GoDaddy, Cloudflare, etc.) agrega el siguiente registro:
            </p>
            <div className="font-mono text-xs bg-white border border-blue-200 rounded p-2 grid grid-cols-3 gap-2 text-blue-900">
              <div><span className="font-semibold text-blue-600">Tipo</span><br />CNAME</div>
              <div><span className="font-semibold text-blue-600">Nombre</span><br />{customDomain.split('.')[0] || '@'}</div>
              <div><span className="font-semibold text-blue-600">Valor</span><br />{CNAME_TARGET}</div>
            </div>
            <p className="text-xs text-blue-600">Los cambios DNS pueden tardar hasta 24 horas en propagarse.</p>
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
