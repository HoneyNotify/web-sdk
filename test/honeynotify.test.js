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
