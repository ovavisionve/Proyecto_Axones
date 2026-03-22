/**
 * Service Worker - Sistema Axones
 * Estrategia: Network-first con fallback a cache
 * Version incrementada para forzar actualizacion
 */

const CACHE_NAME = 'axones-v2.1';
const OFFLINE_URL = '/offline.html';

// CDN resources - estos SI usan cache-first (no cambian)
const CDN_URLS = [
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css',
    'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js',
];

// Install event - cache solo CDN y offline page
self.addEventListener('install', (event) => {
    console.log('[SW] Installing Service Worker v2.1...');

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                // Solo cachear CDN y pagina offline
                const offlinePromise = cache.add(OFFLINE_URL).catch(err => {
                    console.log('[SW] Error caching offline page:', err);
                });
                const cdnPromise = Promise.all(
                    CDN_URLS.map(url =>
                        fetch(url, { mode: 'cors' })
                            .then(response => {
                                if (response.ok) {
                                    return cache.put(url, response);
                                }
                            })
                            .catch(err => console.log('[SW] Error caching CDN:', url, err))
                    )
                );
                return Promise.all([offlinePromise, cdnPromise]);
            })
            .then(() => {
                console.log('[SW] Install complete');
                // Forzar activacion inmediata (no esperar a que cierre la tab)
                return self.skipWaiting();
            })
    );
});

// Activate event - limpiar caches viejos y tomar control inmediato
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating Service Worker v2.1...');

    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((cacheName) => cacheName !== CACHE_NAME)
                        .map((cacheName) => {
                            console.log('[SW] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        })
                );
            })
            .then(() => {
                console.log('[SW] Activation complete - taking control of all clients');
                return self.clients.claim();
            })
    );
});

// Fetch event - NETWORK-FIRST para todo, cache solo como fallback offline
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Skip API calls entirely (Google Apps Script)
    if (url.hostname.includes('script.google.com') ||
        url.hostname.includes('api.groq.com')) {
        return;
    }

    // CDN resources - cache-first (estos nunca cambian por version en URL)
    if (url.hostname.includes('cdn.jsdelivr.net')) {
        event.respondWith(
            caches.match(request)
                .then((cachedResponse) => {
                    return cachedResponse || fetch(request).then((response) => {
                        if (response.ok) {
                            const clone = response.clone();
                            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
                        }
                        return response;
                    });
                })
        );
        return;
    }

    // Todo lo demas: NETWORK-FIRST
    // Intenta la red primero, si falla usa cache, si no hay cache muestra offline
    event.respondWith(
        fetch(request)
            .then((response) => {
                // Guardar en cache para uso offline
                if (response.ok && response.type === 'basic') {
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(request, responseToCache);
                    });
                }
                return response;
            })
            .catch(() => {
                // Sin red - intentar desde cache
                return caches.match(request)
                    .then((cachedResponse) => {
                        if (cachedResponse) {
                            return cachedResponse;
                        }
                        // Si es navegacion, mostrar pagina offline
                        if (request.mode === 'navigate') {
                            return caches.match(OFFLINE_URL);
                        }
                        return new Response('', { status: 408, statusText: 'Offline' });
                    });
            })
    );
});

// Background sync for offline data
self.addEventListener('sync', (event) => {
    console.log('[SW] Background sync event:', event.tag);

    if (event.tag === 'sync-produccion') {
        event.waitUntil(syncProduccion());
    }
});

// Sync pending production data
async function syncProduccion() {
    try {
        const pendingData = await getPendingData();
        if (pendingData && pendingData.length > 0) {
            console.log('[SW] Syncing pending data:', pendingData.length, 'items');
            for (const item of pendingData) {
                try {
                    await sendToServer(item);
                    await removePendingItem(item.id);
                } catch (error) {
                    console.error('[SW] Error syncing item:', error);
                }
            }
        }
    } catch (error) {
        console.error('[SW] Sync error:', error);
    }
}

async function getPendingData() { return []; }
async function sendToServer(data) { console.log('[SW] Would send:', data); }
async function removePendingItem(id) { console.log('[SW] Would remove:', id); }

// Push notifications
self.addEventListener('push', (event) => {
    let data = { title: 'Sistema Axones', body: 'Nueva notificacion' };
    if (event.data) {
        try { data = event.data.json(); } catch (e) { data.body = event.data.text(); }
    }
    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-72x72.png',
            vibrate: [100, 50, 100],
            data: { url: data.url || '/' },
            actions: [
                { action: 'view', title: 'Ver' },
                { action: 'close', title: 'Cerrar' }
            ]
        })
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    if (event.action === 'view' || !event.action) {
        event.waitUntil(clients.openWindow(event.notification.data.url || '/'));
    }
});

console.log('[SW] Service Worker v2.1 loaded');
