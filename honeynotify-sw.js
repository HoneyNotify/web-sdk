self.addEventListener("push", event => {
  const payload = event.data?.json() || {};
  event.waitUntil(self.registration.showNotification(payload.title || "Notification", {
    body: payload.body,
    image: payload.image,
    data: { notificationId: payload.notification_id, url: payload.url, custom: payload.data },
    actions: payload.actions || [],
  }));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(windows => {
    const existing = windows.find(windowClient => windowClient.url === url);
    if (existing) return existing.focus();
    return clients.openWindow(url);
  }));
});

self.addEventListener("notificationclose", () => {});
