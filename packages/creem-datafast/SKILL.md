# `@itzsudhan/creem-datafast` Agent Skill

Use this package when a codebase needs CREEM checkout attribution wired to DataFast without merchant-specific glue code.

## Agent Shortcut

If you can browse the web, start with:

```text
Read https://creem-datafast.itzsudhan.com/SKILL.md and integrate @itzsudhan/creem-datafast into this app.
```

If you need a local copy of this skill file:

```bash
npx @itzsudhan/creem-datafast skill --write ./SKILL.md
```

## Package Surface

- Root: `createCreemDataFast`, typed errors, `MemoryIdempotencyStore`
- Next helper: `@itzsudhan/creem-datafast/next`
- Browser helpers: `@itzsudhan/creem-datafast/client`
- Production idempotency adapter: `@itzsudhan/creem-datafast/idempotency/upstash`

## Required Integration Rules

1. Use the official `creem` core SDK path only. Do not swap in `creem_io`.
2. Create server-side checkouts through `createCheckout(input, context?)` so `datafast_visitor_id` and `datafast_session_id` are injected correctly.
3. Pass the incoming request context on checkout creation whenever possible so query params and cookie fallbacks can be resolved.
4. For webhooks, verify raw bodies only:
   - Fetch-style runtimes: `handleWebhookRequest(request)`
   - Node/raw-body runtimes: `handleWebhook({ rawBody, headers })`
5. Never JSON-parse a Creem webhook body before signature verification.
6. If the app uses direct hosted Creem payment links, use `attributeCreemPaymentLink()` from the client bundle.
7. If the app needs browser-side tracking capture, prefer the official DataFast SDK and pass the resolved IDs into server checkout creation.

## Implementation Checklist

1. Install the package and configure `CREEM_API_KEY`, `CREEM_WEBHOOK_SECRET`, and `DATAFAST_API_KEY`.
2. Create one shared `createCreemDataFast(...)` server instance.
3. Update the checkout creation path to call `createCheckout(...)` instead of raw `creem.checkouts.create(...)`.
4. Add a webhook route that preserves the raw request body and forwards supported Creem payment events to DataFast.
5. If the site offers direct hosted Creem links, append `metadata[datafast_visitor_id]` and `metadata[datafast_session_id]` through the browser helper.
6. Verify the forwarded DataFast payment payload includes `amount`, `currency`, `transaction_id`, and `datafast_visitor_id`.

## Demo References

- Next.js demo: `apps/demo-next`
- Express example: `apps/example-express`
- Framework cookbook: `docs/frameworks/README.md`
