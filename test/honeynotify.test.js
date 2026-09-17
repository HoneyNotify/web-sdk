import assert from "node:assert/strict";
import test from "node:test";

import { HoneyNotify } from "../honeynotify.js";

test("normalises the API base URL", async () => {
  const originalFetch = globalThis.fetch;
  const originalLocalStorage = globalThis.localStorage;
  let requestedUrl;

  globalThis.localStorage = {
    getItem: () => "device-id",
  };
  globalThis.fetch = async (url) => {
    requestedUrl = url;
    return {
      ok: true,
      json: async () => ({}),
    };
  };

  try {
    const client = new HoneyNotify({
      baseURL: "https://api.honeynotify.com/",
      clientKey: "ps_public_test",
      vapidPublicKey: "test",
    });

    await client.track("opened");
    assert.equal(requestedUrl, "https://api.honeynotify.com/v1/events");
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.localStorage = originalLocalStorage;
  }
});

test("sends non-standard names as custom events", async () => {
  const originalFetch = globalThis.fetch;
  const originalLocalStorage = globalThis.localStorage;
  let requestBody;

  globalThis.localStorage = {
    getItem: () => "device-id",
  };
  globalThis.fetch = async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return {
      ok: true,
      json: async () => ({}),
    };
  };

  try {
    const client = new HoneyNotify({
      baseURL: "https://api.honeynotify.com",
      clientKey: "ps_public_test",
      vapidPublicKey: "test",
    });

    await client.track("checkout_completed", {
      notificationId: "notification-id",
      metadata: { orderId: "order-123" },
    });

    assert.deepEqual(requestBody, {
      event_type: "custom",
      event_name: "checkout_completed",
      notification_id: "notification-id",
      device_id: "device-id",
      metadata: { orderId: "order-123" },
    });
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.localStorage = originalLocalStorage;
  }
});

test("registers the service worker with site-wide scope", async () => {
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  const originalNotification = globalThis.Notification;
  const originalWindow = globalThis.window;
  const originalFetch = globalThis.fetch;
  const originalLocalStorage = globalThis.localStorage;
  let registrationArguments;

  Object.defineProperty(globalThis, "navigator", { configurable: true, writable: true, value: {
    language: "en-GB",
    serviceWorker: {
      register: async (...args) => {
        registrationArguments = args;
        return {
          pushManager: {
            subscribe: async () => ({ toJSON: () => ({ endpoint: "https://push.example/subscription" }) }),
          },
        };
      },
    },
  } });
  globalThis.Notification = { requestPermission: async () => "granted" };
  globalThis.window = { PushManager: class PushManager {} };
  globalThis.localStorage = { setItem: () => {} };
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ device_id: "device-id" }) });

  try {
    const client = new HoneyNotify({
      baseURL: "https://api.honeynotify.com",
      clientKey: "ps_public_test",
      vapidPublicKey: "dGVzdA",
      serviceWorkerPath: "/honeynotify/service-worker",
    });
    await client.requestPermissionAndRegister();
    assert.deepEqual(registrationArguments, ["/honeynotify/service-worker", { scope: "/" }]);
  } finally {
    if (originalNavigator) Object.defineProperty(globalThis, "navigator", originalNavigator);
    else delete globalThis.navigator;
    globalThis.Notification = originalNotification;
    globalThis.window = originalWindow;
    globalThis.fetch = originalFetch;
    globalThis.localStorage = originalLocalStorage;
  }
});

test("unsubscribes the browser and disables its HoneyNotify device", async () => {
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  const originalFetch = globalThis.fetch;
  const originalLocalStorage = globalThis.localStorage;
  let browserUnsubscribed = false;
  let requestedUrl;
  let requestedOptions;

  Object.defineProperty(globalThis, "navigator", { configurable: true, writable: true, value: {
    serviceWorker: {
      getRegistration: async () => ({
        pushManager: {
          getSubscription: async () => ({
            unsubscribe: async () => {
              browserUnsubscribed = true;
            },
          }),
        },
      }),
    },
  } });
  globalThis.localStorage = {
    getItem: () => "550e8400-e29b-41d4-a716-446655440000",
    removeItem: () => {},
  };
  globalThis.fetch = async (url, options) => {
    requestedUrl = url;
    requestedOptions = options;
    return { ok: true, json: async () => ({}) };
  };

  try {
    const client = new HoneyNotify({
      baseURL: "https://api.honeynotify.com",
      clientKey: "ps_public_test",
      vapidPublicKey: "test",
    });
    await client.unsubscribe();
    assert.equal(browserUnsubscribed, true);
    assert.equal(requestedUrl, "https://api.honeynotify.com/v1/devices/550e8400-e29b-41d4-a716-446655440000");
    assert.equal(requestedOptions.method, "DELETE");
  } finally {
    if (originalNavigator) Object.defineProperty(globalThis, "navigator", originalNavigator);
    else delete globalThis.navigator;
    globalThis.fetch = originalFetch;
    globalThis.localStorage = originalLocalStorage;
  }
});
