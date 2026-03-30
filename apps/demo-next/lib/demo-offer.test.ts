import { describe, expect, it } from "vitest";

import { formatBillingLabel, formatPriceLabel } from "./demo-offer";

describe("demo offer helpers", () => {
  it("formats recurring billing labels for common CREEM periods", () => {
    expect(formatBillingLabel("recurring", "every-month")).toBe("billed every month");
    expect(formatBillingLabel("recurring", "every-year")).toBe("billed every year");
  });

  it("falls back to a one-time label for non-recurring products", () => {
    expect(formatBillingLabel("onetime", "once")).toBe("one-time purchase");
  });

  it("formats price labels and keeps a readable fallback for invalid currencies", () => {
    expect(formatPriceLabel(4900, "USD")).toBe("$49.00");
    expect(formatPriceLabel(4900, "US")).toBe("49.00 US");
    expect(formatPriceLabel(null, "USD")).toBe("Live price loads from CREEM");
  });
});
