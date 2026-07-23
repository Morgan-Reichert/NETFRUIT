// NETFRUIT service worker — PWA install, safe caching, Web Push.
const CACHE = 'netfruit-v4'

self.addEventListener('install', (e) => {
  // Cache only the icons for installability. NOT the HTML/JS shell — caching a
  // stale index.html that points at a deleted JS hash is what causes blank screens.
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(['/icons/icon-192.png', '/icons/icon-512.png']).catch(() => {}))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const { request } = e
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  // Never cache-freeze brand logos or generated media — serve them fresh so
  // rebrands/new posters show up without a service-worker version bump.
  if (url.pathname.startsWith('/generated/') || url.pathname.startsWith('/brand/') || url.pathname === '/catalog.json') return

  // Navigations: ALWAYS network-first; cache the fresh copy so offline gets the
  // latest (never an ancient stale shell). Fall back to cache only when offline.
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put('/', copy))
          return res
        })
        .catch(() => caches.match('/') || caches.match('/index.html')),
    )
    return
  }

  // Hashed static assets are immutable → cache-first, then network.
  e.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ||
        fetch(request).then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(request, copy)) }
          return res
        }),
    ),
  )
})

// Web Push — show a notification when new content goes online.
self.addEventListener('push', (e) => {
  let data = { title: 'NETFRUIT', body: 'Something fresh just dropped 🍓', url: '/' }
  try { if (e.data) data = { ...data, ...e.data.json() } } catch { /* text */ }
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      image: data.image,
      data: { url: data.url || '/' },
      vibrate: [80, 40, 80],
      tag: data.tag || 'netfruit-drop',
    }),
  )
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const url = (e.notification.data && e.notification.data.url) || '/'
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((cs) => {
      for (const c of cs) { if ('focus' in c) { c.navigate(url); return c.focus() } }
      return self.clients.openWindow(url)
    }),
  )
})
