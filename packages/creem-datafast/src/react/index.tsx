import { initDataFast, type DataFastWeb, type DataFastWebConfig } from "datafast";
import {
  createContext,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type FormHTMLAttributes,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { appendDataFastTracking, attributeCreemPaymentLink } from "../client/index";
import type { DataFastTracking } from "../types";

const DEFAULT_DATAFAST_API_URL = "https://datafa.st/api/events";
const STYLE_TAG_ID = "creem-datafast-react-styles";
const MULTI_SEGMENT_SUFFIXES = new Set([
  "co.uk",
  "org.uk",
  "gov.uk",
  "ac.uk",
  "co.in",
  "com.au",
  "co.jp",
  "com.br",
  "co.nz",
]);

type TrackingStatus = "initializing" | "ready" | "error";

export type CreemDataFastContextValue = {
  status: TrackingStatus;
  tracking: DataFastTracking;
  error: Error | null;
  client: DataFastWeb | null;
  resolvedDomain: string;
  eventApiUrl: string;
};

export type CreemDataFastProviderProps = {
  websiteId: string;
  domain?: string;
  apiUrl?: string;
  debug?: boolean;
  flushInterval?: number;
  maxQueueSize?: number;
  autoCapturePageviews?: DataFastWebConfig["autoCapturePageviews"];
  allowLocalhost?: boolean;
  allowedHostnames?: string[];
  flushInitialPageview?: boolean;
  injectStyles?: boolean;
  children: ReactNode;
};

export type TrackingAwareOptions = {
  tracking?: DataFastTracking;
};

export type CreemCheckoutButtonProps = TrackingAwareOptions &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
    action: string | URL;
    children?: ReactNode;
    formClassName?: string;
    buttonClassName?: string;
    requireReady?: boolean;
    method?: FormHTMLAttributes<HTMLFormElement>["method"];
  };

export type CreemPaymentLinkButtonProps = TrackingAwareOptions &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "children" | "href"> & {
    href: string | URL;
    children?: ReactNode;
    requireReady?: boolean;
  };

export type TrackingStatusBadgeProps = {
  className?: string;
};

export type TrackingInspectorProps = {
  className?: string;
  title?: ReactNode;
  subtitle?: ReactNode;
};

const defaultContext: CreemDataFastContextValue = {
  status: "initializing",
  tracking: {},
  error: null,
  client: null,
  resolvedDomain: "",
  eventApiUrl: DEFAULT_DATAFAST_API_URL,
};

const CreemDataFastContext = createContext<CreemDataFastContextValue | null>(null);

