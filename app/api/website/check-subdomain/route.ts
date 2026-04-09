import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserProfile } from '@/lib/auth'

const RESERVED = [
  'www', 'api', 'admin', 'app', 'dashboard', 'login', 'register', 'registro',
  'mail', 'email', 'smtp', 'ftp', 'blog', 'cdn', 'static', 'media', 'img',
  'assets', 'help', 'support', 'status', 'staging', 'dev', 'test', 'demo',
  'altaprop', 'crm', 'portal', 'panel', 'sitio', 'site',
]

export async function GET(request: NextRequest) {
  const profile = await getUserProfile()
  if (!profile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const subdomain = request.nextUrl.searchParams.get('subdomain')?.toLowerCase().trim()
  if (!subdomain) return NextResponse.json({ error: 'Subdominio requerido' }, { status: 400 })

  // Validate format: only lowercase letters, numbers, hyphens; 3-30 chars
  if (!/^[a-z0-9-]{3,30}$/.test(subdomain)) {
    return NextResponse.json({
      available: false,
      reason: 'El subdominio solo puede contener letras minúsculas, números y guiones (3-30 caracteres)',
    })
  }

  // Check reserved names
  if (RESERVED.includes(subdomain)) {
    return NextResponse.json({ available: false, reason: 'Este subdominio está reservado' })
  }

  // Check DB uniqueness — exclude current profile's own subdomain
  const admin = createAdminClient()
  const { data } = await admin
    .from('profiles')
    .select('id')
    .eq('website_subdomain', subdomain)
    .neq('id', profile.id)
    .maybeSingle()

  if (data) {
    return NextResponse.json({ available: false, reason: 'Este subdominio ya está en uso' })
  }

  return NextResponse.json({ available: true })
}
