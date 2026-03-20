"use client";

import { startTransition, useEffect, useMemo, useState } from "react";

import type { DataFastTracking } from "@itzsudhan/creem-datafast";
import {
  attributeCreemPaymentLink,
  getDataFastTracking,
} from "@itzsudhan/creem-datafast/client";

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
  const [tracking, setTracking] = useState<DataFastTracking>({});
  const [events, setEvents] = useState<DebugEvent[]>([]);

  useEffect(() => {
    setTracking(getDataFastTracking());

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

  const attributedPaymentLink = useMemo(
    () => (directPaymentLink ? attributeCreemPaymentLink(directPaymentLink, tracking) : ""),
    [directPaymentLink, tracking],
  );

  return (
    <div className="dashboard">
      <section className="panel hero-panel">
        <div className="eyebrow">Zero-glue attribution</div>
        <h1>CREEM revenue attribution that visibly works end to end.</h1>
        <p className="lede">
          This demo reads the live DataFast browser cookies, injects them into Creem checkout
          metadata, and shows the exact payload forwarded back to DataFast after the webhook lands.
        </p>
        <div className="actions">
          <form action="/api/checkout" method="POST">
            <button className="primary-button" type="submit">
              Launch Server Checkout
            </button>
          </form>
          <a
            className="secondary-button"
            href={attributedPaymentLink || "#"}
            aria-disabled={!attributedPaymentLink}
          >
            Open Direct Creem Link
          </a>
        </div>
      </section>

      <section className="panel">
        <div className="section-header">
          <h2>Tracking Inspector</h2>
          <span>Browser cookies detected in real time</span>
        </div>
        <div className="metric-grid">
          <MetricCard
            label="Visitor ID"
            value={tracking.datafastVisitorId ?? "Missing"}
            tone={tracking.datafastVisitorId ? "good" : "warn"}
          />
          <MetricCard
            label="Session ID"
            value={tracking.datafastSessionId ?? "Missing"}
            tone={tracking.datafastSessionId ? "good" : "warn"}
          />
          <MetricCard
            label="Direct Link"
            value={attributedPaymentLink ? "Ready" : "Missing payment link env"}
            tone={attributedPaymentLink ? "good" : "warn"}
          />
        </div>
      </section>

      <section className="panel">
        <div className="section-header">
          <h2>Forwarded Payload Feed</h2>
          <span>Recent checkout and webhook activity from this demo instance</span>
        </div>
        <div className="feed">
          {events.length === 0 ? (
            <div className="empty-state">
              No events yet. Start a checkout and then trigger the Creem webhook to see the DataFast
              payload appear here.
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

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "good" | "warn";
}) {
  return (
    <div className={`metric-card metric-card-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