export function CreemDataFastProvider({
  websiteId,
  domain,
  apiUrl,
  debug,
  flushInterval,
  maxQueueSize,
  autoCapturePageviews,
  allowLocalhost = true,
  allowedHostnames,
  flushInitialPageview = true,
  injectStyles = true,
  children,
}: CreemDataFastProviderProps) {
  const location = getRuntimeLocation();
  const [value, setValue] = useState<CreemDataFastContextValue>(() => ({
    ...defaultContext,
    resolvedDomain: normalizeConfiguredDomain(domain) ?? resolveDataFastDomain(location.hostname),
    eventApiUrl: resolveEventApiUrl(apiUrl, location.origin),
  }));
  const allowedHostnamesKey = useMemo(
    () => (allowedHostnames ?? []).join(","),
    [allowedHostnames],
  );
  const autoCaptureKey = useMemo(
    () => JSON.stringify(autoCapturePageviews ?? null),
    [autoCapturePageviews],
  );

  useEffect(() => {
    if (injectStyles) {
      injectCreemDataFastStyles();
    }
  }, [injectStyles]);

  useEffect(() => {
    let active = true;
    const resolvedDomain = normalizeConfiguredDomain(domain) ?? resolveDataFastDomain(location.hostname);
    const eventApiUrl = resolveEventApiUrl(apiUrl, location.origin);

    if (!websiteId.trim()) {
      setValue({
        status: "error",
        tracking: {},
        error: new Error("Missing DataFast websiteId."),
        client: null,
        resolvedDomain,
        eventApiUrl,
      });
      return () => {
        active = false;
      };
    }

    const run = async () => {
      try {
        const client = await initDataFast({
          websiteId,
          domain: resolvedDomain,
          apiUrl,
          debug,
          flushInterval,
          maxQueueSize,
          allowLocalhost,
          allowedHostnames,
          autoCapturePageviews: buildAutoCapturePageviews(autoCapturePageviews, flushInitialPageview),
        });

        if (flushInitialPageview) {
          await client.trackPageview();
          await client.flush();
        }

        const params = client.getTrackingParams();
        if (!active) {
          return;
        }

        setValue({
          status: "ready",
          tracking: {
            datafastVisitorId: params._df_vid,
            datafastSessionId: params._df_sid,
          },
          error: null,
          client,
          resolvedDomain,
          eventApiUrl,
        });
      } catch (error) {
        if (!active) {
          return;
        }

        setValue({
          status: "error",
          tracking: {},
          error: asError(error),
          client: null,
          resolvedDomain,
          eventApiUrl,
        });
      }
    };

    setValue((current) => ({
      ...current,
      status: "initializing",
      error: null,
      resolvedDomain,
      eventApiUrl,
    }));
    void run();

    return () => {
      active = false;
    };
  }, [
    allowLocalhost,
    allowedHostnames,
    allowedHostnamesKey,
    apiUrl,
    autoCaptureKey,
    autoCapturePageviews,
    debug,
    domain,
    flushInitialPageview,
    flushInterval,
    location.hostname,
    location.origin,
    maxQueueSize,
    websiteId,
  ]);

  return <CreemDataFastContext.Provider value={value}>{children}</CreemDataFastContext.Provider>;
}

export function useDataFastTracking(): CreemDataFastContextValue {
  const context = useContext(CreemDataFastContext);
  if (!context) {
    throw new Error("useDataFastTracking must be used within CreemDataFastProvider.");
  }

  return context;
}

export function useAttributedCheckoutAction(
  action: string | URL,
  options?: TrackingAwareOptions,
): string {
  const { tracking } = useDataFastTracking();
  const visitorId = options?.tracking?.datafastVisitorId ?? tracking.datafastVisitorId;
  const sessionId = options?.tracking?.datafastSessionId ?? tracking.datafastSessionId;

  return useMemo(
    () =>
      appendDataFastTracking(action, {
        datafastVisitorId: visitorId,
        datafastSessionId: sessionId,
      }),
    [action, sessionId, visitorId],
  );
}

export function useAttributedPaymentLink(href: string | URL, options?: TrackingAwareOptions): string {
  const { tracking } = useDataFastTracking();
  const visitorId = options?.tracking?.datafastVisitorId ?? tracking.datafastVisitorId;
  const sessionId = options?.tracking?.datafastSessionId ?? tracking.datafastSessionId;

  return useMemo(
    () =>
      attributeCreemPaymentLink(href, {
        datafastVisitorId: visitorId,
        datafastSessionId: sessionId,
      }),
    [href, sessionId, visitorId],
  );
}

export function CreemCheckoutButton({
  action,
  children = "Launch Checkout",
  formClassName,
  buttonClassName,
  className,
  requireReady = true,
  disabled,
  method = "POST",
  ...buttonProps
}: CreemCheckoutButtonProps) {
  const { status } = useDataFastTracking();
  const attributedAction = useAttributedCheckoutAction(action, { tracking: buttonProps.tracking });
  const buttonDisabled = disabled || (requireReady && status !== "ready");

  return (
    <form
      action={attributedAction}
      className={joinClassNames("cdf-form", formClassName)}
      method={method}
    >
      <button
        {...omitTracking(buttonProps)}
        aria-busy={status === "initializing"}
        className={joinClassNames("cdf-button", "cdf-button-primary", className, buttonClassName)}
        data-status={status}
        disabled={buttonDisabled}
        type="submit"
      >
        {children}
      </button>
    </form>
  );
}

