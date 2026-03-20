# `@itzsudhan/creem-datafast` Integration Skill

Use this package when a codebase needs CREEM checkout attribution wired to DataFast without custom glue code.

## Package Surface

- Root: `createCreemDataFast`, typed errors, `MemoryIdempotencyStore`
- Next helper: `@itzsudhan/creem-datafast/next`
- Browser helpers: `@itzsudhan/creem-datafast/client`
- Production idempotency adapter: `@itzsudhan/creem-datafast/idempotency/upstash`

## Integration Rules

1. Use the official `creem` core SDK path only. Do not swap in `creem_io`.
2. Create checkouts through `createCheckout(input, context?)` so `datafast_visitor_id` and `datafast_session_id` are injected correctly.
3. For Node servers, pass the incoming request context so query params and cookies can be resolved.
4. For webhooks, verify raw bodies only:
   - Fetch-style runtimes: use `handleWebhookRequest(request)`
   - Node/raw-body runtimes: use `handleWebhook({ rawBody, headers })`
5. Always keep webhook routes on raw request bodies. Do not JSON-parse the body before signature verification.
6. If the app needs direct hosted Creem payment links, use `attributeCreemPaymentLink()` from the client bundle.

## Demo References

- Next.js demo: `apps/demo-next`
- Express example: `apps/example-express`
- Framework cookbook: `docs/frameworks/README.md`
