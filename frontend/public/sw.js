const CACHE_NAME = 'nirvigh-hrms-cache-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/pwa-192x192.png',
  '/pwa-512x512.png'
];

// ── Install Event ────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

// ── Fetch Event (Network-first) ──────────────────────────────
self.addEventListener('fetch', event => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Network first, then fallback to cache
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Don't cache bad responses or opaque responses
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // Clone the response because it can only be consumed once
        const responseToCache = response.clone();
        caches.open(CACHE_NAME)
          .then(cache => {
            cache.put(event.request, responseToCache);
          });

        return response;
      })
      .catch(() => {
        // If network fails, try the cache
        return caches.match(event.request);
      })
  );
});

// ── Activate Event ───────────────────────────────────────────
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// ══════════════════════════════════════════════════════════════
// WEB PUSH NOTIFICATIONS
// ══════════════════════════════════════════════════════════════

// ── Push Event — Received a push notification from the server ─
self.addEventListener('push', event => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch (e) {
    data = {
      title: 'NAP HRMS',
      body: event.data.text(),
    };
  }

  const title = data.title || 'NAP HRMS';
  const options = {
    body: data.body || '',
    icon: data.icon || '/pwa-192x192.png',
    badge: data.badge || '/pwa-192x192.png',
    vibrate: [100, 50, 100],
    data: data.data || {},
    tag: data.tag || 'nap-hrms-notification',
    renotify: true,
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// ── Notification Click — User tapped the notification ─────────
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  // Get the URL to open from the notification data
  const urlToOpen = event.notification.data?.url || '/';
  const fullUrl = new URL(urlToOpen, self.location.origin).href;

  event.waitUntil(
    // Try to focus an existing window, or open a new one
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // Check if there's already a window/tab open
        for (const client of clientList) {
          if (client.url.startsWith(self.location.origin) && 'focus' in client) {
            client.focus();
            client.navigate(fullUrl);
            return;
          }
        }
        // No existing window found — open a new one
        return self.clients.openWindow(fullUrl);
      })
  );
});

// ── Push Subscription Change ──────────────────────────────────
self.addEventListener('pushsubscriptionchange', event => {
  // The subscription has changed (e.g., browser rotated keys)
  // Re-subscribe and send the new subscription to the server
  event.waitUntil(
    self.registration.pushManager.subscribe(event.oldSubscription.options)
      .then(subscription => {
        // Send updated subscription to backend
        return fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            endpoint: subscription.endpoint,
            keys: {
              p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')))),
              auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')))),
            },
          }),
        });
      })
  );
});
