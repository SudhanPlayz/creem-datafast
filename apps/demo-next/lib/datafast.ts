"use client";

import { initDataFast, type DataFastWeb } from "datafast";

let clientPromise: Promise<DataFastWeb | null> | null = null;
export const DATAFAST_PROXY_PATH = "/api/events";

export function resolveDataFastDomain(hostname: string): string {
  const configuredDomain = process.env.NEXT_PUBLIC_DATAFAST_DOMAIN?.trim();
  if (configuredDomain) {
    return configuredDomain.replace(/^https?:\/\//, "").replace(/^www\./, "");
  }

  const normalizedHostname = hostname.trim().toLowerCase();
  if (
    normalizedHostname === "" ||
    normalizedHostname === "localhost" ||
    normalizedHostname === "::1" ||
    /^\d{1,3}(\.\d{1,3}){3}$/.test(normalizedHostname)
  ) {
    return normalizedHostname;
  }

  const parts = normalizedHostname.split(".").filter(Boolean);
  if (parts.length <= 2) {
    return normalizedHostname;
  }

  const multiSegmentSuffixes = new Set([
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
  const suffix = parts.slice(-2).join(".");
  if (multiSegmentSuffixes.has(suffix) && parts.length >= 3) {
    return parts.slice(-3).join(".");
  }

  return parts.slice(-2).join(".");
}

export function getDataFastClient(): Promise<DataFastWeb | null> {
  if (clientPromise) {
    return clientPromise;
  }

  const websiteId = process.env.NEXT_PUBLIC_DATAFAST_WEBSITE_ID;
  if (!websiteId || typeof window === "undefined") {
    clientPromise = Promise.resolve(null);
    return clientPromise;
  }

  clientPromise = (async () => {
    const domain = resolveDataFastDomain(window.location.hostname);
    const client = await initDataFast({
      websiteId,
      domain,
      apiUrl: DATAFAST_PROXY_PATH,
      autoCapturePageviews: {
        captureInitialPageview: false,
      },
      allowLocalhost: true,
    });

    // Flush the initial pageview before checkout actions become available so
    // DataFast can associate the later payment with an existing visitor event.
    await client.trackPageview();
    await client.flush();

    return client;
  })();

  return clientPromise;
}
