// Altaprop PWA Service Worker
const CACHE_VERSION = 'v1'
const STATIC_CACHE = `altaprop-static-${CACHE_VERSION}`
const PAGES_CACHE  = `altaprop-pages-${CACHE_VERSION}`

// Pages to pre-cache on install
const PRECACHE = ['/offline', '/login']

// ── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  )
})

// ── Activate: clean up old caches ─────────────────────────────────────────
self.addEventListener('activate', event => {
  const keep = [STATIC_CACHE, PAGES_CACHE]
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => !keep.includes(k)).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

// ── Fetch ─────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // Only handle GET over HTTP(S)
  if (request.method !== 'GET') return
  if (!url.protocol.startsWith('http')) return

  // ── 1. API calls → network-only (never cache live data) ─────────────────
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_next/data/')) return

  // ── 2. Next.js static chunks → cache-first ───────────────────────────────
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached
        return fetch(request).then(response => {
          const clone = response.clone()
          caches.open(STATIC_CACHE).then(c => c.put(request, clone))
          return response
        })
      })
    )
    return
  }

  // ── 3. Static assets (images, fonts, icons) → cache-first ────────────────
  if (/\.(png|jpg|jpeg|webp|svg|ico|woff2?|ttf|otf)(\?.*)?$/.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached
        return fetch(request).then(response => {
          const clone = response.clone()
          caches.open(STATIC_CACHE).then(c => c.put(request, clone))
          return response
        }).catch(() => new Response('', { status: 404 }))
      })
    )
    return
  }

  // ── 4. HTML pages → network-first, fall back to cache, then /offline ─────
  event.respondWith(
    fetch(request)
      .then(response => {
        // Only cache successful HTML responses
        if (response.ok && response.headers.get('content-type')?.includes('text/html')) {
          const clone = response.clone()
          caches.open(PAGES_CACHE).then(c => c.put(request, clone))
        }
        return response
      })
      .catch(() =>
        caches.match(request)
          .then(cached => cached || caches.match('/offline'))
      )
  )
})
