// Service Worker intentionally self-destructs.
// iPhone/PWA caching previously pinned users to stale game versions.
self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.filter(key => key.startsWith('al-harosh-')).map(key => caches.delete(key)));
    } catch (_) {}

    try { await self.registration.unregister(); } catch (_) {}

    try {
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      await Promise.all(clients.map(client => client.navigate(client.url).catch(() => null)));
    } catch (_) {}
  })());
});

// No fetch handler on purpose: every request goes directly to the network/browser HTTP cache.
