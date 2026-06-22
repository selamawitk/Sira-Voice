import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, NetworkOnly } from 'workbox-strategies';

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

registerRoute(
  /^https?:\/\/.*\/api\/jobs/,
  new NetworkFirst({ cacheName: 'jobs-cache' })
);

registerRoute(
  /^https?:\/\/.*\/api\/ai/,
  new NetworkOnly({ cacheName: 'ai-cache' })
);

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
