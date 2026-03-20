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

import { demoConfig } from "@/lib/config";

type DebugEvent = {
  id: string;
  kind: "checkout" | "forward" | "log";
  timestamp: string;
  title: string;
  payload?: unknown;
};

type DemoDashboardProps = {
  directPaymentLink: string;
};

export function DemoDashboard({ directPaymentLink }: DemoDashboardProps) {
  return (
    <CreemDataFastProvider apiUrl="/api/events" websiteId={demoConfig.datafastWebsiteId}>
      <DemoDashboardSurface directPaymentLink={directPaymentLink} />
    </CreemDataFastProvider>
  );
}

function DemoDashboardSurface({ directPaymentLink }: DemoDashboardProps) {
  const { error, eventApiUrl, resolvedDomain, status } = useDataFastTracking();
  const [events, setEvents] = useState<DebugEvent[]>([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const response = await fetch("/api/debug/events", { cache: "no-store" });
      const nextEvents = (await response.json()) as DebugEvent[];

      if (!cancelled) {
        startTransition(() => {
          setEvents(nextEvents);
        });
      }
    };

    void load();
    const interval = window.setInterval(() => void load(), 4_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  return (
    <div className="dashboard">
      <section className="panel hero-panel">
        <div className="eyebrow">Launch The Flow</div>
        <div className="surface-head">
          <h1>Run the packaged React layer against a live checkout.</h1>
          <TrackingStatusBadge />
        </div>
        <p className="lede">
          This section now dogfoods <code>@itzsudhan/creem-datafast/react</code>. The provider
          initializes the official DataFast SDK, flushes the first pageview through the same-origin
          proxy, resolves live tracking IDs, and keeps the buttons locked until attribution is ready.
        </p>
        <div className="actions">
          <CreemCheckoutButton action="/api/checkout" className="primary-button">
            Launch Server Checkout
          </CreemCheckoutButton>
          <CreemPaymentLinkButton
            className="secondary-button"
            href={directPaymentLink || "https://creem.io"}
          >
            Open Direct Creem Link
          </CreemPaymentLinkButton>
        </div>
        <div className="surface-meta-grid">
          <article className="surface-note">
            <span>Resolved Domain</span>
            <strong>{resolvedDomain || "Unknown"}</strong>
          </article>
          <article className="surface-note">
            <span>Event Proxy</span>
            <strong>{eventApiUrl}</strong>
          </article>
          <article className="surface-note">
            <span>Direct Link</span>
            <strong>{directPaymentLink ? "Ready" : "Unavailable"}</strong>
          </article>
        </div>
        {error ? (
          <p className="lede">
            Tracking sync failed: {error.message}. The React layer keeps checkout launches disabled
            until a visitor can be attributed safely.
          </p>
        ) : null}
      </section>

      <section className="panel">
        <TrackingInspector subtitle="Official /react widgets reflecting live DataFast state from this demo instance" />
      </section>

      <section className="panel">
        <div className="section-header">
          <h2>Forwarded Payload Feed</h2>
          <span>
            Package widgets above, demo-only payload feed below. Status: {status === "ready" ? "live" : "syncing"}
          </span>
        </div>
        <div className="feed">
          {events.length === 0 ? (
            <div className="empty-state">
              No events yet. Start a checkout and then trigger the CREEM webhook to see the
              DataFast payment payload appear here.
            </div>
          ) : (
            events.map((event) => (
              <article className="feed-item" key={event.id}>
                <div className="feed-meta">
                  <span className={`pill pill-${event.kind}`}>{event.kind}</span>
                  <time>{new Date(event.timestamp).toLocaleString()}</time>
                </div>
                <h3>{event.title}</h3>
                {event.payload ? (
                  <pre>{JSON.stringify(event.payload, null, 2)}</pre>
                ) : (
                  <p>No payload recorded.</p>
                )}
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
