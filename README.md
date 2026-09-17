# HoneyNotify Web SDK

The HoneyNotify Web SDK registers standards-based Web Push subscriptions and reports notification lifecycle events to HoneyNotify.

## Requirements

- A browser with Service Worker, Push API, and Notification API support
- A HoneyNotify public mobile client key (`ps_public_...`)
- Your app's VAPID public key

Public mobile client keys are restricted by the HoneyNotify API to device registration and event reporting. Never put a notification-send key in browser code.

## Install

Copy `honeynotify.js` into your application and serve `honeynotify-sw.js` from the site root. Import the client as an ES module:

```js
import { HoneyNotify } from "/assets/honeynotify.js";

const honeyNotify = new HoneyNotify({
  baseURL: "https://api.honeynotify.com",
  clientKey: "ps_public_your_key",
  vapidPublicKey: "your_vapid_public_key",
  serviceWorkerPath: "/honeynotify-sw.js",
});

const deviceId = await honeyNotify.requestPermissionAndRegister({
  externalUserId: "customer-123",
  tags: { plan: "pro" },
});
```

When verified identity is enabled, obtain a short-lived ES256 identity token from your backend and pass it as `identityToken`. Do not create identity tokens in browser code.

## Events and unsubscribe

```js
await honeyNotify.track("opened", { notificationId: "notification-id" });
await honeyNotify.track("checkout_completed", {
  metadata: { orderId: "order-123" },
});
await honeyNotify.unsubscribe();
```

The standard event names are `received`, `opened`, `clicked`, `dismissed`, and `confirmed_delivered`. Other names are sent as custom events.

## Test

```bash
npm test
```
