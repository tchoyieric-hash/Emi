self.addEventListener("push", (event) => {
  let payload = { title: "EMi", body: "Tu as reçu un nouveau message.", url: "/?tab=Messages" };
  try { if (event.data) payload = { ...payload, ...event.data.json() }; } catch (_) {
    try { if (event.data) payload.body = event.data.text(); } catch (_) {}
  }
  event.waitUntil(self.registration.showNotification(payload.title || "EMi", {
    body: payload.body || "Tu as reçu un nouveau message.",
    icon: "/icons/emi-192.png",
    badge: "/icons/emi-192.png",
    tag: payload.tag || "emi-message",
    data: { url: payload.url || "/?tab=Messages" },
    vibrate: [120, 60, 120]
  }));
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/?tab=Messages", self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if (new URL(client.url).origin === self.location.origin) {
        await client.focus();
        client.postMessage({ type: "EMI_OPEN_MESSAGES" });
        return;
      }
    }
    await self.clients.openWindow(target);
  })());
});