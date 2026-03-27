import { describe, expect, it, vi } from "vitest";

import {
  createCreemDataFast,
  createUpstashIdempotencyStore,
  DataFastRequestError,
  forwardPayment,
  verifyWebhookSignature,
} from "../src/index";
import { createNextWebhookHandler } from "../src/next";
import type { CreemDataFastClient } from "../src/types";
import { InvalidCreemSignatureError } from "../src/errors";
import { MemoryIdempotencyStore } from "../src/idempotency";
import { signPayload, TEST_WEBHOOK_SECRET } from "./helpers";

describe("infrastructure paths", () => {
  it("retries transient DataFast failures and eventually succeeds", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("retry me", { status: 500 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "ok", transaction_id: "txn_1" }), { status: 200 }),
      );

    const response = await forwardPayment(
      {
        amount: 10,
        currency: "USD",
        transaction_id: "txn_1",
      },
      {
        datafastApiKey: "df_test",
        fetch: fetchMock,
        retry: { retries: 1, baseDelayMs: 1, maxDelayMs: 1 },
      },
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(response).toEqual({ message: "ok", transaction_id: "txn_1" });
  });

  it("surfaces non-retryable DataFast failures", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ error: "bad request" }), {
        status: 400,
        headers: { "x-request-id": "req_123" },
      }),
    );

    await expect(
      forwardPayment(
        {
          amount: 10,
          currency: "USD",
          transaction_id: "txn_1",
        },
        {
          datafastApiKey: "df_test",
          fetch: fetchMock,
          retry: { retries: 0, baseDelayMs: 1, maxDelayMs: 1 },
        },
      ),
    ).rejects.toMatchObject({
      status: 400,
      requestId: "req_123",
      retryable: false,
    });
  });

  it("verifies missing signatures as invalid", async () => {
    await expect(verifyWebhookSignature("{}", {}, TEST_WEBHOOK_SECRET)).rejects.toBeInstanceOf(
      InvalidCreemSignatureError,
    );
  });

  it("ignores unsupported webhook events", async () => {
    const client = createCreemDataFast({
      creemClient: {
        checkouts: {
          async create() {
            throw new Error("not used");
          },
        },
      },
      creemWebhookSecret: TEST_WEBHOOK_SECRET,
      datafastApiKey: "df_test",
    });

    const payload = JSON.stringify({
      id: "evt_unknown",
      eventType: "subscription.canceled",
      object: {},
    });

    const result = await client.handleWebhook({
      rawBody: payload,
      headers: { "creem-signature": signPayload(payload) },
    });

    expect(result).toMatchObject({
      ignored: true,
      reason: "unsupported_event",
    });
  });

  it("stores idempotency keys in memory and releases them", async () => {
    const store = new MemoryIdempotencyStore();

    expect(await store.claim("evt_1", 60)).toBe(true);
    expect(await store.claim("evt_1", 60)).toBe(false);
    await store.release("evt_1");
    expect(await store.claim("evt_1", 60)).toBe(true);
  });

  it("creates an Upstash-compatible idempotency store", async () => {
    const redis = {
      set: vi.fn(async () => "OK" as const),
      del: vi.fn(async () => 1),
    };
    const store = createUpstashIdempotencyStore(redis);

    expect(await store.claim("evt_1", 60)).toBe(true);
    await store.release?.("evt_1");
    expect(redis.set).toHaveBeenCalledWith("creem-datafast:evt_1", "1", {
      nx: true,
      ex: 60,
    });
    expect(redis.del).toHaveBeenCalledWith("creem-datafast:evt_1");
  });

  it("supports custom Upstash prefixes and missing del handlers", async () => {
    const redis = {
      set: vi.fn(async () => null),
    };
    const store = createUpstashIdempotencyStore(redis, { keyPrefix: "custom:" });

    expect(await store.claim("evt_2", 30)).toBe(false);
    await expect(store.release?.("evt_2")).resolves.toBeUndefined();
    expect(redis.set).toHaveBeenCalledWith("custom:evt_2", "1", {
      nx: true,
      ex: 30,
    });
  });

  it("returns 502 from the Next helper when forwarding fails", async () => {
    const handler = createNextWebhookHandler({
      async createCheckout() {
        throw new Error("not used");
      },
      async handleWebhook() {
        throw new Error("not used");
      },
      async replayWebhook() {
        throw new Error("not used");
      },
      async handleWebhookRequest() {
        throw new DataFastRequestError("bad gateway", {
          retryable: true,
          status: 502,
        });
      },
      async verifyWebhookSignature() {
        return true;
      },
      async forwardPayment() {
        return null;
      },
      async healthCheck() {
        return {
          ok: true,
          healthy: true,
          checkedAt: new Date(0).toISOString(),
          creemConfigured: true,
          webhookConfigured: true,
          datafastConfigured: true,
          datafastReachable: true,
          datafastEndpoint: "https://datafa.st/api/v1/payments",
          errors: [],
        };
      },
    } satisfies CreemDataFastClient);

    const response = await handler(new Request("https://example.com"));
    expect(response.status).toBe(502);
  });
});
