// Nombre de la cache
const CACHE_NAME = 'medishort360-aspa-v1';
const urlsParaCache = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './manifest.json',
    './icono-192.png',
    './icono-512.png'
];

// Instalar el Service Worker y hacer cache de los archivos
self.addEventListener('install', (evento) => {
    evento.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(urlsParaCache);
        })
    );
    self.skipWaiting();
});

// Activar el Service Worker
self.addEventListener('activate', (evento) => {
    evento.waitUntil(
        caches.keys().then((nombresCaches) => {
            return Promise.all(
                nombresCaches.map((nombreCache) => {
                    if (nombreCache !== CACHE_NAME) {
                        return caches.delete(nombreCache);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Estrategia: Cache first, network fallback
self.addEventListener('fetch', (evento) => {
    // Ignorar no-get requests
    if (evento.request.method !== 'GET') {
        return;
    }

    evento.respondWith(
        caches.match(evento.request).then((respuesta) => {
            // Si existe en cache, devolverlo
            if (respuesta) {
                return respuesta;
            }

            // Si no está en cache, intentar traerlo de la red
            return fetch(evento.request)
                .then((respuesta) => {
                    // No hacer cache de respuestas no-exitosas
                    if (!respuesta || respuesta.status !== 200 || respuesta.type !== 'basic') {
                        return respuesta;
                    }

                    // Clonar la respuesta
                    const respuestaClonada = respuesta.clone();

                    // Agregar a cache para futuras solicitudes
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(evento.request, respuestaClonada);
                    });

                    return respuesta;
                })
                .catch(() => {
                    // Si falla la red y no existe en cache, devolver una respuesta offline
                    return caches.match('./index.html');
                });
        })
    );
});

// Manejar mensajes desde el cliente
self.addEventListener('message', (evento) => {
    if (evento.data && evento.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
