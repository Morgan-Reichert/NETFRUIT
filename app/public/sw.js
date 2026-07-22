// NETFRUIT service worker — enables PWA install + basic offline shell.
const CACHE = 'netfruit-v1'
const SHELL = ['/', '/index.html', '/icons/icon-192.png', '/icons/icon-512.png']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
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
