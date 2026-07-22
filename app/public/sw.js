// NETFRUIT service worker — enables PWA install + basic offline shell.
const CACHE = 'netfruit-v2'
const SHELL = ['/', '/index.html', '/icons/icon-192.png', '/icons/icon-512.png']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
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

self.addEventListener('fetch', (e) => {
  const { request } = e
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  // Never cache cross-origin, generated media, or the catalog (they change).
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/generated/') || url.pathname === '/catalog.json') return

  // Navigations: network-first, fall back to cached shell (offline).
  if (request.mode === 'navigate') {
    e.respondWith(fetch(request).catch(() => caches.match('/index.html')))
    return
  }
  // Static assets: cache-first, then network (and cache the result).
  e.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ||
        fetch(request).then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(request, copy))
          return res
        }),
    ),
  )
})
