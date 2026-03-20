import { describe, expect, it } from "vitest";

import {
  appendDataFastTracking,
  attributeCreemPaymentLink,
  getDataFastTracking,
} from "../src/client/index";

describe("client helpers", () => {
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
});
