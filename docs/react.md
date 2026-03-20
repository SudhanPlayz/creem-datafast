# React Guide

`@itzsudhan/creem-datafast/react` is the optional UI layer on top of the headless package.

Use it when you want the package to own:

- DataFast SDK initialization
- root-domain visitor/session resolution
- initial pageview flush before checkout launch
- attributed checkout action URLs
- attributed hosted CREEM payment links
- neobrutalist tracking widgets for React and Next.js

## Install

```bash
pnpm add @itzsudhan/creem-datafast
```

The React layer lives in the main package and is exported as a subpath.

## Provider Setup

```tsx
"use client";

import { CreemDataFastProvider } from "@itzsudhan/creem-datafast/react";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CreemDataFastProvider apiUrl="/api/events" websiteId={process.env.NEXT_PUBLIC_DATAFAST_WEBSITE_ID!}>
      {children}
    </CreemDataFastProvider>
  );
}
```

Default provider behavior:

- resolves the root domain automatically
- allows localhost during local development
- disables the DataFast SDK's automatic initial pageview
- manually sends and flushes the first pageview before marking tracking as ready
- injects package-owned styles once

## Hooks

### `useDataFastTracking()`

Returns:

- `status`
- `tracking`
- `error`
- `client`
- `resolvedDomain`
- `eventApiUrl`

### `useAttributedCheckoutAction()`

```tsx
const action = useAttributedCheckoutAction("/api/checkout");
```

This appends `datafast_visitor_id` and `datafast_session_id` to the checkout action URL.

### `useAttributedPaymentLink()`

```tsx
const href = useAttributedPaymentLink("https://creem.io/payment/prod_123");
```

This appends `metadata[datafast_visitor_id]` and `metadata[datafast_session_id]` to a hosted CREEM payment link.

## Components

### `CreemCheckoutButton`

```tsx
<CreemCheckoutButton action="/api/checkout">Launch Server Checkout</CreemCheckoutButton>
```

Behavior:

- renders a real `<form method="POST">`
- disables itself until tracking is ready by default
- accepts `formClassName`, `buttonClassName`, and `className`

### `CreemPaymentLinkButton`

```tsx
<CreemPaymentLinkButton href="https://creem.io/payment/prod_123">
  Open Direct Creem Link
</CreemPaymentLinkButton>
```

Behavior:

- renders an attributed `<a>`
- disables itself until tracking is ready by default
- preserves the package-owned styles while allowing class overrides

### `TrackingStatusBadge`

Small status badge for `initializing`, `ready`, and `error`.

### `TrackingInspector`

Shows:

- visitor ID
- session ID
- resolved domain
- event proxy URL
- current sync status

## Next.js Example

```tsx
"use client";

import {
  CreemCheckoutButton,
  CreemPaymentLinkButton,
  TrackingInspector,
} from "@itzsudhan/creem-datafast/react";

export function AttributionDemo({ directPaymentLink }: { directPaymentLink: string }) {
  return (
    <>
      <TrackingInspector />
      <CreemCheckoutButton action="/api/checkout">Launch Server Checkout</CreemCheckoutButton>
      <CreemPaymentLinkButton href={directPaymentLink}>
        Open Direct Creem Link
      </CreemPaymentLinkButton>
    </>
  );
}
```

The public demo in `apps/demo-next` uses this exact surface.
