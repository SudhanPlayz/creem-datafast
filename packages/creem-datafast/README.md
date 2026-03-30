# `@itzsudhan/creem-datafast`

Generic-first revenue attribution bridge between CREEM and DataFast.

This package wraps the official CREEM core TypeScript SDK, injects DataFast visitor attribution into checkout metadata, verifies CREEM webhooks, and forwards normalized payment events to DataFast with production-minded defaults.

![License](https://img.shields.io/badge/license-MIT-111111?style=flat-square)
![Tests](https://img.shields.io/badge/tests-92%20passing-111111?style=flat-square)
![Coverage](https://img.shields.io/badge/coverage-100%25-111111?style=flat-square)
![Types](https://img.shields.io/badge/types-TypeScript-111111?style=flat-square)
![React](https://img.shields.io/badge/react-optional%20layer-111111?style=flat-square)

Need the repo-level overview or a step-by-step setup path?

- Repo overview: [README.md](https://github.com/SudhanPlayz/creem-datafast/blob/master/README.md)
- Guided setup: [guide.md](https://github.com/SudhanPlayz/creem-datafast/blob/master/guide.md)
- Docs index: [docs/README.md](https://github.com/SudhanPlayz/creem-datafast/blob/master/docs/README.md)

## At A Glance

| Need | Use |
| --- | --- |
| create attributed CREEM checkouts | `createCheckout(input, context?)` |
| verify and forward CREEM webhooks | `handleWebhook(...)` or `handleWebhookRequest(...)` |
| quick Next.js route setup | `@itzsudhan/creem-datafast/next` |
| quick Express webhook setup | `@itzsudhan/creem-datafast/express` |
| preserve attribution in the browser | `@itzsudhan/creem-datafast/client` |
| ship a ready-made React attribution UI | `@itzsudhan/creem-datafast/react` |
| replay and smoke-test webhooks | `replayWebhook()`, `healthCheck()`, `smoke-webhook` CLI |

## Why Use It

- Official `creem` core SDK wrapper, not `creem_io`
- Auto-captures `datafast_visitor_id` and `datafast_session_id`
- Supports `checkout.completed`, `subscription.paid`, and `refund.created`
- Generic webhook API for any framework
- Tiny Next.js and Express helpers for fast framework integration
- Browser helpers for hosted CREEM payment links and cross-origin checkout requests
- Optional React attribution layer with provider, hooks, and neobrutalist widgets
- `healthCheck()`, `replayWebhook()`, and a signed `smoke-webhook` CLI
- Idempotency, retry logic, currency-aware amount conversion, and typed errors
- `92` tests with `100%` statements, branches, functions, and lines

## Install

```bash
pnpm add @itzsudhan/creem-datafast
```

Peer dependencies for the React layer:

```bash
pnpm add react react-dom
```

## Fastest Path

1. Create one shared client.
2. Route checkout creation through `createCheckout(...)`.
3. Add a raw-body-safe webhook route.
4. Use `/client` or `/react` if the browser needs to carry attribution forward.

For the longer walkthrough, use [guide.md](https://github.com/SudhanPlayz/creem-datafast/blob/master/guide.md).

## Core Setup

```ts
import { createCreemDataFast } from "@itzsudhan/creem-datafast";

export const creemDataFast = createCreemDataFast({
  creemApiKey: process.env.CREEM_API_KEY!,
  creemWebhookSecret: process.env.CREEM_WEBHOOK_SECRET!,
  datafastApiKey: process.env.DATAFAST_API_KEY!,
  testMode: true,
});
```

## Core API

| Method | Purpose |
| --- | --- |
| `createCheckout(input, context?)` | resolve tracking and inject it into CREEM metadata |
| `handleWebhook({ rawBody, headers })` | verify, map, deduplicate, and forward a webhook |
| `handleWebhookRequest(request)` | same flow for Fetch-style runtimes |
| `verifyWebhookSignature(rawBody, headers)` | verify the `creem-signature` header |
| `forwardPayment(payment)` | manually forward a DataFast payment payload |
| `healthCheck()` | inspect config/readiness status |
| `replayWebhook({ rawBody, headers })` | reprocess a signed webhook without idempotency claim checks |

## Create Checkouts

```ts
const checkout = await creemDataFast.createCheckout(
  {
    productId: process.env.CREEM_PRODUCT_ID!,
    successUrl: "https://example.com/success",
  },
  { request },
);
```

Tracking resolution order:

1. Explicit `tracking`
2. Existing `metadata.datafast_*`
3. Query params `datafast_*`
4. Query params `_df_vid` / `_df_sid`
5. Cookies `datafast_visitor_id` / `datafast_session_id`

That resolved tracking is merged into CREEM metadata without dropping merchant metadata.

## Verify Webhooks

### Generic Fetch-Style Runtimes

```ts
const result = await creemDataFast.handleWebhookRequest(request);
return new Response(result.ignored ? "Ignored" : "OK", { status: 200 });
```

### Generic Raw-Body Runtimes

```ts
const result = await creemDataFast.handleWebhook({
  rawBody,
  headers,
});
```

### Next.js Helper

```ts
import { createNextWebhookHandler } from "@itzsudhan/creem-datafast/next";

export const POST = createNextWebhookHandler(creemDataFast);
```

### Express Helper

```ts
import express from "express";
import { createExpressWebhookHandler } from "@itzsudhan/creem-datafast/express";

const app = express();
app.post(
  "/webhooks/creem",
  express.raw({ type: "application/json" }),
  createExpressWebhookHandler(creemDataFast),
);
```

If your framework is not listed here, use the generic handler and then check the framework recipes in [docs/frameworks/README.md](https://github.com/SudhanPlayz/creem-datafast/blob/master/docs/frameworks/README.md).

## Browser Helpers

```ts
import {
  appendDataFastTracking,
  attributeCreemPaymentLink,
  getDataFastTracking,
} from "@itzsudhan/creem-datafast/client";

const tracking = getDataFastTracking();
const checkoutApiUrl = appendDataFastTracking("/api/checkout", tracking);
const directPaymentLink = attributeCreemPaymentLink("https://creem.io/payment/prod_123", tracking);
```

These helpers are useful when the browser needs to:

- call a checkout creation API route with live DataFast IDs
- preserve attribution across domains
- append CREEM metadata to a direct hosted payment link

## React Layer

The React layer gives you a client-side DataFast provider, attributed buttons, hooks, and styled neobrutalist widgets.

```tsx
"use client";

import {
  CreemCheckoutButton,
  CreemDataFastProvider,
  CreemPaymentLinkButton,
  TrackingInspector,
} from "@itzsudhan/creem-datafast/react";

export function CheckoutSurface() {
  return (
    <CreemDataFastProvider apiUrl="/api/events" websiteId={process.env.NEXT_PUBLIC_DATAFAST_WEBSITE_ID!}>
      <TrackingInspector />
      <CreemCheckoutButton action="/api/checkout">Launch Server Checkout</CreemCheckoutButton>
      <CreemPaymentLinkButton href="https://creem.io/payment/prod_123">
        Open Direct Creem Link
      </CreemPaymentLinkButton>
    </CreemDataFastProvider>
  );
}
```

The React bundle ships:

- `CreemDataFastProvider`
- `useDataFastTracking()`
- `useAttributedCheckoutAction()`
- `useAttributedPaymentLink()`
- `CreemCheckoutButton`
- `CreemPaymentLinkButton`
- `TrackingStatusBadge`
- `TrackingInspector`

More detail: [docs/react.md](https://github.com/SudhanPlayz/creem-datafast/blob/master/docs/react.md)

## Forwarded Payment Shape

The package maps CREEM webhook data into the DataFast Payments API format:

```ts
{
  amount: 40,
  currency: "USD",
  transaction_id: "tran_123",
  datafast_visitor_id: "visitor_uuid",
  email: "buyer@example.com",
  name: "Buyer Name",
  customer_id: "cust_123",
  renewal: false,
  refunded: false,
  timestamp: "2026-03-20T06:19:21.868Z"
}
```

## Production Defaults

- Webhook deduplication with `MemoryIdempotencyStore`
- Upstash Redis adapter at `@itzsudhan/creem-datafast/idempotency/upstash`
- Retries with exponential backoff and jitter
- Currency-aware conversion for zero-decimal and three-decimal currencies
- Subscription payment hydration through the CREEM API when enabled
- `healthCheck()` for deploy/readiness checks
- `replayWebhook()` for signed webhook reprocessing without idempotency claim checks
- Typed request errors with retry metadata

## Operational Helpers

```ts
const health = await creemDataFast.healthCheck();
const replayed = await creemDataFast.replayWebhook({ rawBody, headers });
```

Signed local webhook smoke replay:

```bash
npx @itzsudhan/creem-datafast smoke-webhook --url http://localhost:3000/webhooks/creem --secret whsec_xxx
```

## Export Surface

### Root

- `createCreemDataFast`
- `createExpressWebhookHandler`
- `InvalidCreemSignatureError`
- `MissingTrackingError`
- `DataFastRequestError`
- `UnsupportedEventError`
- `MemoryIdempotencyStore`

### Subpaths

- `@itzsudhan/creem-datafast/react`
- `@itzsudhan/creem-datafast/next`
- `@itzsudhan/creem-datafast/express`
- `@itzsudhan/creem-datafast/client`
- `@itzsudhan/creem-datafast/idempotency/upstash`

## AI Agent Skill

Hosted skill prompt:

```text
Read https://creem-datafast.itzsudhan.com/SKILL.md and integrate @itzsudhan/creem-datafast into this app.
```

Local skill install:

```bash
npx @itzsudhan/creem-datafast skill --write ./SKILL.md
```

## Read More

- Repo: [github.com/SudhanPlayz/creem-datafast](https://github.com/SudhanPlayz/creem-datafast)
- Demo: [creem-datafast.itzsudhan.com](https://creem-datafast.itzsudhan.com)
- Guided setup: [guide.md](https://github.com/SudhanPlayz/creem-datafast/blob/master/guide.md)
- React guide: [docs/react.md](https://github.com/SudhanPlayz/creem-datafast/blob/master/docs/react.md)
- Framework cookbook: [docs/frameworks/README.md](https://github.com/SudhanPlayz/creem-datafast/blob/master/docs/frameworks/README.md)
- Testing and quality: [docs/testing-and-quality.md](https://github.com/SudhanPlayz/creem-datafast/blob/master/docs/testing-and-quality.md)
- Troubleshooting: [docs/troubleshooting.md](https://github.com/SudhanPlayz/creem-datafast/blob/master/docs/troubleshooting.md)

## License

MIT
