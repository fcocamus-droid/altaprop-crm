import { NextRequest, NextResponse } from 'next/server'
import { getUserProfile } from '@/lib/auth'

const VERCEL_TOKEN      = process.env.VERCEL_TOKEN
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID || 'prj_268CbV9qEkFPyBxAmu9KagRKhWH9'
const VERCEL_TEAM_ID    = process.env.VERCEL_TEAM_ID    || 'team_zAPOZcnAAGLeUo9g6KctsXCS'

/**
 * POST /api/website/register-domain
 * Adds the subscriber's custom domain to the Vercel project so it starts serving traffic.
 * Must be called after the subscriber has configured their DNS.
 */
export async function POST(request: NextRequest) {
  const profile = await getUserProfile()
  if (!profile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!['SUPERADMIN', 'SUPERADMINBOSS'].includes(profile.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { domain } = await request.json()
  if (!domain || !/^([a-z0-9-]+\.)+[a-z]{2,}$/.test(domain.toLowerCase().trim())) {
    return NextResponse.json({ error: 'Dominio inválido' }, { status: 400 })
  }

  if (!VERCEL_TOKEN) {
    // Graceful degradation: tell the user to contact support
    return NextResponse.json({
      registered: false,
      manual: true,
      message: 'Contacta a soporte para activar tu dominio personalizado.',
    })
  }

  try {
    const res = await fetch(
      `https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains?teamId=${VERCEL_TEAM_ID}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${VERCEL_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: domain.toLowerCase().trim() }),
      }
    )

    const data = await res.json()

    if (res.ok || data.error?.code === 'domain_already_in_use') {
      // domain_already_in_use means it's already registered — that's fine
      return NextResponse.json({ registered: true })
    }

    console.error('Vercel domain registration error:', data)
    return NextResponse.json({
      registered: false,
      message: data.error?.message || 'No se pudo registrar el dominio. Intenta de nuevo.',
    })
  } catch (e: any) {
    console.error('Vercel API error:', e)
    return NextResponse.json({ registered: false, message: 'Error de conexión con el servidor.' })
  }
}
