/* monah service worker: static assets and covers only. Audio and API data are never cached. */
const VERSION = 'monah-static-v1'
const STATIC_CACHE = VERSION + '-static'
const COVER_CACHE = VERSION + '-covers'
const PRECACHE = ['/icon.svg', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/icon-maskable-512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('monah-') && key !== STATIC_CACHE && key !== COVER_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok) cache.put(request, response.clone()).catch(() => undefined)
  return response
}

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Range requests, audio streams, uploads and every JSON API stay on the network.
  if (url.pathname.startsWith('/api/stream/')) return
  if (url.pathname.startsWith('/api/')) {
    if (url.pathname.startsWith('/api/covers/')) {
      event.respondWith(cacheFirst(request, COVER_CACHE))
    }
    return
  }

  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/icon.svg' ||
    url.pathname === '/favicon.ico'
  ) {
    event.respondWith(cacheFirst(request, STATIC_CACHE))
    return
  }

  // Navigations are always online: pages can contain account-specific data.
})

/* ------------------------------- push messages ----------------------------- */

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = {}
  }

  event.waitUntil(
    (async () => {
      const title = data.title || 'Rate'
      const url = data.url || '/'

      // An open, focused tab already shows in-app toasts for chat messages.
      if (data.category === 'messages') {
        const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
        if (clients.some((client) => client.focused && client.visibilityState === 'visible')) {
          return
        }
      }

      await self.registration.showNotification(title, {
        body: data.body || '',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag: data.tag || undefined,
        data: { url },
      })
    })(),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = new URL(event.notification.data?.url || '/', self.location.origin).href

  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of clients) {
        if ('focus' in client) {
          await client.focus()
          if ('navigate' in client) await client.navigate(target)
          return
        }
      }
      await self.clients.openWindow(target)
    })(),
  )
})
