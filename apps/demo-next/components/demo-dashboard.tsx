"use client";

import { startTransition, useEffect, useState } from "react";

import {
  CreemCheckoutButton,
  CreemDataFastProvider,
  CreemPaymentLinkButton,
  TrackingInspector,
  TrackingStatusBadge,
  useDataFastTracking,
} from "@itzsudhan/creem-datafast/react";

import type { DemoOffer } from "@/lib/demo-offer";
import { demoConfig } from "@/lib/config";

type DebugEvent = {
  id: string;
  kind: "checkout" | "forward" | "log";
  timestamp: string;
  title: string;
  payload?: unknown;
};

type DemoDashboardProps = {
  offer: DemoOffer;
};

const githubUrl = "https://github.com/SudhanPlayz/creem-datafast";

const howItWorksSteps = [
  {
    title: "Visitor tracked",
    body: "Reads `datafast_visitor_id` from the cookie.",
  },
  {
    title: "Checkout",
    body: "Injects it into CREEM metadata automatically.",
  },
  {
    title: "Attribution",
    body: "Webhook sends the payment event to the DataFast API.",
  },
];

export function DemoDashboard({ offer }: DemoDashboardProps) {
  return (
    <CreemDataFastProvider apiUrl="/api/events" websiteId={demoConfig.datafastWebsiteId}>
      <DemoDashboardSurface offer={offer} />
    </CreemDataFastProvider>
  );
}

