# `@itzsudhan/creem-datafast`

Generic-first revenue attribution bridge between CREEM and DataFast.

This package wraps the official CREEM core TypeScript SDK, injects DataFast visitor attribution into checkout metadata, verifies CREEM webhooks, and forwards normalized payment events to DataFast with production-minded defaults.

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

## Exports

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

## Full Documentation

- Repo: [github.com/SudhanPlayz/creem-datafast](https://github.com/SudhanPlayz/creem-datafast)
- Demo: [creem-datafast.itzsudhan.com](https://creem-datafast.itzsudhan.com)
- React guide: [docs/react.md](https://github.com/SudhanPlayz/creem-datafast/blob/master/docs/react.md)
- Framework cookbook: [docs/frameworks/README.md](https://github.com/SudhanPlayz/creem-datafast/blob/master/docs/frameworks/README.md)
- Testing and quality: [docs/testing-and-quality.md](https://github.com/SudhanPlayz/creem-datafast/blob/master/docs/testing-and-quality.md)
- Troubleshooting: [docs/troubleshooting.md](https://github.com/SudhanPlayz/creem-datafast/blob/master/docs/troubleshooting.md)

## License

MIT
