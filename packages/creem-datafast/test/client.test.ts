import { afterEach, describe, expect, it } from "vitest";

import {
  appendDataFastTracking,
  attributeCreemPaymentLink,
  getDataFastTracking,
} from "../src/client/index";

describe("client helpers", () => {
  afterEach(() => {
    // @ts-expect-error test cleanup
    delete global.document;
    // @ts-expect-error test cleanup
    delete global.window;
  });

  it("reads DataFast cookies", () => {
    expect(
      getDataFastTracking("foo=bar; datafast_visitor_id=vis_123; datafast_session_id=sess_456"),
    ).toEqual({
      datafastVisitorId: "vis_123",
      datafastSessionId: "sess_456",
    });
  });

  it("appends tracking to merchant URLs", () => {
    const url = appendDataFastTracking("https://example.com/api/checkout", {
      datafastVisitorId: "vis_123",
      datafastSessionId: "sess_456",
    });

    expect(url).toContain("datafast_visitor_id=vis_123");
    expect(url).toContain("datafast_session_id=sess_456");
  });

  it("attributes direct Creem payment links through metadata params", () => {
    const url = attributeCreemPaymentLink("https://creem.io/payment/prod_123", {
      datafastVisitorId: "vis_123",
      datafastSessionId: "sess_456",
    });

    expect(url).toContain("metadata%5Bdatafast_visitor_id%5D=vis_123");
    expect(url).toContain("metadata%5Bdatafast_session_id%5D=sess_456");
  });

  it("uses document.cookie and window.origin when explicit inputs are omitted", () => {
    // @ts-expect-error test shim
    global.document = {
      cookie: "datafast_visitor_id=vis_doc; datafast_session_id=sess_doc",
    };
    // @ts-expect-error test shim
    global.window = {
      location: {
        origin: "https://app.example.com",
      },
    };

    expect(getDataFastTracking()).toEqual({
      datafastVisitorId: "vis_doc",
      datafastSessionId: "sess_doc",
    });
    expect(appendDataFastTracking("/api/checkout")).toBe(
      "https://app.example.com/api/checkout?datafast_visitor_id=vis_doc&datafast_session_id=sess_doc",
    );
  });

  it("handles empty cookie input and URL objects without a fallback base URL", () => {
    expect(getDataFastTracking("")).toEqual({});
    expect(getDataFastTracking("broken-cookie; datafast_visitor_id=vis_123")).toEqual({
      datafastVisitorId: "vis_123",
      datafastSessionId: undefined,
    });
    expect(getDataFastTracking()).toEqual({});

    expect(appendDataFastTracking("/api/checkout", { datafastVisitorId: "vis_local" })).toBe(
      "http://localhost/api/checkout?datafast_visitor_id=vis_local",
    );

    const url = attributeCreemPaymentLink(new URL("https://creem.io/payment/prod_123"), {});
    expect(url).toBe("https://creem.io/payment/prod_123");
  });
});
