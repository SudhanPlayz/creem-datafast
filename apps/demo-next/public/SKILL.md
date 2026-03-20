# `@itzsudhan/creem-datafast` Agent Skill

Use this when a codebase needs CREEM payment attribution wired into DataFast without writing custom glue code.

## Quick Prompt

```text
Read https://creem-datafast.itzsudhan.com/SKILL.md and integrate @itzsudhan/creem-datafast into this app.
```

## Local Install

```bash
npx @itzsudhan/creem-datafast skill --write ./SKILL.md
```

## Package Surface

- Root: `createCreemDataFast`, typed errors, `MemoryIdempotencyStore`
- Next helper: `@itzsudhan/creem-datafast/next`
- Browser helpers: `@itzsudhan/creem-datafast/client`
- Production idempotency adapter: `@itzsudhan/creem-datafast/idempotency/upstash`

## Required Rules

1. Use the official `creem` core SDK only.
2. Create server-side checkouts through `createCheckout(input, context?)`.
3. Pass the incoming request context when creating checkouts so query params and cookie fallbacks can be resolved.
4. Verify Creem webhooks against the untouched raw body:
   - Fetch-style runtimes: `handleWebhookRequest(request)`
   - Node/raw-body runtimes: `handleWebhook({ rawBody, headers })`
5. Never parse the webhook JSON before signature verification.
6. Use `attributeCreemPaymentLink()` for direct hosted Creem payment links.
7. Prefer the official DataFast browser SDK for visitor/session capture and pass the resolved IDs into checkout creation.

## Integration Checklist

1. Install `@itzsudhan/creem-datafast`.
2. Configure `CREEM_API_KEY`, `CREEM_WEBHOOK_SECRET`, and `DATAFAST_API_KEY`.
3. Create one shared `createCreemDataFast(...)` instance.
4. Update checkout creation to go through the wrapper.
5. Add a raw-body webhook handler.
6. Confirm the forwarded DataFast payload includes `amount`, `currency`, `transaction_id`, and `datafast_visitor_id`.

## References

- Demo: https://creem-datafast.itzsudhan.com
- GitHub: https://github.com/SudhanPlayz/creem-datafast
