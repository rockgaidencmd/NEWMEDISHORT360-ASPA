// Nombre de la cache — SUBIDO A v4 para forzar limpieza del caché viejo
const CACHE_NAME = 'medishort360-aspa-v4';

const urlsParaCache = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './acceso.js',
    './auth.js',
    './config.js',
    './logica-acceso.js',
    './manifest.json',
    './icono-192.png',
    './icono-512.png'
];

// Instalar: cachea los archivos nuevos
self.addEventListener('install', (evento) => {
    evento.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsParaCache))
    );
    self.skipWaiting();
});

// Activar: borra TODOS los caches viejos (cualquiera que no sea v3)
self.addEventListener('activate', (evento) => {
    evento.waitUntil(
        caches.keys().then((nombres) =>
            Promise.all(
                nombres.map((nombre) => {
                    if (nombre !== CACHE_NAME) return caches.delete(nombre);
                })
            )
        )
    );
    self.clients.claim();
});

// Estrategia: NETWORK FIRST (red primero, caché como respaldo offline)
// Así siempre se muestra la versión más reciente cuando hay internet,
// y la app sigue funcionando sin conexión.
self.addEventListener('fetch', (evento) => {
    if (evento.request.method !== 'GET') return;

    // No interceptar peticiones a Firebase / Google (deben ir siempre a la red)
    const url = evento.request.url;
    if (url.includes('firebase') || url.includes('googleapis') || url.includes('gstatic')
        || url.includes('/api/') || url.includes('paypal')) {
        return; // deja que el navegador lo maneje normalmente
    }

    evento.respondWith(
        fetch(evento.request)
            .then((respuesta) => {
                // Guardar copia fresca en caché
                if (respuesta && respuesta.status === 200 && respuesta.type === 'basic') {
                    const clon = respuesta.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(evento.request, clon));
                }
                return respuesta;
            })
            .catch(() =>
                // Sin internet → usar lo que haya en caché
                caches.match(evento.request).then((c) => c || caches.match('./index.html'))
            )
    );
});

self.addEventListener('message', (evento) => {
    if (evento.data && evento.data.type === 'SKIP_WAITING') self.skipWaiting();
});
