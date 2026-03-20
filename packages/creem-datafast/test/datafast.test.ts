import { afterEach, describe, expect, it, vi } from "vitest";

import { DataFastRequestError, forwardPayment } from "../src/index";

const payment = {
  amount: 10,
  currency: "USD",
  transaction_id: "txn_123",
} as const;

describe("forwardPayment internals", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("throws when no fetch implementation is available", async () => {
    // @ts-expect-error exercising the no-fetch fallback branch
    globalThis.fetch = undefined;

    await expect(
      forwardPayment(payment, {
        datafastApiKey: "df_test",
      }),
    ).rejects.toMatchObject<DataFastRequestError>({
      retryable: false,
    });
  });

  it("returns null for successful empty responses", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 200 }));

    await expect(
      forwardPayment(payment, {
        datafastApiKey: "df_test",
        fetch: fetchMock,
      }),
    ).resolves.toBeNull();
  });

  it("returns plain text bodies when the response is not JSON", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response("ok", { status: 200 }));

    await expect(
      forwardPayment(payment, {
        datafastApiKey: "df_test",
        fetch: fetchMock,
        datafastEndpoint: "https://example.com/payments",
      }),
    ).resolves.toBe("ok");
  });

  it("retries transport failures, logs the retry, and eventually succeeds", async () => {
    const warn = vi.fn();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: "ok" }), { status: 200 }));

    await expect(
      forwardPayment(payment, {
        datafastApiKey: "df_test",
        fetch: fetchMock,
        logger: { warn },
        retry: { retries: 1, baseDelayMs: 1, maxDelayMs: 1 },
      }),
    ).resolves.toEqual({ message: "ok" });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(warn).toHaveBeenCalledWith(
      "Retrying DataFast request after transport failure.",
      expect.objectContaining({
        attempt: 1,
      }),
    );
  });

  it("throws a retryable request error after exhausting transport retries", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockRejectedValue(new Error("still offline"));

    await expect(
      forwardPayment(payment, {
        datafastApiKey: "df_test",
        fetch: fetchMock,
        retry: { retries: 0, baseDelayMs: 1, maxDelayMs: 1 },
      }),
    ).rejects.toMatchObject<DataFastRequestError>({
      retryable: true,
    });
  });

  it("retries retryable HTTP failures and preserves request ids in retry logs", async () => {
    const warn = vi.fn();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response("retry", {
          status: 429,
          headers: { "request-id": "req_retry" },
        }),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    await expect(
      forwardPayment(payment, {
        datafastApiKey: "df_test",
        fetch: fetchMock,
        logger: { warn },
        retry: { retries: 1, baseDelayMs: 1, maxDelayMs: 1 },
      }),
    ).resolves.toEqual({ ok: true });

    expect(warn).toHaveBeenCalledWith(
      "Retrying DataFast request after HTTP failure.",
      expect.objectContaining({
        attempt: 1,
        status: 429,
        requestId: "req_retry",
      }),
    );
  });
});