function DemoDashboardSurface({ offer }: DemoDashboardProps) {
  const { error, eventApiUrl, resolvedDomain, status, tracking } = useDataFastTracking();
  const [events, setEvents] = useState<DebugEvent[]>([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch("/api/debug/events", { cache: "no-store" });
        const nextEvents = (await response.json()) as DebugEvent[];

        if (!cancelled) {
          startTransition(() => {
            setEvents(nextEvents);
          });
        }
      } catch {
        if (!cancelled) {
          startTransition(() => {
            setEvents([]);
          });
        }
      }
    };

    void load();
    const interval = window.setInterval(() => void load(), 4_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const planName = offer.source === "creem" ? offer.name : "Pro Plan";
  const planPrice = offer.price != null ? offer.priceLabel : "$10";
  const purchaseState = getPurchaseState({ offer, status, error });
  const directLinkReady = offer.availability.directPaymentLinkReady && Boolean(offer.productUrl);
  const forwardedCount = events.filter((event) => event.kind === "forward").length;
  const visitorId = tracking.datafastVisitorId ?? "pending";
  const sessionId = tracking.datafastSessionId ?? "pending";

  return (
    <div className="storefront-shell">
      <header className="site-header page-section">
        <a className="site-brand" href="/">
          <span>CREEM × DataFast</span>
          <strong>Live checkout demo</strong>
        </a>

        <nav className="site-nav" aria-label="Section navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#demo">Demo</a>
          <a href="#install">Install</a>
          <a href="#frameworks">Examples</a>
        </nav>
      </header>

      <section className="hero-section" id="hero">
        <div className="hero-inner hero-inner-simple">
          <div className="hero-copy">
            <span className="section-kicker">CREEM × DataFast</span>
            <h1>Track revenue attribution automatically with CREEM × DataFast</h1>
            <p className="hero-lede">No glue code. No manual tracking. Just install and go.</p>

            <div className="hero-action-row">
              <CreemCheckoutButton
                action="/api/checkout"
                className="storefront-primary"
                disabled={!offer.availability.checkoutConfigured}
              >
                Start Demo Checkout
              </CreemCheckoutButton>
              <a className="page-button page-button-secondary" href={githubUrl}>
                View GitHub
              </a>
            </div>

            <p className="hero-proof-line">
              Auto-captures <code>datafast_visitor_id</code> -&gt; sends revenue events -&gt; done.
            </p>
          </div>

          <article className="hero-side-panel">
            <span className="panel-kicker">Quick trace</span>
            <h3>One click. Full revenue attribution.</h3>

            <div className="trace-mini-grid">
              <article className="trace-mini-item">
                <span>Visitor ID</span>
                <strong>{visitorId}</strong>
              </article>
              <article className="trace-mini-item">
                <span>Checkout</span>
                <strong>{status === "ready" ? "Ready" : "Waiting"}</strong>
              </article>
              <article className="trace-mini-item">
                <span>Revenue</span>
                <strong>{forwardedCount > 0 ? "Sent" : "Waiting"}</strong>
              </article>
            </div>

            <TrackingStatusBadge className="storefront-status light-status" />
          </article>
        </div>
      </section>

      <section className="page-section simple-section" id="how-it-works">
        <div className="section-heading-block">
          <span className="section-kicker">How it works</span>
          <h2>From first visit to attributed revenue.</h2>
          <p>Visitor lands -&gt; cookie captured -&gt; checkout -&gt; webhook -&gt; DataFast gets revenue</p>
        </div>

        <div className="simple-steps">
          {howItWorksSteps.map((step, index) => (
            <article className="simple-step-card" key={step.title}>
              <span>0{index + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </article>
          ))}
        </div>

        <div className="simple-code-block">
          <pre>{`const checkout = await creemDataFast.createCheckout(
  { productId: "pro_plan" },
  { request },
)`}</pre>
        </div>
      </section>

      <section className="page-section simple-section" id="demo">
        <div className="section-heading-block">
          <span className="section-kicker">Live demo</span>
          <h2>Run the checkout and watch the proof update.</h2>
        </div>

        <div className="demo-grid">
          <article className="pricing-card">
            <span className="panel-kicker">Pricing card</span>
            <h3>{planName}</h3>
            <div className="pricing-value">{planPrice}</div>
            <p>{purchaseState.copy}</p>

            <div className="hero-action-row demo-card-actions">
              <CreemCheckoutButton
                action="/api/checkout"
                className="storefront-primary"
                disabled={!offer.availability.checkoutConfigured}
              >
                Buy Now
              </CreemCheckoutButton>

              {directLinkReady ? (
                <CreemPaymentLinkButton className="storefront-secondary" href={offer.productUrl}>
                  Open Hosted Checkout
                </CreemPaymentLinkButton>
              ) : null}
            </div>
          </article>

          <article className="trace-card">
            <span className="panel-kicker">Trace view</span>
            <h3>What updates after the purchase</h3>

            <div className="trace-list">
              <article className="trace-row">
                <span>Visitor ID</span>
                <strong>{visitorId}</strong>
              </article>
              <article className="trace-row">
                <span>Checkout</span>
                <strong>{status === "ready" ? "Attributed automatically" : "Waiting for tracking"}</strong>
              </article>
              <article className="trace-row">
                <span>Webhook</span>
                <strong>{events.some((event) => event.kind === "checkout") ? "Seen" : "Waiting"}</strong>
              </article>
              <article className="trace-row">
                <span>DataFast</span>
                <strong>{forwardedCount > 0 ? "Revenue sent" : "Waiting for purchase"}</strong>
              </article>
            </div>
          </article>
        </div>

        <div className="proof-grid-simple">
          <article className="proof-surface">
            <TrackingInspector
              className="storefront-inspector"
              subtitle="The React layer reads the visitor cookie and keeps checkout attribution ready."
              title="Tracking status"
            />
          </article>

          <article className="proof-surface">
            <div className="proof-surface-head">
              <div>
                <span className="panel-kicker">Revenue feed</span>
                <h3>Recent payment events</h3>
              </div>
              <span className={`surface-status surface-status-${status}`}>
                {forwardedCount > 0 ? "Revenue sent" : "Waiting for purchase"}
              </span>
            </div>

            <div className="trace-meta">
              <article className="trace-meta-item">
                <span>Visitor ID</span>
                <strong>{visitorId}</strong>
              </article>
              <article className="trace-meta-item">
                <span>Session ID</span>
                <strong>{sessionId}</strong>
              </article>
              <article className="trace-meta-item">
                <span>Domain</span>
                <strong>{resolvedDomain || "pending"}</strong>
              </article>
              <article className="trace-meta-item">
                <span>Event proxy</span>
                <strong>{eventApiUrl}</strong>
              </article>
            </div>

            <div className="event-list">
              {events.length === 0 ? (
                <div className="event-empty">
                  No payment events yet. Complete a checkout to populate this feed.
                </div>
              ) : (
                events.map((event) => (
                  <article className="event-item" key={event.id}>
                    <div className="event-head">
                      <span className={`event-kind event-kind-${event.kind}`}>{event.kind}</span>
                      <time>{new Date(event.timestamp).toLocaleString()}</time>
                    </div>
                    <h4>{event.title}</h4>
                    {event.payload ? (
                      <pre>{JSON.stringify(event.payload, null, 2)}</pre>
                    ) : (
                      <p>No payload recorded.</p>
                    )}
                  </article>
                ))
              )}
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}

function getPurchaseState({
  offer,
  status,
  error,
}: {
  offer: DemoOffer;
  status: "initializing" | "ready" | "error";
  error: Error | null;
}): {
  copy: string;
} {
  if (!offer.availability.checkoutConfigured) {
    return {
      copy: "Connect a CREEM product to turn this checkout live.",
    };
  }

  if (status === "ready") {
    return {
      copy: "Ready to open a real checkout with attribution already attached.",
    };
  }

  if (status === "error") {
    return {
      copy: error?.message ?? "Tracking is still starting up.",
    };
  }

  return {
    copy: "Preparing attribution before checkout opens.",
  };
}
