/**
 * Service Worker - Sistema Axones
 * Permite uso offline y caching de recursos
 */

const CACHE_NAME = 'axones-v1.0';
const OFFLINE_URL = '/offline.html';

// Recursos a cachear inmediatamente
const PRECACHE_URLS = [
    '/',
    '/index.html',
    '/impresion.html',
    '/corte.html',
    '/tintas.html',
    '/inventario.html',
    '/alertas.html',
    '/reportes.html',
    '/chatbot.html',
    '/admin.html',
    '/offline.html',
    '/manifest.json',
    '../src/css/main.css',
    '../src/js/utils/config.js',
    '../src/js/utils/auth.js',
    '../src/js/utils/demoData.js',
    '../src/js/main.js',
    '../src/js/modules/home.js',
    '../src/js/modules/impresion.js',
    '../src/js/modules/corte.js',
    '../src/js/modules/tintas.js',
    '../src/js/modules/inventario.js',
    '../src/js/modules/alertas.js',
    '../src/js/modules/reportes.js',
    '../src/js/modules/chatbot.js',
    '../src/js/modules/admin.js',
];

// CDN resources to cache
const CDN_URLS = [
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css',
    'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js',
];

// Install event - precache resources
self.addEventListener('install', (event) => {
    console.log('[SW] Installing Service Worker...');

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Precaching app shell...');
                // Cache local files
                const localPromise = cache.addAll(PRECACHE_URLS).catch(err => {
                    console.log('[SW] Error caching local files:', err);
                });
                // Cache CDN files
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
                return Promise.all([localPromise, cdnPromise]);
            })
            .then(() => {
                console.log('[SW] Precaching complete');
                return self.skipWaiting();
            })
    );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating Service Worker...');

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
                console.log('[SW] Activation complete');
                return self.clients.claim();
            })
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Skip Google Apps Script API calls (always fetch from network)
    if (url.hostname.includes('script.google.com')) {
        return;
    }

    // Handle navigation requests
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .catch(() => {
                    return caches.match(request)
                        .then((response) => {
                            return response || caches.match(OFFLINE_URL);
                        });
                })
        );
        return;
    }

    // Cache-first strategy for static assets
    event.respondWith(
        caches.match(request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    // Return cached response
                    return cachedResponse;
                }

                // Fetch from network
                return fetch(request)
                    .then((response) => {
                        // Don't cache non-successful responses
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // Clone the response
                        const responseToCache = response.clone();

                        // Cache the fetched resource
                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(request, responseToCache);
                            });

                        return response;
                    })
                    .catch(() => {
                        // Return offline page for navigation
                        if (request.mode === 'navigate') {
                            return caches.match(OFFLINE_URL);
                        }
                        // Return nothing for other resources
                        return new Response('', { status: 408, statusText: 'Request Timeout' });
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
        // Get pending data from IndexedDB or localStorage
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

// Helper functions (would need IndexedDB implementation)
async function getPendingData() {
    // Placeholder - would use IndexedDB in production
    return [];
}

async function sendToServer(data) {
    // Placeholder - would send to Google Apps Script
    console.log('[SW] Would send to server:', data);
}

async function removePendingItem(id) {
    // Placeholder - would remove from IndexedDB
    console.log('[SW] Would remove item:', id);
}

// Push notifications
self.addEventListener('push', (event) => {
    console.log('[SW] Push received:', event);

    let data = { title: 'Sistema Axones', body: 'Nueva notificacion' };

    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data.body = event.data.text();
        }
    }

    const options = {
        body: data.body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        vibrate: [100, 50, 100],
        data: {
            url: data.url || '/'
        },
        actions: [
            { action: 'view', title: 'Ver' },
            { action: 'close', title: 'Cerrar' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Notification click
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification clicked:', event);

    event.notification.close();

    if (event.action === 'view' || !event.action) {
        event.waitUntil(
            clients.openWindow(event.notification.data.url || '/')
        );
    }
});

console.log('[SW] Service Worker loaded');
