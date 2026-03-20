# Troubleshooting

## `First event not found for visitor ...`

This usually means the payment reached DataFast, but the browser-side visitor event did not.

Check:

1. The site initializes the official DataFast SDK before checkout.
2. The first pageview is flushed before the checkout button is enabled.
3. DataFast is configured against the root domain, not only the subdomain.
4. Browser analytics requests are not blocked by an ad blocker or strict network filter.

The Next.js demo solves this by:

- using root-domain DataFast cookies
- flushing the initial pageview
- proxying browser analytics through same-origin `/api/events`

## Visitor ID is missing in checkout metadata

Check:

1. `createCheckout()` is called through the package wrapper, not directly through raw `creem.checkouts.create()`.
2. You pass request context into `createCheckout(..., { request })` when possible.
3. The browser sends `_df_vid`, `_df_sid`, or cookies to your checkout route.
4. For direct hosted links, use `attributeCreemPaymentLink()`.

## `Invalid creem-signature header`

Most common cause: the webhook body was parsed before signature verification.

Rules:

- preserve the raw JSON body
- do not call `JSON.parse()` before `handleWebhook()` verifies the signature
- in Express, use `express.raw({ type: "application/json" })`
- in Fastify or NestJS, make sure your raw-body plugin/configuration is enabled

## Duplicate events

The package already deduplicates webhook events by event ID. If you still see unexpected duplicates:

1. confirm you are not forwarding the same CREEM endpoint to multiple webhook URLs
2. use the Upstash adapter for shared production idempotency across instances
3. allow `subscription.paid` to own recurring attribution instead of attributing both the initial subscription checkout and renewal webhook

## Amount looks wrong

Check:

1. the currency exponent for the transaction
2. whether the event is a refund
3. whether transaction hydration is enabled for recurring subscription events

The mapper handles:

- standard two-decimal currencies like `USD`
- zero-decimal currencies like `JPY`
- three-decimal currencies like `KWD`

## Direct hosted CREEM link is not carrying attribution

Use the browser helper:

```ts
import { attributeCreemPaymentLink } from "@itzsudhan/creem-datafast/client";

const link = attributeCreemPaymentLink("https://creem.io/payment/prod_123", tracking);
```

The helper appends:

- `metadata[datafast_visitor_id]`
- `metadata[datafast_session_id]`

## Demo deployment notes

For the Next.js demo:

- set `APP_BASE_URL`
- set `CREEM_API_KEY`
- set `CREEM_PRODUCT_ID`
- set `CREEM_WEBHOOK_SECRET`
- set `DATAFAST_API_KEY`
- set `NEXT_PUBLIC_DATAFAST_WEBSITE_ID`
- optionally set `NEXT_PUBLIC_DATAFAST_DOMAIN` if apex-domain detection needs an override

CREEM webhook target:

```text
https://your-domain.com/api/webhooks/creem
```

## Still Stuck

- inspect the public payload feed in the demo app
- compare your setup against `apps/demo-next`
- compare server-side raw-body handling against `apps/example-express`
- review the framework cookbook in `docs/frameworks/README.md`
