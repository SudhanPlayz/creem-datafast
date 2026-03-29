# Framework Cookbook

All integrations in this repo use the same generic package surface:

- `handleWebhookRequest(request)` for Fetch-style runtimes
- `handleWebhook({ rawBody, headers })` for raw-body Node runtimes
- `createCheckout(input, { request })` for checkout creation in any framework

Only Next.js gets a dedicated helper export. Every other framework uses the same generic core.

## Pick The Right Primitive

| Runtime style | Best method |
| --- | --- |
| Bun, Hono, Elysia, Nitro, Fetch/Workers | `handleWebhookRequest(request)` |
| Express, Fastify, NestJS, Node HTTP | `handleWebhook({ rawBody, headers })` |

## Shared Setup

```ts
import { createCreemDataFast } from "@itzsudhan/creem-datafast";

export const creemDataFast = createCreemDataFast({
  creemApiKey: process.env.CREEM_API_KEY!,
  creemWebhookSecret: process.env.CREEM_WEBHOOK_SECRET!,
  datafastApiKey: process.env.DATAFAST_API_KEY!,
  testMode: true,
});
```

## Next.js

```ts
import { createNextWebhookHandler } from "@itzsudhan/creem-datafast/next";
import { creemDataFast } from "@/lib/creem-datafast";

export const runtime = "nodejs";
export const POST = createNextWebhookHandler(creemDataFast);
```

Checkout creation:

```ts
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

## Express

```ts
import express from "express";
import { createCreemDataFast } from "@itzsudhan/creem-datafast";
import { createExpressWebhookHandler } from "@itzsudhan/creem-datafast/express";

const app = express();
const client = createCreemDataFast({ ...env });

app.post(
  "/webhooks/creem",
  express.raw({ type: "application/json" }),
  createExpressWebhookHandler(client),
);
```

Checkout creation:

```ts
app.post("/checkout", async (req, res) => {
  const checkout = await client.createCheckout(
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
```

## Bun

```ts
import { createCreemDataFast } from "@itzsudhan/creem-datafast";

const client = createCreemDataFast({ ...env });

Bun.serve({
  port: 3000,
  async fetch(request) {
    if (new URL(request.url).pathname === "/webhooks/creem") {
      const result = await client.handleWebhookRequest(request);
      return new Response(result.ignored ? "Ignored" : "OK");
    }

    return new Response("Not found", { status: 404 });
  },
});
```

## Hono

```ts
import { Hono } from "hono";
import { createCreemDataFast } from "@itzsudhan/creem-datafast";

const app = new Hono();
const client = createCreemDataFast({ ...env });

app.post("/webhooks/creem", async (c) => {
  const result = await client.handleWebhookRequest(c.req.raw);
  return c.text(result.ignored ? "Ignored" : "OK");
});
```

## Fastify

Fastify must expose the raw body. The exact plugin depends on your setup.

```ts
import Fastify from "fastify";
import { createCreemDataFast } from "@itzsudhan/creem-datafast";

const app = Fastify();
const client = createCreemDataFast({ ...env });

app.post("/webhooks/creem", { config: { rawBody: true } }, async (request, reply) => {
  const result = await client.handleWebhook({
    rawBody: request.body as string,
    headers: request.headers,
  });

  reply.code(200).send(result.ignored ? "Ignored" : "OK");
});
```

## Elysia

```ts
import { Elysia } from "elysia";
import { createCreemDataFast } from "@itzsudhan/creem-datafast";

const app = new Elysia();
const client = createCreemDataFast({ ...env });

app.post("/webhooks/creem", async ({ request }) => {
  const result = await client.handleWebhookRequest(request);
  return new Response(result.ignored ? "Ignored" : "OK");
});
```

## Nitro

```ts
import { createCreemDataFast } from "@itzsudhan/creem-datafast";

const client = createCreemDataFast({ ...env });

export default defineEventHandler(async (event) => {
  const request = toWebRequest(event);
  const result = await client.handleWebhookRequest(request);
  return result.ignored ? "Ignored" : "OK";
});
```

## NestJS

NestJS usually sits on top of Express or Fastify, so raw-body preservation still matters.

```ts
import { Controller, Headers, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { createCreemDataFast } from "@itzsudhan/creem-datafast";

const client = createCreemDataFast({ ...env });

@Controller("webhooks")
export class CreemWebhookController {
  @Post("creem")
  async handle(@Req() req: Request, @Headers() headers: Record<string, string>) {
    const result = await client.handleWebhook({
      rawBody: req.body.toString("utf8"),
      headers,
    });

    return result.ignored ? "Ignored" : "OK";
  }
}
```

## Checkout Context In Any Framework

Whenever possible, pass request context into `createCheckout()` so the package can resolve DataFast tracking from cookies and query params:

```ts
const checkout = await client.createCheckout(
  {
    productId: process.env.CREEM_PRODUCT_ID!,
    successUrl: "https://example.com/success",
  },
  {
    request: {
      headers,
      url,
    },
  },
);
```

If you already have tracking in the browser, you can also pass it explicitly:

```ts
const checkout = await client.createCheckout({
  productId: process.env.CREEM_PRODUCT_ID!,
  successUrl: "https://example.com/success",
  tracking: {
    datafastVisitorId: visitorId,
    datafastSessionId: sessionId,
  },
});
```

## Direct Hosted CREEM Links

For client-side hosted payment links:

```ts
import { attributeCreemPaymentLink } from "@itzsudhan/creem-datafast/client";

const link = attributeCreemPaymentLink("https://creem.io/payment/prod_123", {
  datafastVisitorId: visitorId,
  datafastSessionId: sessionId,
});
```

## Common Pitfalls

- Do not parse the webhook JSON before signature verification.
- In Express/Fastify/NestJS, keep the raw body intact.
- In subdomain deployments, configure DataFast against the root domain so visitors persist across subdomains.
- If browser analytics are blocked, use a same-origin DataFast proxy as shown in the demo app.

## Ops Helpers

Useful during deploys and local verification:

```ts
const health = await client.healthCheck();
const replayed = await client.replayWebhook({ rawBody, headers });
```

Signed local replay:

```bash
pnpm smoke:webhook --url http://localhost:3000/webhooks/creem --secret whsec_xxx
```

For deeper debugging, see [../troubleshooting.md](../troubleshooting.md).
