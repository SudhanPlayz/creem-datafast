# Framework Cookbook

All of these examples use the same generic package API. Only Next.js has a dedicated helper export.

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

## Notes

- `createCheckout(input, { request })` works in any framework that can provide either a real `Request` or `{ headers, url }`.
- `handleWebhookRequest(request)` is the best fit for Fetch-style runtimes.
- `handleWebhook({ rawBody, headers })` is the best fit for raw-body Node frameworks.
