import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute, setCatchHandler } from 'workbox-routing';
import { NetworkFirst, NetworkOnly } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

const CACHE_VERSION = 'v1';
const CACHE_NAMES = ['jobs', 'ai', 'users', 'notifications', 'ratings', 'contracts', 'pages'];

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

const cacheConfig = (name, maxEntries, maxAgeSeconds) => ({
  cacheName: `${name}-${CACHE_VERSION}`,
  plugins: [
    new ExpirationPlugin({ maxEntries, maxAgeSeconds }),
  ],
});

registerRoute(
  /^https?:\/\/.*\/api\/jobs/,
  new NetworkFirst(cacheConfig('jobs', 20, 86400))
);

registerRoute(
  /^https?:\/\/.*\/api\/ai/,
  new NetworkOnly()
);

registerRoute(
  /^https?:\/\/.*\/api\/users/,
  new NetworkFirst(cacheConfig('users', 20, 3600))
);

registerRoute(
  /^https?:\/\/.*\/api\/notifications/,
  new NetworkFirst(cacheConfig('notifications', 10, 300))
);

registerRoute(
  /^https?:\/\/.*\/api\/ratings/,
  new NetworkFirst(cacheConfig('ratings', 10, 3600))
);

registerRoute(
  /^https?:\/\/.*\/api\/contracts/,
  new NetworkFirst(cacheConfig('contracts', 10, 3600))
);

registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst(cacheConfig('pages', 5, 86400))
);

setCatchHandler(async ({ event }) => {
  if (event.request.mode === 'navigate') {
    const fallback = await caches.match('/offline.html');
    if (fallback) return fallback;
  }
  return Response.error();
});

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  const currentCaches = CACHE_NAMES.map(name => `${name}-${CACHE_VERSION}`);

  event.waitUntil(
    caches.keys().then((allCaches) => {
      const obsolete = allCaches.filter((cache) => {
        const matched = CACHE_NAMES.some((name) => cache.startsWith(`${name}-`));
        return matched && !currentCaches.includes(cache);
      });
      return Promise.all(obsolete.map((cache) => caches.delete(cache)));
    }).then(() => clients.claim())
  );
});

self.addEventListener('push', (event) => {
  let data;
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'Sira Voice', body: event.data?.text() || '' };
  }

  const title = data.title || 'Sira Voice';
  const body = data.body || '';
  const icon = '/icon-192.png';
  const tag = data.tag || 'sira-notification';

  const options = {
    body,
    icon,
    tag,
    vibrate: [200, 100, 200],
    data: data.data || {},
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