export function CreemPaymentLinkButton({
  href,
  children = "Open Direct Creem Link",
  className,
  requireReady = true,
  onClick,
  ...anchorProps
}: CreemPaymentLinkButtonProps) {
  const { status } = useDataFastTracking();
  const attributedHref = useAttributedPaymentLink(href, { tracking: anchorProps.tracking });
  const disabled = requireReady && status !== "ready";

  return (
    <a
      {...omitTracking(anchorProps)}
      aria-disabled={disabled}
      className={joinClassNames("cdf-button", "cdf-button-secondary", className)}
      data-status={status}
      href={disabled ? "#" : attributedHref}
      onClick={(event) => {
        if (disabled) {
          event.preventDefault();
          return;
        }

        onClick?.(event);
      }}
    >
      {children}
    </a>
  );
}

export function TrackingStatusBadge({ className }: TrackingStatusBadgeProps) {
  const { status, error } = useDataFastTracking();
  const label =
    status === "ready" ? "Tracking Ready" : status === "error" ? "Tracking Error" : "Syncing Tracking";

  return (
    <span className={joinClassNames("cdf-status-badge", `cdf-status-${status}`, className)}>
      <strong>{label}</strong>
      {status === "error" && error ? <span>{error.message}</span> : null}
    </span>
  );
}

export function TrackingInspector({
  className,
  title = "Tracking Inspector",
  subtitle = "DataFast tracking detected in real time",
}: TrackingInspectorProps) {
  const { status, tracking, resolvedDomain, eventApiUrl, error } = useDataFastTracking();

  return (
    <section className={joinClassNames("cdf-inspector", className)}>
      <div className="cdf-inspector-header">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        <TrackingStatusBadge />
      </div>
      <div className="cdf-metric-grid">
        <MetricTile
          label="Visitor ID"
          tone={tracking.datafastVisitorId ? "good" : "warn"}
          value={tracking.datafastVisitorId ?? "Missing"}
        />
        <MetricTile
          label="Session ID"
          tone={tracking.datafastSessionId ? "good" : "warn"}
          value={tracking.datafastSessionId ?? "Missing"}
        />
        <MetricTile label="Domain" tone="good" value={resolvedDomain} />
        <MetricTile label="Event Proxy" tone="good" value={eventApiUrl} />
        <MetricTile
          label="Status"
          tone={status === "ready" ? "good" : "warn"}
          value={status === "ready" ? "Ready" : status === "error" ? "Error" : "Syncing"}
        />
      </div>
      {error ? <p className="cdf-error-copy">{error.message}</p> : null}
    </section>
  );
}

function MetricTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "good" | "warn";
}) {
  return (
    <article className={joinClassNames("cdf-metric", `cdf-metric-${tone}`)}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function buildAutoCapturePageviews(
  input: DataFastWebConfig["autoCapturePageviews"],
  flushInitialPageview: boolean,
): DataFastWebConfig["autoCapturePageviews"] {
  if (!flushInitialPageview) {
    return input;
  }

  if (input === false) {
    return false;
  }

  if (input === true || input == null) {
    return { captureInitialPageview: false };
  }

  return {
    ...input,
    captureInitialPageview: false,
  };
}

function normalizeConfiguredDomain(input?: string): string | undefined {
  const value = input?.trim();
  if (!value) {
    return undefined;
  }

  return value.replace(/^https?:\/\//u, "").replace(/^www\./u, "");
}

function resolveDataFastDomain(hostname: string): string {
  const normalizedHostname = hostname.trim().toLowerCase();
  if (
    normalizedHostname === "" ||
    normalizedHostname === "localhost" ||
    normalizedHostname === "::1" ||
    /^\d{1,3}(\.\d{1,3}){3}$/u.test(normalizedHostname)
  ) {
    return normalizedHostname || "localhost";
  }

  const parts = normalizedHostname.split(".").filter(Boolean);
  if (parts.length <= 2) {
    return normalizedHostname;
  }

  const suffix = parts.slice(-2).join(".");
  if (MULTI_SEGMENT_SUFFIXES.has(suffix) && parts.length >= 3) {
    return parts.slice(-3).join(".");
  }

  return parts.slice(-2).join(".");
}

function resolveEventApiUrl(apiUrl: string | undefined, origin: string): string {
  if (!apiUrl) {
    return DEFAULT_DATAFAST_API_URL;
  }

  return new URL(apiUrl, origin).toString();
}

function getRuntimeLocation(): { hostname: string; origin: string } {
  const runtimeLocation = globalThis.location;
  if (runtimeLocation?.hostname && runtimeLocation.origin) {
    return {
      hostname: runtimeLocation.hostname,
      origin: runtimeLocation.origin,
    };
  }

  return {
    hostname: "localhost",
    origin: "http://localhost",
  };
}

function joinClassNames(...tokens: Array<string | undefined | false>): string {
  return tokens.filter(Boolean).join(" ");
}

function injectCreemDataFastStyles() {
  if (document.getElementById(STYLE_TAG_ID)) {
    return;
  }

  const tag = document.createElement("style");
  tag.id = STYLE_TAG_ID;
  tag.textContent = STYLESHEET;
  document.head.appendChild(tag);
}

function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error("Failed to initialize DataFast.");
}

function omitTracking<T extends TrackingAwareOptions>(input: T): Omit<T, "tracking"> {
  const { tracking: _tracking, ...rest } = input;
  return rest;
}

const STYLESHEET = `
.cdf-form {
  display: inline-flex;
}

.cdf-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 52px;
  padding: 0 18px;
  border: var(--line, 3px solid #121212);
  border-radius: 999px;
  box-shadow: var(--shadow-small, 5px 5px 0 0 #121212);
  color: var(--ink, #121212);
  font-size: 0.92rem;
  font-weight: 900;
  letter-spacing: 0.04em;
  text-decoration: none;
  text-transform: uppercase;
  transition: transform 140ms ease;
}

.cdf-button:hover {
  transform: translate(-2px, -2px);
}

.cdf-button[data-status="initializing"],
.cdf-button[aria-disabled="true"],
.cdf-button:disabled {
  opacity: 0.72;
  pointer-events: none;
}

.cdf-button-primary {
  background: var(--peach, #ffb48a);
}

.cdf-button-secondary {
  background: var(--paper, #fffdf8);
}

.cdf-status-badge {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  padding: 10px 14px;
  border: var(--line, 3px solid #121212);
  border-radius: 999px;
  box-shadow: var(--shadow-small, 5px 5px 0 0 #121212);
  background: var(--paper, #fffdf8);
  font-size: 0.82rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.cdf-status-initializing {
  background: var(--cream, #fff5ea);
}

.cdf-status-ready {
  background: var(--mint, #cbf0d7);
}

.cdf-status-error {
  background: #ffe2ce;
}

.cdf-status-badge span {
  color: var(--muted, #544a43);
  font-size: 0.72rem;
  letter-spacing: 0.02em;
  text-transform: none;
}

.cdf-inspector {
  display: grid;
  gap: 18px;
}

.cdf-inspector-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.cdf-inspector-header h2 {
  margin: 0;
  font-size: 1.28rem;
  text-transform: uppercase;
}

.cdf-inspector-header p,
.cdf-error-copy {
  margin: 8px 0 0;
  color: var(--muted, #544a43);
  line-height: 1.6;
}

.cdf-metric-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.cdf-metric {
  display: grid;
  gap: 8px;
  padding: 18px;
  border: var(--line, 3px solid #121212);
  border-radius: 22px;
  box-shadow: var(--shadow-small, 5px 5px 0 0 #121212);
  background: var(--paper, #fffdf8);
}

.cdf-metric span {
  color: var(--muted, #544a43);
  font-size: 0.8rem;
  font-weight: 900;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.cdf-metric strong {
  font-size: 1rem;
  word-break: break-word;
}

.cdf-metric-good {
  background: var(--mint, #cbf0d7);
}

.cdf-metric-good strong {
  color: var(--good, #0f694b);
}

.cdf-metric-warn {
  background: #ffe2ce;
}

.cdf-metric-warn strong {
  color: var(--warn, #9a4a20);
}

@media (max-width: 720px) {
  .cdf-inspector-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
`;
