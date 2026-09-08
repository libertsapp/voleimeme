const CACHE_NAME = 'antonella-estorinhas-v5';

const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './assets/capa.jpg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/kika-e-pretinho/capa.jpg',
  './assets/lobito-e-chapeuzinho/capa.jpg',
  './assets/joao-e-o-pe-de-feijao/capa.jpg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // cacheia cada arquivo separadamente: se um faltar (ex: imagem que
      // ainda nao foi subida), os outros nao deixam de ser guardados
      Promise.allSettled(CORE_ASSETS.map((url) => cache.add(url)))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  const isPage = event.request.mode === 'navigate' || event.request.destination === 'document';

  if (isPage) {
    // pagina principal: tenta sempre buscar a versao mais nova primeiro;
    // so usa o cache se estiver sem internet
    event.respondWith(
      fetch(event.request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  // imagens, manifest, icones etc: cache primeiro (mais rapido, raramente mudam)
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);
    })
  );
});
