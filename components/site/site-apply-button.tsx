'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, Loader2, User } from 'lucide-react'

interface Props {
  propertyId: string
  subdomain: string
  primaryColor: string
  accentColor: string
}

export function SiteApplyButton({ propertyId, subdomain, primaryColor, accentColor }: Props) {
  const [state, setState] = useState<'loading' | 'guest' | 'postulante' | 'applied' | 'success'>('loading')
  const [applying, setApplying]   = useState(false)
  const [errorMsg, setErrorMsg]   = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setState('guest'); return }

      const role = user.user_metadata?.role ?? user.app_metadata?.role
      if (role !== 'POSTULANTE') { setState('guest'); return }

      // Check if already applied
      const { data } = await supabase
        .from('applications')
        .select('id')
        .eq('property_id', propertyId)
        .eq('applicant_id', user.id)
        .maybeSingle()

      setState(data ? 'applied' : 'postulante')
    })
  }, [propertyId])

  async function handleApply() {
    setApplying(true)
    setErrorMsg('')
    const res = await fetch('/api/public/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ propertyId }),
    })
    const data = await res.json()
    setApplying(false)
    if (data.error) setErrorMsg(data.error)
    else setState('success')
  }

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (state === 'loading') {
    return <div className="h-12 w-full rounded-xl bg-gray-100 animate-pulse" />
  }

  // ── Already applied / just applied ───────────────────────────────────────
  if (state === 'applied' || state === 'success') {
    return (
      <div className="rounded-xl border-2 border-green-200 bg-green-50 p-4 text-center">
        <CheckCircle className="h-7 w-7 text-green-600 mx-auto mb-2" />
        <p className="text-sm font-semibold text-green-800">Ya postulaste a esta propiedad</p>
        <p className="text-xs text-green-700 mt-1">
          El agente revisará tu postulación y se contactará contigo.
        </p>
      </div>
    )
  }

  // ── Logged-in POSTULANTE ─────────────────────────────────────────────────
  if (state === 'postulante') {
    return (
      <div className="space-y-2">
        {errorMsg && (
          <p className="text-xs text-red-500 text-center bg-red-50 border border-red-200 rounded-lg p-2">
            {errorMsg}
          </p>
        )}
        <button
          onClick={handleApply}
          disabled={applying}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ background: primaryColor }}
        >
          {applying
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando postulación...</>
            : <><User className="h-4 w-4" /> Postular a esta propiedad</>
          }
        </button>
      </div>
    )
  }

  // ── Guest: register / login ──────────────────────────────────────────────
  // Auth pages live on the canonical production domain — must use absolute URLs
  // so custom subscriber domains don't try to resolve them locally (404).
  // NEXT_PUBLIC_SITE_URL may be set to the Vercel preview URL in Vercel env vars;
  // hardcoding production ensures the link always points to altaprop-app.cl.
  const appUrl = process.env.NODE_ENV === 'development'
    ? (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')
    : 'https://altaprop-app.cl'
  const returnPath = `/site/${subdomain}/propiedades/${propertyId}`
  const registerUrl = `${appUrl}/registro-postulante?property=${propertyId}&redirect=${encodeURIComponent(returnPath)}`
  const loginUrl    = `${appUrl}/login?redirect=${encodeURIComponent(returnPath)}`

  return (
    <div className="space-y-2">
      <Link href={registerUrl} className="block">
        <button
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: primaryColor }}
        >
          <User className="h-4 w-4" />
          Inicia sesión para postular
        </button>
      </Link>
      <p className="text-xs text-center text-gray-500">
        ¿Ya tienes cuenta?{' '}
        <Link
          href={loginUrl}
          className="font-semibold hover:underline"
          style={{ color: primaryColor }}
        >
          Inicia sesión aquí
        </Link>
      </p>
    </div>
  )
}
