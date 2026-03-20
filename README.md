# `@itzsudhan/creem-datafast`

Generic-first revenue attribution for CREEM + DataFast.

This repo contains:

- `packages/creem-datafast`: the publish-ready TypeScript package
- `apps/demo-next`: the flagship Next.js demo app
- `apps/example-express`: a minimal Express example using the generic raw-body API

## What It Does

- Wraps the official [`creem`](https://docs.creem.io/code/sdks/typescript-core) core SDK
- Captures `datafast_visitor_id` and `datafast_session_id` automatically during checkout creation
- Injects tracking into Creem checkout metadata without dropping merchant metadata
- Verifies `creem-signature` on raw webhook bodies
- Maps `checkout.completed`, `subscription.paid`, and `refund.created` into DataFast payment payloads
- Retries transient DataFast API failures with exponential backoff + jitter
- Deduplicates webhooks with an in-memory store by default and an Upstash-compatible adapter for production
- Works generically with any framework through `handleWebhook({ rawBody, headers })` or `handleWebhookRequest(request)`

## Install

```bash
pnpm add @itzsudhan/creem-datafast
```

## Quickstart

### Next.js

```ts
// lib/creem-datafast.ts
import { createCreemDataFast } from "@itzsudhan/creem-datafast";

export const creemDataFast = createCreemDataFast({
  creemApiKey: process.env.CREEM_API_KEY!,
  creemWebhookSecret: process.env.CREEM_WEBHOOK_SECRET!,
  datafastApiKey: process.env.DATAFAST_API_KEY!,
  testMode: true,
});
```

```ts
// app/api/checkout/route.ts
import { creemDataFast } from "@/lib/creem-datafast";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const checkout = await creemDataFast.createCheckout(
    {
      productId: process.env.CREEM_PRODUCT_ID!,
      successUrl: `${process.env.APP_BASE_URL!}/success`,
    },
    { request },
  );

  return Response.redirect(checkout.checkoutUrl!, 303);
}
```

```ts
// app/api/webhooks/creem/route.ts
import { createNextWebhookHandler } from "@itzsudhan/creem-datafast/next";
import { creemDataFast } from "@/lib/creem-datafast";

export const runtime = "nodejs";
export const POST = createNextWebhookHandler(creemDataFast);
```

### Express

```ts
import express from "express";
import { createCreemDataFast } from "@itzsudhan/creem-datafast";

const app = express();
const creemDataFast = createCreemDataFast({
  creemApiKey: process.env.CREEM_API_KEY!,
  creemWebhookSecret: process.env.CREEM_WEBHOOK_SECRET!,
  datafastApiKey: process.env.DATAFAST_API_KEY!,
  testMode: true,
});

app.post("/checkout", async (req, res) => {
  const checkout = await creemDataFast.createCheckout(
    {
      productId: process.env.CREEM_PRODUCT_ID!,
      successUrl: `${process.env.APP_BASE_URL!}/success`,
    },
    {
      request: {
        headers: req.headers,
        url: `${process.env.APP_BASE_URL!}${req.originalUrl}`,
      },
    },
  );

  res.redirect(303, checkout.checkoutUrl!);
});

app.post("/webhooks/creem", express.raw({ type: "application/json" }), async (req, res) => {
  const result = await creemDataFast.handleWebhook({
    rawBody: req.body.toString("utf8"),
    headers: req.headers,
  });

  res.status(200).send(result.ignored ? "Ignored" : "OK");
});
```

### Generic Handler

Use this in Bun, Hono, Elysia, Nitro, Fetch-style runtimes, or any custom server:

```ts
import { createCreemDataFast, InvalidCreemSignatureError } from "@itzsudhan/creem-datafast";

const creemDataFast = createCreemDataFast({
  creemApiKey: process.env.CREEM_API_KEY!,
  creemWebhookSecret: process.env.CREEM_WEBHOOK_SECRET!,
  datafastApiKey: process.env.DATAFAST_API_KEY!,
});

export async function handleCreemWebhook(request: Request) {
  try {
    const result = await creemDataFast.handleWebhookRequest(request);
    return new Response(result.ignored ? "Ignored" : "OK", { status: 200 });
  } catch (error) {
    if (error instanceof InvalidCreemSignatureError) {
      return new Response("Invalid signature", { status: 401 });
    }

    return new Response("Internal error", { status: 500 });
  }
}
```

## Browser Helper

For cross-origin calls or direct hosted Creem payment links:

```ts
import {
  appendDataFastTracking,
  attributeCreemPaymentLink,
  getDataFastTracking,
} from "@itzsudhan/creem-datafast/client";

const tracking = getDataFastTracking();
const checkoutApiUrl = appendDataFastTracking("/api/checkout", tracking);
const directCreemLink = attributeCreemPaymentLink("https://creem.io/payment/prod_123", tracking);
```

## Framework Cookbook

See [docs/frameworks/README.md](/W:/Code++/creem-datafast/docs/frameworks/README.md) for Bun, Hono, Fastify, Elysia, Nitro, and NestJS examples built on the same generic API.

## Demo Apps

### Next.js Demo

```bash
cp apps/demo-next/.env.example apps/demo-next/.env.local
pnpm install
pnpm --filter demo-next dev
```

The demo includes:

- landing page with the DataFast script
- tracking inspector for browser cookies
- server-created checkout flow
- direct Creem payment-link flow
- webhook route powered by the package
- live feed of forwarded DataFast payloads

### Express Example

```bash
cp apps/example-express/.env.example apps/example-express/.env
pnpm install
pnpm --filter example-express dev
```

## Monorepo Commands

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm build
```

## Package API

Root exports:

- `createCreemDataFast(options)`
- `InvalidCreemSignatureError`
- `MissingTrackingError`
- `DataFastRequestError`
- `UnsupportedEventError`
- `MemoryIdempotencyStore`

Client methods:

- `createCheckout(input, context?)`
- `handleWebhook({ rawBody, headers })`
- `handleWebhookRequest(request)`
- `verifyWebhookSignature(rawBody, headers)`
- `forwardPayment(payment)`

Subpath exports:

- `@itzsudhan/creem-datafast/next`
- `@itzsudhan/creem-datafast/client`
- `@itzsudhan/creem-datafast/idempotency/upstash`

## License

MIT
