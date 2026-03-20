"use client";

import { startTransition, useEffect, useMemo, useState } from "react";

import type { DataFastTracking } from "@itzsudhan/creem-datafast";
import {
  appendDataFastTracking,
  attributeCreemPaymentLink,
} from "@itzsudhan/creem-datafast/client";

import { DATAFAST_PROXY_PATH, getDataFastClient, resolveDataFastDomain } from "@/lib/datafast";

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
  const [trackingStatus, setTrackingStatus] = useState<"initializing" | "ready" | "error">(
    "initializing",
  );
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [datafastDomain, setDatafastDomain] = useState<string>("Detecting");
  const [eventProxyUrl, setEventProxyUrl] = useState<string>(DATAFAST_PROXY_PATH);

  useEffect(() => {
    let cancelled = false;

    const initTracking = async () => {
      try {
        const client = await getDataFastClient();
        const params = client?.getTrackingParams();
        const resolvedDomain = resolveDataFastDomain(window.location.hostname);

        if (!cancelled) {
          setTracking({
            datafastVisitorId: params?._df_vid,
            datafastSessionId: params?._df_sid,
          });
          setDatafastDomain(resolvedDomain || "Unknown");
          setEventProxyUrl(`${window.location.origin}${DATAFAST_PROXY_PATH}`);
          setTrackingStatus("ready");
        }
      } catch (error) {
        if (!cancelled) {
          setTrackingStatus("error");
          setDatafastDomain(resolveDataFastDomain(window.location.hostname) || "Unknown");
          setEventProxyUrl(`${window.location.origin}${DATAFAST_PROXY_PATH}`);
          setTrackingError(
            error instanceof Error
              ? error.message
              : "The initial DataFast pageview could not be synchronized.",
          );
        }
      }
    };

    const load = async () => {
      const response = await fetch("/api/debug/events", { cache: "no-store" });
      const nextEvents = (await response.json()) as DebugEvent[];

      if (!cancelled) {
        startTransition(() => {
          setEvents(nextEvents);
        });
      }
    };

    void initTracking();
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
  const checkoutAction = useMemo(
    () => appendDataFastTracking("/api/checkout", tracking),
    [tracking],
  );
  const canLaunchCheckout = trackingStatus === "ready";
  const directLinkStatus =
    trackingStatus === "error"
      ? "Sync failed"
      : trackingStatus === "ready" && attributedPaymentLink
        ? "Ready"
        : "Syncing";

  return (
    <div className="dashboard">
      <section className="panel hero-panel">
        <div className="eyebrow">Launch The Flow</div>
        <h1>Run a real checkout and watch the attribution payload appear.</h1>
        <p className="lede">
          This demo initializes the official DataFast SDK in the browser, stores visitor cookies on
          the root domain, proxies analytics events through the same Next.js origin, injects the
          live tracking IDs into Creem checkout metadata, and shows the exact payload forwarded back
          to DataFast after the webhook lands.
        </p>
        <div className="actions">
          <form action={checkoutAction} method="POST">
            <button className="primary-button" disabled={!canLaunchCheckout} type="submit">
              Launch Server Checkout
            </button>
          </form>
          <a
            className="secondary-button"
            href={attributedPaymentLink || "#"}
            aria-disabled={!canLaunchCheckout || !attributedPaymentLink}
          >
            Open Direct Creem Link
          </a>
        </div>
        {trackingError ? (
          <p className="lede">
            Tracking sync failed: {trackingError}. DataFast attribution will not be reliable until
            the initial pageview can be sent.
          </p>
        ) : null}
      </section>

      <section className="panel">
        <div className="section-header">
          <h2>Tracking Inspector</h2>
          <span>Root-domain visitor cookies plus same-origin DataFast event proxy</span>
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
            label="DataFast Domain"
            value={datafastDomain}
            tone={datafastDomain === "Detecting" ? "warn" : "good"}
          />
          <MetricCard
            label="Event Proxy"
            value={eventProxyUrl}
            tone="good"
          />
          <MetricCard
            label="Direct Link"
            value={directLinkStatus}
            tone={trackingStatus === "ready" && attributedPaymentLink ? "good" : "warn"}
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
