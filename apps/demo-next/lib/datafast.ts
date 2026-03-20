"use client";

import { initDataFast, type DataFastWeb } from "datafast";

let clientPromise: Promise<DataFastWeb | null> | null = null;

export function getDataFastClient(): Promise<DataFastWeb | null> {
  if (clientPromise) {
    return clientPromise;
  }

  const websiteId = process.env.NEXT_PUBLIC_DATAFAST_WEBSITE_ID;
  if (!websiteId || typeof window === "undefined") {
    clientPromise = Promise.resolve(null);
    return clientPromise;
  }

  clientPromise = initDataFast({
    websiteId,
    domain: window.location.hostname,
    autoCapturePageviews: true,
    allowLocalhost: true,
  });

  return clientPromise;
}
