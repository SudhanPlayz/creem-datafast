import { describe, expect, it } from "vitest";

import { getCurrencyExponent, minorToMajorAmount } from "../src/currency";

describe("currency helpers", () => {
  it("returns the correct currency exponent", () => {
    expect(getCurrencyExponent("usd")).toBe(2);
    expect(getCurrencyExponent("JPY")).toBe(0);
    expect(getCurrencyExponent("kwd")).toBe(3);
  });

  it("converts minor units to major units across currency types", () => {
    expect(minorToMajorAmount(2999, "USD")).toBe(29.99);
    expect(minorToMajorAmount(12345, "JPY")).toBe(12345);
    expect(minorToMajorAmount(12345, "KWD")).toBe(12.345);
  });
});
