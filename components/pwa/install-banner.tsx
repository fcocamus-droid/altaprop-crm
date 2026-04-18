'use client'

import { useEffect, useState } from 'react'
import { X, Download, Share, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Platform = 'android' | 'ios' | null

export function InstallBanner() {
  const [platform, setPlatform] = useState<Platform>(null)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [visible, setVisible] = useState(false)
  const [installing, setInstalling] = useState(false)
  const [showIOSSteps, setShowIOSSteps] = useState(false)

  useEffect(() => {
    // Don't show if already installed (running as standalone PWA)
    if (window.matchMedia('(display-mode: standalone)').matches) return
    if ((window.navigator as any).standalone === true) return

    // Don't show if user already dismissed
    if (localStorage.getItem('altaprop-pwa-dismissed')) return

    const ua = navigator.userAgent
    const isIOS = /iphone|ipad|ipod/i.test(ua.toLowerCase())
    const isMobile = /mobile|android|iphone|ipad/i.test(ua.toLowerCase())
    if (!isMobile) return  // desktop doesn't need the banner

    // Android / Chrome: wait for the native prompt
    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setPlatform('android')
      setVisible(true)
    }

    if (isIOS) {
      setPlatform('ios')
      // Small delay so it doesn't flash on page load
      setTimeout(() => setVisible(true), 2500)
    } else {
      window.addEventListener('beforeinstallprompt', onBeforeInstall)
    }

    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall)
  }, [])

  function dismiss() {
    localStorage.setItem('altaprop-pwa-dismissed', '1')
    setVisible(false)
    setShowIOSSteps(false)
  }

  async function handleInstallAndroid() {
    if (!deferredPrompt) return
    setInstalling(true)
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    setInstalling(false)
    if (outcome === 'accepted') dismiss()
    else setInstalling(false)
  }

  if (!visible || !platform) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 pt-0 safe-area-pb">
      <div className="rounded-xl bg-navy text-white shadow-2xl border border-white/10 overflow-hidden max-w-sm mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-3">
          <div className="w-10 h-10 rounded-xl bg-gold/20 flex items-center justify-center shrink-0">
            <span className="text-gold font-black text-lg leading-none">A</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm leading-tight">Altaprop CRM</p>
            <p className="text-white/60 text-xs">Instalar en tu teléfono · Gratis</p>
          </div>
          <button onClick={dismiss} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors shrink-0">
            <X className="h-4 w-4 text-white/60" />
          </button>
        </div>

        {/* Benefits */}
        <div className="flex gap-4 px-4 pb-3 text-xs text-white/70">
          <span>⚡ Acceso rápido</span>
          <span>📴 Funciona offline</span>
          <span>🔔 Notificaciones</span>
        </div>

        {/* Android: native install button */}
        {platform === 'android' && (
          <div className="px-4 pb-4">
            <Button
              onClick={handleInstallAndroid}
              disabled={installing}
              className="w-full bg-gold text-navy hover:bg-gold/90 font-semibold h-10"
            >
              <Download className="mr-2 h-4 w-4" />
              {installing ? 'Instalando...' : 'Instalar App'}
            </Button>
          </div>
        )}

        {/* iOS: instruction toggle */}
        {platform === 'ios' && (
          <div className="px-4 pb-4 space-y-2">
            {!showIOSSteps ? (
              <Button
                onClick={() => setShowIOSSteps(true)}
                className="w-full bg-gold text-navy hover:bg-gold/90 font-semibold h-10"
              >
                <Smartphone className="mr-2 h-4 w-4" />
                Cómo instalar en iPhone
              </Button>
            ) : (
              <div className="bg-white/10 rounded-lg p-3 space-y-2 text-sm text-white/90">
                <p className="font-semibold text-white text-xs uppercase tracking-wide mb-1">Pasos para iPhone / iPad</p>
                <div className="flex items-start gap-2">
                  <span className="text-gold font-bold shrink-0">1.</span>
                  <span>Toca el botón <Share className="inline h-3.5 w-3.5 text-blue-300" /> <strong>Compartir</strong> en Safari (barra inferior)</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-gold font-bold shrink-0">2.</span>
                  <span>Desplázate y toca <strong>&quot;Agregar a pantalla de inicio&quot;</strong></span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-gold font-bold shrink-0">3.</span>
                  <span>Toca <strong>&quot;Agregar&quot;</strong> en la esquina superior derecha</span>
                </div>
                <button onClick={dismiss} className="mt-1 text-xs text-white/50 hover:text-white/70 transition-colors">
                  Entendido, cerrar
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
