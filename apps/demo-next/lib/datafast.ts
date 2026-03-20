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

  clientPromise = (async () => {
    const client = await initDataFast({
      websiteId,
      domain: window.location.hostname,
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
