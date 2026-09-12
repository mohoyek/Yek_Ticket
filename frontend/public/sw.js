/* Freebuff push service worker — handles Web Push messages even when the app tab is closed. */

self.addEventListener('push', (event) => {
  let data = { title: 'فریباف — اعلان جدید', body: 'اعلان جدید دارید', ticketId: null };
  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
    }
  } catch (e) {
    if (event.data) data.body = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      tag: data.ticketId ? `ticket-${data.ticketId}` : 'freebuff-notification',
      dir: 'rtl',
      lang: 'fa',
      data: { ticketId: data.ticketId },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const ticketId = event.notification.data && event.notification.data.ticketId;
  const url = new URL(self.registration.scope);
  const target = ticketId
    ? `${url.origin}/tickets/${ticketId}`
    : url.origin;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus an existing app window if one exists, else open a new one
      for (const client of clientList) {
        if (client.url.startsWith(url.origin) && 'focus' in client) {
          client.focus();
          if (ticketId) {
            client.postMessage({ type: 'open-ticket', ticketId });
          }
          return;
        }
      }
      return self.clients.openWindow(target);
    })
  );
});
