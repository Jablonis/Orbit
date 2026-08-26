/* Orbit service worker. The only code that runs when the app is closed. */

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  const title = payload.title || "Orbit";
  event.waitUntil(
    self.registration.showNotification(title, {
      badge: "/icon-192.png",
      body: payload.body || "",
      data: { url: payload.url || "/" },
      icon: "/icon-192.png",
      // One evening reminder replaces the previous one rather than stacking.
      renotify: false,
      tag: "orbit-evening",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    self.clients
      .matchAll({ includeUncontrolled: true, type: "window" })
      .then((clients) => {
        for (const client of clients) {
          if ("focus" in client) {
            client.navigate(target);
            return client.focus();
          }
        }
        return self.clients.openWindow(target);
      }),
  );
});
