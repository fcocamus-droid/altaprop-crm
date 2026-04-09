import { updateSession } from '@/lib/supabase/middleware'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

// ─── Main platform domain (hardcoded for reliability in Edge Runtime) ─────────
// These two hosts are NEVER routed to subscriber sites
const MAIN_DOMAIN     = 'altaprop-app.cl'
const MAIN_DOMAIN_WWW = 'www.altaprop-app.cl'

// Subdomains reserved for the platform itself (never route to subscriber sites)
const RESERVED_SUBDOMAINS = new Set(['www', 'api', 'admin', 'app', 'dashboard', 'staging', 'dev'])

export async function middleware(request: NextRequest) {
  const host = (request.headers.get('host') || '').toLowerCase().split(':')[0]

  // ── Multi-tenant subscriber site routing ──
  // Only applies when the host is NOT the main platform domain and not localhost
  if (
    host &&
    host !== MAIN_DOMAIN &&
    host !== MAIN_DOMAIN_WWW &&
    !host.endsWith('.localhost') &&
    host !== 'localhost' &&
    !host.startsWith('127.') &&
    !host.startsWith('192.')
  ) {
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
      sitePath = `/site/${encodeURIComponent(host)}`
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
