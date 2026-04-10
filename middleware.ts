import { updateSession } from '@/lib/supabase/middleware'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

// ─── Main platform domains ────────────────────────────────────────────────────
const MAIN_DOMAIN     = 'altaprop-app.cl'
const MAIN_DOMAIN_WWW = 'www.altaprop-app.cl'

// Also derive from NEXT_PUBLIC_SITE_URL so Vercel preview URLs work correctly.
// e.g. NEXT_PUBLIC_SITE_URL=https://altaprop-crm.vercel.app → never treated as subscriber site.
const _siteEnv      = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/^https?:\/\//, '').split('/')[0].toLowerCase()
const MAIN_DOMAIN_ENV = _siteEnv.startsWith('www.') ? _siteEnv.slice(4) : _siteEnv

// Subdomains reserved for the platform itself (never route to subscriber sites)
const RESERVED_SUBDOMAINS = new Set(['www', 'api', 'admin', 'app', 'dashboard', 'staging', 'dev'])

export async function middleware(request: NextRequest) {
  const host = (request.headers.get('host') || '').toLowerCase().split(':')[0]

  // ── Multi-tenant subscriber site routing ──
  // Only applies when the host is NOT the main platform domain and not localhost
  const isMainDomain =
    host === MAIN_DOMAIN ||
    host === MAIN_DOMAIN_WWW ||
    (MAIN_DOMAIN_ENV && (host === MAIN_DOMAIN_ENV || host === `www.${MAIN_DOMAIN_ENV}`)) ||
    host.endsWith('.vercel.app') ||   // Vercel preview / staging deployments
    host.endsWith('.localhost') ||
    host === 'localhost' ||
    host.startsWith('127.') ||
    host.startsWith('192.')

  if (host && !isMainDomain) {
    const url = request.nextUrl.clone()
    const pathname = url.pathname

    // Skip Next.js internals and API routes (let them pass through as-is)
    if (
      pathname.startsWith('/_next/') ||
      pathname.startsWith('/api/') ||
      pathname === '/favicon.ico' ||
      pathname === '/robots.txt' ||
      pathname === '/sitemap.xml'
    ) {
      return NextResponse.next({ request })
    }

    let sitePath: string | null = null

    if (host.endsWith(`.${MAIN_DOMAIN}`)) {
      // Subdomain: magnolia.altaprop-app.cl → /site/magnolia
      const subdomain = host.slice(0, -(MAIN_DOMAIN.length + 1))
      if (subdomain && !RESERVED_SUBDOMAINS.has(subdomain)) {
        sitePath = `/site/${subdomain}`
      }
    } else {
      // Custom domain: mipropiedades.cl → /site/mipropiedades.cl
      // Strip www prefix so www.mipropiedades.cl routes to the same site as mipropiedades.cl
      const customHost = host.startsWith('www.') ? host.slice(4) : host
      sitePath = `/site/${encodeURIComponent(customHost)}`
    }

    if (sitePath) {
      url.pathname = sitePath + (pathname === '/' ? '' : pathname)
      return NextResponse.rewrite(url)
    }
  }

  // ── Default: Supabase auth session update ──
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all paths except static files. This is needed so the middleware
     * can intercept requests from custom domains (which are not covered by
     * the dashboard/login/api path prefixes).
     */
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
}
