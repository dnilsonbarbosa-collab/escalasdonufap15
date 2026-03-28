const CACHE_NAME = 'nufap15-v1';
const STATIC_ASSETS = [
  '.',
  './index.html',
  './manifest.json',
  './icons/icon-72x72.png',
  './icons/icon-96x96.png',
  './icons/icon-128x128.png',
  './icons/icon-144x144.png',
  './icons/icon-152x152.png',
  './icons/icon-192x192.png',
  './icons/icon-384x384.png',
  './icons/icon-512x512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

// Instalação: cachear assets estáticos
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Cache aberto');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Assets cacheados');
        return self.skipWaiting();
      })
      .catch((err) => {
        console.error('[SW] Erro ao cachear:', err);
      })
  );
});

// Ativação: limpar caches antigos
self.addEventListener('activate', (event) => {
  console.log('[SW] Ativando...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deletando cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Ativado e controlando clientes');
      return self.clients.claim();
    })
  );
});

// Fetch: estratégia Cache First para assets, Network First para HTML
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Estratégia para CDN (jsPDF)
  if (url.hostname.includes('cdnjs.cloudflare.com')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        return cached || fetch(request).then((response) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, response.clone());
            return response;
          });
        });
      })
    );
    return;
  }

  // Estratégia para assets locais (icons, manifest)
  if (request.destination === 'image' || 
      request.destination === 'manifest' ||
      url.pathname.includes('/icons/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        return cached || fetch(request).then((response) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, response.clone());
            return response;
          });
        });
      })
    );
    return;
  }

  // Estratégia Network First para HTML
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, response.clone());
            return response;
          });
        })
        .catch(() => {
          return caches.match(request).then((cached) => {
            if (cached) return cached;
            // Fallback offline
            return new Response(`
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Offline — NUFAP-15</title>
                <style>
                  body {
                    font-family: 'Segoe UI', Arial, sans-serif;
                    background: #1c2220;
                    color: #e4ecea;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    margin: 0;
                    padding: 20px;
                    text-align: center;
                  }
                  .icon { font-size: 4rem; margin-bottom: 20px; }
                  h1 { color: #b22222; margin-bottom: 10px; }
                  p { color: #96a89e; line-height: 1.6; }
                  .btn {
                    background: #b22222;
                    color: white;
                    padding: 12px 24px;
                    border-radius: 8px;
                    text-decoration: none;
                    margin-top: 20px;
                    display: inline-block;
                  }
                </style>
              </head>
              <body>
                <div class="icon">📡</div>
                <h1>Sem Conexão</h1>
                <p>Você está offline. Verifique sua conexão com a internet<br>e tente novamente.</p>
                <a href="." class="btn">Tentar Novamente</a>
              </body>
              </html>
            `, {
              headers: { 'Content-Type': 'text/html' }
            });
          });
        })
    );
    return;
  }

  // Default: cache first
  event.respondWith(
    caches.match(request).then((cached) => {
      return cached || fetch(request);
    })
  );
});

// Background sync para ações pendentes
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-escalas') {
    console.log('[SW] Sincronizando escalas...');
    // Aqui poderia sincronizar dados pendentes
  }
});

// Push notifications (preparado para futuro)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    event.waitUntil(
      self.registration.showNotification(data.title || 'NUFAP-15', {
        body: data.body || 'Nova atualização disponível',
        icon: './icons/icon-192x192.png',
        badge: './icons/icon-72x72.png',
        tag: data.tag || 'default'
      })
    );
  }
});
