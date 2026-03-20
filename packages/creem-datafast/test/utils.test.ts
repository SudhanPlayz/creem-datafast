import { describe, expect, it, vi } from "vitest";

import {
  asNumber,
  asRecord,
  asString,
  cleanObject,
  constantTimeEqualHex,
  delay,
  getHeader,
  getRequestDetails,
  headersFrom,
  hmacSha256Hex,
  jitterDelay,
  parseJson,
  toIsoString,
  toUrl,
} from "../src/utils";
import { signPayload } from "./helpers";

describe("utils", () => {
  it("coerces records, strings, and numbers safely", () => {
    expect(asRecord({ ok: true })).toEqual({ ok: true });
    expect(asRecord([])).toBeUndefined();
    expect(asRecord(null)).toBeUndefined();

    expect(asString("value")).toBe("value");
    expect(asString("")).toBeUndefined();
    expect(asString(42)).toBeUndefined();

    expect(asNumber(42)).toBe(42);
    expect(asNumber(Number.POSITIVE_INFINITY)).toBeUndefined();
    expect(asNumber("42")).toBeUndefined();
  });

  it("normalizes headers from all supported shapes", () => {
    const fromHeaders = headersFrom(new Headers({ "x-one": "1" }));
    expect(fromHeaders.get("x-one")).toBe("1");

    const fromArray = headersFrom([
      ["x-two", "2"],
      ["x-three", "3"],
    ]);
    expect(fromArray.get("x-two")).toBe("2");
    expect(fromArray.get("x-three")).toBe("3");

    const fromObject = headersFrom({
      "x-four": "4",
      "x-five": ["5", "6"],
      "x-skip": undefined,
    });
    expect(fromObject.get("x-four")).toBe("4");
    expect(fromObject.get("x-five")).toBe("5, 6");
    expect(fromObject.has("x-skip")).toBe(false);
    expect(getHeader(fromObject, "x-five")).toBe("5, 6");

    expect(headersFrom().keys().next().done).toBe(true);
  });

  it("extracts request details from undefined, Request, and plain objects", () => {
    expect(getRequestDetails()).toEqual({ headers: new Headers() });

    const nativeRequest = new Request("https://example.com/path", {
      headers: { "x-native": "1" },
    });
    expect(getRequestDetails(nativeRequest)).toEqual({
      headers: new Headers({ "x-native": "1" }),
      url: "https://example.com/path",
    });

    expect(
      getRequestDetails({
        headers: { "x-plain": ["1", "2"] },
        url: "https://example.com/plain",
      }),
    ).toEqual({
      headers: new Headers({ "x-plain": "1, 2" }),
      url: "https://example.com/plain",
    });
  });

  it("parses urls and json payloads", () => {
    expect(toUrl("/checkout?foo=bar").toString()).toBe("http://localhost/checkout?foo=bar");
    expect(parseJson('{"ok":true}')).toEqual({ ok: true });
  });

  it("delays and hashes webhook signatures", async () => {
    await expect(delay(0)).resolves.toBeUndefined();
    await expect(hmacSha256Hex("whsec_test_secret", '{"ok":true}')).resolves.toBe(
      signPayload('{"ok":true}'),
    );
  });

  it("uses Web Crypto when available", async () => {
    const importKey = vi.fn().mockResolvedValue("crypto-key");
    const sign = vi.fn().mockResolvedValue(new Uint8Array([0xab, 0xcd, 0xef]).buffer);
    const originalCrypto = globalThis.crypto;

    vi.stubGlobal("crypto", {
      subtle: {
        importKey,
        sign,
      },
    } as unknown as Crypto);

    try {
      await expect(hmacSha256Hex("whsec_test_secret", '{"web":true}')).resolves.toBe("abcdef");
      expect(importKey).toHaveBeenCalledOnce();
      expect(sign).toHaveBeenCalledOnce();
    } finally {
      vi.stubGlobal("crypto", originalCrypto);
    }
  });

  it("falls back to node:crypto when Web Crypto is unavailable", async () => {
    const originalCrypto = globalThis.crypto;
    vi.stubGlobal("crypto", undefined);

    try {
      await expect(hmacSha256Hex("whsec_test_secret", '{"fallback":true}')).resolves.toBe(
        signPayload('{"fallback":true}'),
      );
    } finally {
      vi.stubGlobal("crypto", originalCrypto);
    }
  });

  it("compares normalized hex strings in constant time", () => {
    expect(constantTimeEqualHex(" AB12 ", "ab12")).toBe(true);
    expect(constantTimeEqualHex("ab12", "ab34")).toBe(false);
    expect(constantTimeEqualHex("abc", "abc")).toBe(false);
    expect(constantTimeEqualHex("zz", "zz")).toBe(false);
  });

  it("converts values to ISO strings and removes undefined fields", () => {
    const now = new Date("2026-03-20T06:00:00.000Z");

    expect(toIsoString("2026-03-20T06:00:00.000Z")).toBe("2026-03-20T06:00:00.000Z");
    expect(toIsoString(now.getTime())).toBe("2026-03-20T06:00:00.000Z");
    expect(toIsoString(now)).toBe("2026-03-20T06:00:00.000Z");
    expect(toIsoString(undefined)).toBeUndefined();

    expect(cleanObject({ ok: true, skip: undefined })).toEqual({ ok: true });
  });

  it("keeps jittered delays inside the expected bounds", () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.5);
    expect(jitterDelay(100, 1000, 2)).toBeGreaterThanOrEqual(200);
    expect(jitterDelay(100, 1000, 2)).toBeLessThanOrEqual(400);
    expect(jitterDelay(1, 10, 0)).toBeGreaterThanOrEqual(50);
    randomSpy.mockRestore();
  });
});
