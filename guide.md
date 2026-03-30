# Integration Guide

This guide walks from install to a verified CREEM + DataFast attribution flow.

If you want the full package overview first, read [README.md](./README.md). If you want API details only, read [packages/creem-datafast/README.md](./packages/creem-datafast/README.md).

## Who This Is For

Start here if you want the shortest path from package install to a real end-to-end attribution flow. If you are browsing features first, use [README.md](./README.md). If you are already integrating and only need the npm API surface, use [packages/creem-datafast/README.md](./packages/creem-datafast/README.md).

## Goal

By the end of this guide you will have:

- a shared `createCreemDataFast(...)` server client
- checkout creation that injects DataFast IDs into CREEM metadata
- a webhook route that verifies signatures and forwards payments to DataFast
- optional hosted CREEM payment-link attribution
- optional React widgets
- a local signed webhook smoke test

## 1. Install The Package

```bash
pnpm add @itzsudhan/creem-datafast
```

## 2. Set Environment Variables

Required server-side env vars:

- `CREEM_API_KEY`
- `CREEM_WEBHOOK_SECRET`
- `DATAFAST_API_KEY`

Common app env vars:

- `APP_BASE_URL`
- `CREEM_PRODUCT_ID`
- `NEXT_PUBLIC_DATAFAST_WEBSITE_ID`

If you are working through the repo examples, see:

- [apps/demo-next/.env.example](./apps/demo-next/.env.example)
- [apps/example-express/.env.example](./apps/example-express/.env.example)

## 3. Create One Shared Client

```ts
import { createCreemDataFast } from "@itzsudhan/creem-datafast";

export const creemDataFast = createCreemDataFast({
  creemApiKey: process.env.CREEM_API_KEY!,
  creemWebhookSecret: process.env.CREEM_WEBHOOK_SECRET!,
  datafastApiKey: process.env.DATAFAST_API_KEY!,
  testMode: true,
});
```

That instance is the center of the integration.

## 4. Create Checkouts Through The Wrapper

The important part is that checkout creation goes through `createCheckout(...)`, not raw `creem.checkouts.create(...)`.

```ts
const checkout = await creemDataFast.createCheckout(
  {
    productId: process.env.CREEM_PRODUCT_ID!,
    successUrl: `${process.env.APP_BASE_URL!}/success`,
  },
  { request },
);
```

Why this matters:

- the package resolves `datafast_visitor_id`
- it resolves `datafast_session_id`
- it merges those into CREEM metadata
- it preserves merchant metadata

Tracking resolution order:

1. explicit `tracking`
2. existing `metadata.datafast_*`
3. query params `datafast_*`
4. query params `_df_vid` / `_df_sid`
5. cookies `datafast_visitor_id` / `datafast_session_id`

## 5. Add A Webhook Route

The webhook route must preserve the raw body.

### Fetch-style runtimes

```ts
export async function POST(request: Request) {
  const result = await creemDataFast.handleWebhookRequest(request);
  return new Response(result.ignored ? "Ignored" : "OK", { status: 200 });
}
```

### Express

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

### Generic raw-body runtimes

```ts
const result = await creemDataFast.handleWebhook({
  rawBody,
  headers,
});
```

Never JSON-parse the CREEM webhook body before signature verification.

## 6. Verify The Browser Attribution Path

If the browser is calling your own checkout API route, use the client helpers:

```ts
import {
  appendDataFastTracking,
  getDataFastTracking,
} from "@itzsudhan/creem-datafast/client";

const tracking = getDataFastTracking();
const url = appendDataFastTracking("/api/checkout", tracking);
```

If you are using a direct hosted CREEM payment link:

```ts
import { attributeCreemPaymentLink } from "@itzsudhan/creem-datafast/client";

const directLink = attributeCreemPaymentLink("https://creem.io/payment/prod_123", tracking);
```

## 7. Optional React Setup

Use the React layer if you want the package to own the browser-side DataFast flow.

```tsx
"use client";

import {
  CreemCheckoutButton,
  CreemDataFastProvider,
  CreemPaymentLinkButton,
  TrackingInspector,
} from "@itzsudhan/creem-datafast/react";

export function AttributionSurface() {
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

The React layer handles:

- DataFast SDK init
- initial pageview flush
- visitor/session state
- attributed server-checkout actions
- attributed hosted payment links

More detail: [docs/react.md](./docs/react.md)

## 8. Run Readiness Checks

Use `healthCheck()` when deploying or debugging:

```ts
const health = await creemDataFast.healthCheck();
```

What it tells you:

- whether CREEM config is present
- whether the webhook secret is present
- whether the DataFast API key is present
- whether the DataFast endpoint is reachable

## 9. Replay A Signed Webhook

Use `replayWebhook(...)` when you want to re-run a valid signed payload without tripping idempotency:

```ts
const replayed = await creemDataFast.replayWebhook({ rawBody, headers });
```

This is useful for:

- support flows
- debugging payload mapping
- validating retry logic

## 10. Run A Local Smoke Test

The package ships a signed webhook smoke CLI with a built-in fixture:

```bash
pnpm smoke:webhook --url http://localhost:3000/webhooks/creem --secret whsec_xxx
```

Published package form:

```bash
npx @itzsudhan/creem-datafast smoke-webhook --url http://localhost:3000/webhooks/creem --secret whsec_xxx
```

If you only want to inspect the signed payload:

```bash
node packages/creem-datafast/bin/creem-datafast.cjs smoke-webhook --print-only --secret whsec_test_secret
```

## 11. Confirm The End-To-End Flow

Your integration is in good shape when all of these are true:

1. the browser has a DataFast visitor ID
2. `createCheckout()` resolves tracking and injects metadata
3. the CREEM webhook route receives the raw body intact
4. signature verification succeeds
5. the mapped payment sent to DataFast includes:
   - `amount`
   - `currency`
   - `transaction_id`
   - `datafast_visitor_id`

## Common Mistakes

- using `creem_io` instead of the official `creem` core SDK
- creating checkouts directly through the SDK instead of `createCheckout(...)`
- parsing webhook JSON before signature verification
- forgetting `express.raw({ type: "application/json" })` on Express routes
- testing subdomain flows without root-domain DataFast configuration

For fixes, read [docs/troubleshooting.md](./docs/troubleshooting.md).

## Where To Go Next

- Full package overview: [README.md](./README.md)
- Package API README: [packages/creem-datafast/README.md](./packages/creem-datafast/README.md)
- Framework cookbook: [docs/frameworks/README.md](./docs/frameworks/README.md)
- React guide: [docs/react.md](./docs/react.md)
- Testing and quality: [docs/testing-and-quality.md](./docs/testing-and-quality.md)
- Troubleshooting: [docs/troubleshooting.md](./docs/troubleshooting.md)
