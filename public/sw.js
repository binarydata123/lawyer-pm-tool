self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data?.json() ?? {};
  } catch (e) {}

  event.waitUntil(
    (async () => {
      await new Promise((r) => setTimeout(r, 400));

      const clientList = await clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      clientList.forEach((client) => {
        client.postMessage({
          type: "CHAT_PUSH_RECEIVED",
          payload: data,
        });
      });

      const isActive = clientList.some(
        (c) => c.focused && c.visibilityState === "visible",
      );

      if (isActive) return;

      const notificationData = data.data || {};
      const channelId = data.channel_id || notificationData.channel_id;
      const dmId = data.dm_id || notificationData.dm_id;
      let url = "/";
      if (channelId) url = `/?channel=${channelId}`;
      else if (dmId) url = `/?dm=${dmId}`;

      return self.registration.showNotification(data.title || "New message", {
        body: data.body || "",
        icon: data.icon || "/icons/icon-192.png",
        badge: "/icons/icon-72.png",
        tag: data.tag,
        renotify: true,
        data: { url },
      });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ("focus" in client) {
          client.postMessage({ type: "NAVIGATE", url });
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    }),
  );
});
