export class HoneyNotify {
  constructor({ baseURL, clientKey, vapidPublicKey, serviceWorkerPath = "/honeynotify-sw.js" }) {
    this.baseURL = baseURL.replace(/\/$/, "");
    this.clientKey = clientKey;
    this.vapidPublicKey = vapidPublicKey;
    this.serviceWorkerPath = serviceWorkerPath;
  }

  async requestPermissionAndRegister({ externalUserId, identityToken, tags = {} } = {}) {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) throw new Error("Web Push is not supported");
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;
    const registration = await navigator.serviceWorker.register(this.serviceWorkerPath);
    const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: this.#key(this.vapidPublicKey) });
    const response = await this.#request("/v1/devices/register", {
      platform: "web",
      push_token: JSON.stringify(subscription.toJSON()),
      external_user_id: externalUserId,
      identity_token: identityToken,
      locale: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      tags,
    });
    localStorage.setItem("HoneyNotify.deviceId", response.device_id);
    return response.device_id;
  }

  async track(event, { notificationId, metadata = {} } = {}) {
    return this.#request("/v1/events", { event_type: ["received", "opened", "clicked", "dismissed", "confirmed_delivered"].includes(event) ? event : "custom", event_name: ["received", "opened", "clicked", "dismissed", "confirmed_delivered"].includes(event) ? undefined : event, notification_id: notificationId, device_id: localStorage.getItem("HoneyNotify.deviceId"), metadata });
  }

  async unsubscribe() {
    const registration = await navigator.serviceWorker.getRegistration(this.serviceWorkerPath);
    const subscription = await registration?.pushManager.getSubscription();
    await subscription?.unsubscribe();
    const deviceId = localStorage.getItem("HoneyNotify.deviceId");
    if (deviceId) await this.#request(`/v1/devices/${deviceId}`, undefined, "DELETE");
    localStorage.removeItem("HoneyNotify.deviceId");
  }

  async #request(path, body, method = "POST") {
    const response = await fetch(this.baseURL + path, { method, headers: { Authorization: `Bearer ${this.clientKey}`, "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error?.message || `HoneyNotify request failed (${response.status})`);
    return payload;
  }

  #key(value) {
    const padding = "=".repeat((4 - value.length % 4) % 4);
    const raw = atob((value + padding).replace(/-/g, "+").replace(/_/g, "/"));
    return Uint8Array.from([...raw].map(character => character.charCodeAt(0)));
  }
}
