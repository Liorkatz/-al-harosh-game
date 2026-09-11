const CACHE = 'al-harosh-v12';
const ASSETS = ['./','./index.html','./styles.css','./difficulty.css','./version.css','./multiplayer.css','./words.js','./words-more.js','./words-more-a.js','./words-more-b.js','./hard-words.js','./rosh-hashanah.js','./app.js','./sounds.js','./update-manager.js','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png','./icon-180.png'];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
});

self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))),
    self.clients.claim()
  ]));
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  if (url.pathname.endsWith('/version.json')) {
    event.respondWith(
      fetch(new Request(event.request, { cache: 'no-store' }))
        .catch(() => new Response(JSON.stringify({ version: '0.0.0' }), {
          headers: { 'Content-Type': 'application/json' }
        }))
    );
    return;
  }

  if (url.pathname.endsWith('/sounds.js') || url.pathname.endsWith('/update-manager.js')) {
    event.respondWith(fetch(new Request(event.request, { cache: 'reload' })).then(response => {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(event.request, copy));
      return response;
    }).catch(() => caches.match(event.request)));
    return;
  }

  event.respondWith(caches.match(event.request).then(hit => hit || fetch(event.request).then(response => {
    const copy = response.clone();
    caches.open(CACHE).then(cache => cache.put(event.request, copy));
    return response;
  }).catch(() => caches.match('./index.html'))));
});
