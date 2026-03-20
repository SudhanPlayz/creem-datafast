import type { DataFastTracking } from "../types";

export function getDataFastTracking(cookieHeader = getDocumentCookie()): DataFastTracking {
  if (!cookieHeader) {
    return {};
  }

  const cookies = new Map<string, string>();
  for (const pair of cookieHeader.split(";")) {
    const [key, ...value] = pair.trim().split("=");
    if (!key || value.length === 0) {
      continue;
    }

    cookies.set(key, decodeURIComponent(value.join("=")));
  }

  return {
    datafastVisitorId: cookies.get("datafast_visitor_id"),
    datafastSessionId: cookies.get("datafast_session_id"),
  };
}

export function appendDataFastTracking(
  input: string | URL,
  tracking = getDataFastTracking(),
): string {
  const url = new URL(String(input), resolveBaseUrl(input));

  if (tracking.datafastVisitorId) {
    url.searchParams.set("datafast_visitor_id", tracking.datafastVisitorId);
  }

  if (tracking.datafastSessionId) {
    url.searchParams.set("datafast_session_id", tracking.datafastSessionId);
  }

  return url.toString();
}

export function attributeCreemPaymentLink(
  input: string | URL,
  tracking = getDataFastTracking(),
): string {
  const url = new URL(String(input), resolveBaseUrl(input));

  if (tracking.datafastVisitorId) {
    url.searchParams.set("metadata[datafast_visitor_id]", tracking.datafastVisitorId);
  }

  if (tracking.datafastSessionId) {
    url.searchParams.set("metadata[datafast_session_id]", tracking.datafastSessionId);
  }

  return url.toString();
}

function getDocumentCookie(): string {
  if (typeof document === "undefined") {
    return "";
  }

  return document.cookie ?? "";
}

function resolveBaseUrl(input: string | URL): string | undefined {
  if (input instanceof URL || /^https?:\/\//u.test(String(input))) {
    return undefined;
  }

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return "http://localhost";
}
