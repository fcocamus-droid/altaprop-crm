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
const APP_DOMAIN    = 'altaprop-app.cl'
const VERCEL_CNAME  = 'cname.vercel-dns.com'   // For www / subdomains
const VERCEL_IP     = '76.76.21.21'             // For root domain (@)

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
  const [dnsProvider, setDnsProvider]     = useState<'nicl' | 'other'>('nicl')
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

  async function verifyAndRegisterDomain() {
    if (!customDomain || !profile) return

    // Reject domains with www prefix — user should enter root domain only
    if (customDomain.startsWith('www.')) {
      setDomainStatus('failed')
      setDomainMsg('Ingresa el dominio sin "www" (ej: mipropiedades.cl). El www se agrega automáticamente.')
      return
    }

    setDomainStatus('checking')

    // 1. Check DNS propagation
    const verifyRes = await fetch(`/api/website/verify-domain?domain=${encodeURIComponent(customDomain)}`)
    const verifyData = await verifyRes.json()

    if (!verifyData.verified) {
      setDomainStatus('failed')
      setDomainMsg(verifyData.reason || 'DNS aún no propagado. Espera unos minutos y vuelve a intentar.')
      return
    }

    // 2. Register domain in Vercel automatically (root + www)
    const regRes = await fetch('/api/website/register-domain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain: customDomain }),
    })
    const regData = await regRes.json()

    if (regData.registered || regData.manual) {
      setDomainStatus('verified')
      setDomainMsg(
        regData.manual
          ? 'DNS verificado. ' + regData.message
          : '¡Dominio verificado y activado! Puede tardar unos minutos en estar disponible.'
      )

      // ── AUTO-SAVE: persist website_domain to DB so middleware can route correctly ──
      await supabase
        .from('profiles')
        .update({ website_domain: customDomain })
        .eq('id', profile.id)

      router.refresh()
    } else {
      setDomainStatus('failed')
      setDomainMsg(regData.message || 'DNS verificado pero no se pudo activar. Intenta guardar primero.')
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
        <p className="text-xs text-muted-foreground -mt-1">Ingresa el dominio <strong>sin www</strong> (ej: mipropiedades.cl). Agrega el registro A en tu proveedor DNS.</p>
        <div className="flex gap-2">
          <Input
            placeholder="mipropiedades.cl"
            value={customDomain}
            onChange={e => { setCustomDomain(e.target.value.toLowerCase().trim().replace(/^www\./, '')); setDomainStatus('idle') }}
            className="flex-1"
          />
          <Button type="button" variant="outline" size="sm" onClick={verifyAndRegisterDomain}
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
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-4">
            <p className="text-xs font-semibold text-blue-800 flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5" />Cómo configurar tu dominio — elige tu proveedor
            </p>

            {/* Provider selector */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDnsProvider('nicl')}
                className={`flex-1 text-xs font-semibold px-3 py-2 rounded-lg border transition-all ${
                  dnsProvider === 'nicl'
                    ? 'bg-blue-700 text-white border-blue-700'
                    : 'bg-white text-blue-700 border-blue-300 hover:bg-blue-50'
                }`}
              >
                🇨🇱 NIC.cl
              </button>
              <button
                type="button"
                onClick={() => setDnsProvider('other')}
                className={`flex-1 text-xs font-semibold px-3 py-2 rounded-lg border transition-all ${
                  dnsProvider === 'other'
                    ? 'bg-blue-700 text-white border-blue-700'
                    : 'bg-white text-blue-700 border-blue-300 hover:bg-blue-50'
                }`}
              >
                🌐 GoDaddy / Cloudflare / Otro
              </button>
            </div>

            {/* ── NIC.CL FLOW ── */}
            {dnsProvider === 'nicl' && (
              <div className="space-y-3">
                {/* Aviso importante */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-start gap-2">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800">
                    <strong>NIC.cl solo gestiona nameservers</strong>, no registros DNS (A/CNAME).
                    Necesitas usar <strong>Cloudflare gratis</strong> como intermediario para agregar los registros.
                  </p>
                </div>

                {/* Step 1 */}
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-blue-900">
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-200 text-blue-800 font-bold text-[10px] mr-1.5">1</span>
                    Crea cuenta gratis en Cloudflare y agrega tu dominio
                  </p>
                  <p className="text-xs text-blue-600 ml-5.5 pl-1">
                    Ve a{' '}
                    <a href="https://cloudflare.com" target="_blank" rel="noopener noreferrer" className="underline font-medium inline-flex items-center gap-0.5">
                      cloudflare.com <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                    {' '}→ Agregar sitio → escribe <strong>{customDomain}</strong> → elige plan <strong>Free</strong>
                  </p>
                </div>

                {/* Step 2 */}
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-blue-900">
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-200 text-blue-800 font-bold text-[10px] mr-1.5">2</span>
                    En Cloudflare → DNS → Agregar estos registros
                  </p>
                  <div className="rounded-lg overflow-hidden border border-blue-200 ml-5.5">
                    <table className="w-full text-xs font-mono">
                      <thead className="bg-blue-100">
                        <tr>
                          <th className="text-left px-3 py-1.5 text-blue-700 font-semibold">Tipo</th>
                          <th className="text-left px-3 py-1.5 text-blue-700 font-semibold">Nombre</th>
                          <th className="text-left px-3 py-1.5 text-blue-700 font-semibold">Valor</th>
                          <th className="text-left px-3 py-1.5 text-blue-700 font-semibold">Proxy</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-blue-100">
                        <tr className="bg-green-50">
                          <td className="px-3 py-2 text-blue-900 font-bold">A</td>
                          <td className="px-3 py-2 text-blue-900">@</td>
                          <td className="px-3 py-2 text-blue-900 select-all">{VERCEL_IP}</td>
                          <td className="px-3 py-2 text-gray-500">Solo DNS ☁</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 text-blue-900 font-bold">CNAME</td>
                          <td className="px-3 py-2 text-blue-900">www</td>
                          <td className="px-3 py-2 text-blue-900 select-all">{VERCEL_CNAME}</td>
                          <td className="px-3 py-2 text-gray-500">Solo DNS ☁</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-blue-500 ml-5.5 pl-1">Importante: deja el proxy en <strong>Solo DNS</strong> (nube gris, no naranja)</p>
                </div>

                {/* Step 3 */}
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-blue-900">
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-200 text-blue-800 font-bold text-[10px] mr-1.5">3</span>
                    En NIC.cl → cambia los nameservers a los de Cloudflare
                  </p>
                  <p className="text-xs text-blue-600 ml-5.5 pl-1">
                    <a href="https://clientes.nic.cl" target="_blank" rel="noopener noreferrer" className="underline font-medium inline-flex items-center gap-0.5">
                      clientes.nic.cl <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                    {' '}→ Mis Dominios → <strong>{customDomain}</strong> → Modificar → Sección <em>&ldquo;Servidores DNS&rdquo;</em> → reemplaza los nameservers actuales por los que Cloudflare te asignó (ej: <code className="bg-blue-100 px-1 rounded">xxx.ns.cloudflare.com</code>)
                  </p>
                </div>
              </div>
            )}

            {/* ── OTHER PROVIDER FLOW ── */}
            {dnsProvider === 'other' && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-blue-900">
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-200 text-blue-800 font-bold text-[10px] mr-1.5">1</span>
                    Agrega estos registros en el panel DNS de tu proveedor
                  </p>
                  <div className="rounded-lg overflow-hidden border border-blue-200">
                    <table className="w-full text-xs font-mono">
                      <thead className="bg-blue-100">
                        <tr>
                          <th className="text-left px-3 py-1.5 text-blue-700 font-semibold">Tipo</th>
                          <th className="text-left px-3 py-1.5 text-blue-700 font-semibold">Nombre</th>
                          <th className="text-left px-3 py-1.5 text-blue-700 font-semibold">Valor</th>
                          <th className="text-left px-3 py-1.5 text-blue-700 font-semibold">Para</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-blue-100">
                        <tr className="bg-green-50">
                          <td className="px-3 py-2 text-blue-900 font-bold">A</td>
                          <td className="px-3 py-2 text-blue-900">@</td>
                          <td className="px-3 py-2 text-blue-900 select-all">{VERCEL_IP}</td>
                          <td className="px-3 py-2 text-green-700 font-semibold">{customDomain} ✓ requerido</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 text-blue-900 font-bold">CNAME</td>
                          <td className="px-3 py-2 text-blue-900">www</td>
                          <td className="px-3 py-2 text-blue-900 select-all">{VERCEL_CNAME}</td>
                          <td className="px-3 py-2 text-blue-400">www.{customDomain} (opcional)</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                <p className="text-xs text-blue-600 flex items-start gap-1">
                  <Info className="h-3 w-3 shrink-0 mt-0.5" />
                  Si usas Cloudflare: desactiva el proxy (nube gris) para los registros arriba.
                </p>
              </div>
            )}

            {/* Step final — common to both */}
            <div className="space-y-1 border-t border-blue-200 pt-3">
              <p className="text-xs font-semibold text-blue-900">
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-200 text-blue-800 font-bold text-[10px] mr-1.5">{dnsProvider === 'nicl' ? '4' : '2'}</span>
                Haz click en <strong>Verificar</strong> — el sistema comprobará el DNS y activará tu dominio automáticamente
              </p>
              <p className="text-xs text-blue-600">
                Los cambios DNS pueden tardar entre <strong>5 minutos y 48 horas</strong> en propagarse. Si falla, espera y vuelve a intentar.
              </p>
            </div>
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
