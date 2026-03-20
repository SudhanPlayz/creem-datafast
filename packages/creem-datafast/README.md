# `@itzsudhan/creem-datafast`

Generic-first revenue attribution for CREEM + DataFast.

## Install

```bash
pnpm add @itzsudhan/creem-datafast
```

## Core API

```ts
import { createCreemDataFast } from "@itzsudhan/creem-datafast";

const creemDataFast = createCreemDataFast({
  creemApiKey: process.env.CREEM_API_KEY!,
  creemWebhookSecret: process.env.CREEM_WEBHOOK_SECRET!,
  datafastApiKey: process.env.DATAFAST_API_KEY!,
  testMode: true,
});
```

```ts
const checkout = await creemDataFast.createCheckout(
  {
    productId: process.env.CREEM_PRODUCT_ID!,
    successUrl: "https://example.com/success",
  },
  { request },
);
```

```ts
const result = await creemDataFast.handleWebhook({
  rawBody,
  headers,
});
```

## Exports

- `@itzsudhan/creem-datafast`
- `@itzsudhan/creem-datafast/next`
- `@itzsudhan/creem-datafast/client`
- `@itzsudhan/creem-datafast/idempotency/upstash`

See the repository README for the full Next.js demo, Express example, and framework cookbook.
