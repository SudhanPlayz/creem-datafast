import { describe, expect, it, vi } from "vitest";

import { createCreemDataFast, UnsupportedEventError } from "../src/index";
import { MemoryIdempotencyStore } from "../src/idempotency";
import { createFakeCreemClient, signPayload, TEST_WEBHOOK_SECRET } from "./helpers";

describe("public client facade", () => {
  it("constructs from a creemApiKey when no client instance is provided", () => {
    const client = createCreemDataFast({
      creemApiKey: "creem_test_123",
      creemWebhookSecret: TEST_WEBHOOK_SECRET,
      datafastApiKey: "df_test",
      testMode: true,
    });

    expect(typeof client.createCheckout).toBe("function");
    expect(typeof client.handleWebhook).toBe("function");
    expect(typeof client.replayWebhook).toBe("function");
    expect(typeof client.healthCheck).toBe("function");
  });

  it("also constructs against the production server branch when testMode is omitted", () => {
    const client = createCreemDataFast({
      creemApiKey: "creem_live_123",
      creemWebhookSecret: TEST_WEBHOOK_SECRET,
      datafastApiKey: "df_test",
    });

    expect(typeof client.verifyWebhookSignature).toBe("function");
  });

  it("throws when neither creemClient nor creemApiKey is provided", () => {
    expect(() =>
      createCreemDataFast({
        creemWebhookSecret: TEST_WEBHOOK_SECRET,
        datafastApiKey: "df_test",
      }),
    ).toThrow(UnsupportedEventError);
  });

  it("logs successful forwards and releases the idempotency key on failure", async () => {
    const info = vi.fn();
    const release = vi.fn(async () => {});
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: "bad request" }), { status: 400 }));

    const idempotencyStore = {
      claim: vi.fn(async () => true),
      release,
    };

    const client = createCreemDataFast({
      creemClient: createFakeCreemClient(),
      creemWebhookSecret: TEST_WEBHOOK_SECRET,
      datafastApiKey: "df_test",
      fetch: fetchMock,
      idempotencyStore,
      logger: { info },
    });

    const payload = JSON.stringify({
      id: "evt_success",
      eventType: "checkout.completed",
      object: {
        order: {
          id: "ord_success",
          amount: 1000,
          currency: "USD",
        },
      },
    });

    await expect(
      client.handleWebhook({
        rawBody: payload,
        headers: { "creem-signature": signPayload(payload) },
      }),
    ).resolves.toMatchObject({
      ignored: false,
      transactionId: "ord_success",
    });

    expect(info).toHaveBeenCalledWith(
      "Forwarded payment event to DataFast.",
      expect.objectContaining({
        eventId: "evt_success",
        eventType: "checkout.completed",
        transactionId: "ord_success",
      }),
    );

    await expect(
      client.handleWebhook({
        rawBody: JSON.stringify({
          id: "evt_failure",
          eventType: "checkout.completed",
          object: {
            order: {
              id: "ord_failure",
              amount: 1000,
              currency: "USD",
            },
          },
        }),
        headers: {
          "creem-signature": signPayload(
            JSON.stringify({
              id: "evt_failure",
              eventType: "checkout.completed",
              object: {
                order: {
                  id: "ord_failure",
                  amount: 1000,
                  currency: "USD",
                },
              },
            }),
          ),
        },
      }),
    ).rejects.toBeDefined();

    expect(release).toHaveBeenCalledWith("evt_failure");
  });

  it("prunes expired in-memory idempotency entries", async () => {
    const store = new MemoryIdempotencyStore();
    const nowSpy = vi.spyOn(Date, "now");

    nowSpy.mockReturnValue(0);
    expect(await store.claim("evt_1", 1)).toBe(true);

    nowSpy.mockReturnValue(2_000);
    expect(await store.claim("evt_1", 1)).toBe(true);

    nowSpy.mockRestore();
  });

  it("forwards payments through the client convenience method", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify({ message: "ok" }), { status: 200 }));
    const client = createCreemDataFast({
      creemClient: createFakeCreemClient(),
      creemWebhookSecret: TEST_WEBHOOK_SECRET,
      datafastApiKey: "df_test",
      fetch: fetchMock,
    });

    await expect(
      client.forwardPayment({
        amount: 10,
        currency: "USD",
        transaction_id: "tran_direct",
      }),
    ).resolves.toEqual({ message: "ok" });
  });

  it("reports health for credentials and DataFast reachability", async () => {
    const originalFetch = globalThis.fetch;
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 405 }));

    const healthyClient = createCreemDataFast({
      creemClient: createFakeCreemClient(),
      creemWebhookSecret: TEST_WEBHOOK_SECRET,
      datafastApiKey: "df_test",
      fetch: fetchMock,
      datafastEndpoint: "https://example.com/payments",
    });

    await expect(healthyClient.healthCheck()).resolves.toMatchObject({
      ok: true,
      healthy: true,
      creemConfigured: true,
      webhookConfigured: true,
      datafastConfigured: true,
      datafastReachable: true,
      datafastEndpoint: "https://example.com/payments",
      datafastStatus: 405,
      errors: [],
    });

    // @ts-expect-error exercising the runtime-without-fetch branch
    globalThis.fetch = undefined;
    const noFetchClient = createCreemDataFast({
      creemClient: createFakeCreemClient(),
      creemWebhookSecret: TEST_WEBHOOK_SECRET,
      datafastApiKey: "df_test",
    });

    await expect(noFetchClient.healthCheck()).resolves.toMatchObject({
      ok: false,
      datafastReachable: false,
      errors: expect.arrayContaining(["Fetch API is not available in this runtime."]),
    });

    globalThis.fetch = originalFetch;
    const offlineClient = createCreemDataFast({
      creemClient: createFakeCreemClient(),
      creemWebhookSecret: TEST_WEBHOOK_SECRET,
      datafastApiKey: "df_test",
      fetch: vi.fn<typeof fetch>().mockRejectedValue(new Error("offline")),
    });

    await expect(offlineClient.healthCheck()).resolves.toMatchObject({
      ok: false,
      healthy: false,
      datafastReachable: false,
      errors: expect.arrayContaining(["offline"]),
    });

    const unknownFailureClient = createCreemDataFast({
      creemClient: createFakeCreemClient(),
      creemWebhookSecret: TEST_WEBHOOK_SECRET,
      datafastApiKey: "df_test",
      fetch: vi.fn<typeof fetch>().mockRejectedValue("boom"),
    });

    await expect(unknownFailureClient.healthCheck()).resolves.toMatchObject({
      ok: false,
      healthy: false,
      datafastReachable: false,
      errors: expect.arrayContaining(["DataFast health probe failed."]),
    });

    const unhealthyClient = createCreemDataFast({
      creemClient: createFakeCreemClient(),
      creemWebhookSecret: "",
      datafastApiKey: "",
      fetch: vi.fn<typeof fetch>().mockRejectedValue(new Error("offline")),
    });

    await expect(unhealthyClient.healthCheck()).resolves.toMatchObject({
      ok: false,
      healthy: false,
      creemConfigured: true,
      webhookConfigured: false,
      datafastConfigured: false,
      datafastReachable: false,
      datafastEndpoint: "https://datafa.st/api/v1/payments",
    });

    const missingCreemClient = createCreemDataFast({
      creemApiKey: " ",
      creemWebhookSecret: TEST_WEBHOOK_SECRET,
      datafastApiKey: "df_test",
      fetch: vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 200 })),
    });

    await expect(missingCreemClient.healthCheck()).resolves.toMatchObject({
      ok: false,
      healthy: false,
      creemConfigured: false,
      datafastReachable: true,
      errors: expect.arrayContaining(["Missing Creem client or API key."]),
    });

    globalThis.fetch = originalFetch;
  });
});
