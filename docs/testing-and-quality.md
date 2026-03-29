# Testing And Quality

## Current Snapshot

- `92` passing tests
- `100%` statements
- `100%` branches
- `100%` functions
- `100%` lines

## Test Categories

| Area | What is covered |
| --- | --- |
| Checkout tracking | cookie/query/explicit tracking resolution, metadata merge behavior, collision handling |
| Client helpers | cookie parsing, checkout URL propagation, direct hosted CREEM payment-link attribution |
| Webhook verification | signature validation, missing signatures, constant-time compare, Node and Web Crypto branches |
| Webhook mapping | `checkout.completed`, `subscription.paid`, `refund.created`, ignored events |
| Production behavior | retry logic, idempotency, Upstash adapter, duplicate-event handling |
| Currency conversion | 0-decimal, 2-decimal, and 3-decimal currencies |
| Framework adapter | Next.js and Express webhook helper behavior |
| Facade API | package-level client orchestration, health checks, replay, and error release paths |
| React layer | provider init, root-domain resolution, attributed hooks, buttons, styles, and client-safe fallbacks |

## CI Workflow

GitHub Actions runs on:

- `push`
- `pull_request`
- `workflow_dispatch`

Jobs:

- `Validate (Node 20)`: install, typecheck, coverage gate, build, upload coverage summary
- `Test Matrix`: Node `18`, `20`, `22`
- `Bun Smoke`: Bun install plus package test run

Workflow file:

- `.github/workflows/ci.yml`

## Why The Node 18 Matrix Matters

Webhook signing is covered under both:

- Web Crypto path
- Node `createHmac()` fallback path

That keeps older Node runners from drifting away from the primary verification code path.

## Local Commands

Run everything:

```bash
pnpm install
pnpm typecheck
pnpm coverage
pnpm build
```

Run only package tests:

```bash
pnpm --filter @itzsudhan/creem-datafast test
```

Run coverage:

```bash
pnpm --filter @itzsudhan/creem-datafast test -- --coverage
```

## Quality Guardrails

- coverage thresholds are enforced in Vitest
- package type definitions are verified in CI
- example apps are typechecked as part of the monorepo
- builds run from a clean workspace package state
