self.addEventListener('push', (event) => {
  event.waitUntil(
    (async () => {
      let payload;
      try {
        payload = event.data?.json();
      } catch {
        return;
      }

      if (
        !payload ||
        typeof payload.title !== 'string' ||
        !payload.title.trim() ||
        typeof payload.body !== 'string' ||
        !payload.body.trim() ||
        typeof payload.tag !== 'string' ||
        !payload.tag.trim() ||
        payload.url !== '/habit' ||
        typeof payload.expiresAt !== 'number' ||
        !Number.isFinite(payload.expiresAt) ||
        payload.expiresAt <= Date.now()
      ) {
        return;
      }

      await self.registration.showNotification(payload.title, {
        body: payload.body,
        tag: payload.tag,
        data: { url: '/habit' },
      });
    })(),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const target = new URL('/habit', self.location.origin);
      const windows = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      const existing = windows.find((client) => {
        const url = new URL(client.url);
        return url.origin === target.origin && url.pathname === target.pathname;
      });
      if (existing) {
        await existing.focus();
      } else {
        await self.clients.openWindow(target.href);
      }
    })(),
  );
});
