// Altaprop PWA Service Worker
const CACHE_VERSION = 'v2'
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

// ── Push notifications ──────────────────────────────────────────────────────
self.addEventListener('push', event => {
  let payload = { title: 'Altaprop', body: 'Tienes una nueva notificación' }
  try {
    if (event.data) payload = { ...payload, ...event.data.json() }
  } catch { /* keep defaults */ }

  const options = {
    body: payload.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: payload.tag || undefined,
    data: { url: payload.url || '/dashboard/conversaciones', conversationId: payload.conversationId },
    vibrate: [120, 60, 120],
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, options)
  )
})

// Click on notification → focus or open the inbox
self.addEventListener('notificationclick', event => {
  event.notification.close()
  const targetUrl = event.notification.data?.url || '/dashboard/conversaciones'
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const client of all) {
      try {
        const url = new URL(client.url)
        if (url.pathname.startsWith('/dashboard/conversaciones')) {
          client.focus()
          client.postMessage({ type: 'inbox.notificationClick', conversationId: event.notification.data?.conversationId })
          return
        }
      } catch { /* ignore */ }
    }
    if (self.clients.openWindow) {
      await self.clients.openWindow(targetUrl)
    }
  })())
})
