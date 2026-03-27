import { describe, expect, it, vi } from "vitest";

import { createExpressWebhookHandler } from "../src/express";
import { DataFastRequestError, InvalidCreemSignatureError } from "../src/errors";
import type { CreemDataFastClient } from "../src/types";

describe("createExpressWebhookHandler", () => {
  it("returns 200 for processed events", async () => {
    const handleWebhook = vi.fn(async () => ({
      ok: true as const,
      ignored: false as const,
      eventId: "evt_1",
      eventType: "checkout.completed" as const,
      transactionId: "tran_1",
      payment: {
        amount: 10,
        currency: "USD",
        transaction_id: "tran_1",
      },
      datafastResponse: null,
    }));
    const handler = createExpressWebhookHandler(createStubClient({ handleWebhook }));
    const response = createResponse();

    await handler(
      {
        body: new TextEncoder().encode('{"ok":true}'),
        headers: { "creem-signature": "sig" },
      },
      response,
    );

    expect(handleWebhook).toHaveBeenCalledWith({
      rawBody: '{"ok":true}',
      headers: { "creem-signature": "sig" },
    });
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.send).toHaveBeenCalledWith("OK");
  });

  it("returns 200 with Ignored for ignored events", async () => {
    const handler = createExpressWebhookHandler(
      createStubClient({
        handleWebhook: vi.fn(async () => ({
          ok: true as const,
          ignored: true as const,
          eventId: "evt_ignored",
          eventType: "subscription.canceled",
          reason: "unsupported_event" as const,
        })),
      }),
    );
    const response = createResponse();

    await handler(
      {
        body: '{"ignored":true}',
        headers: {},
      },
      response,
    );

    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.send).toHaveBeenCalledWith("Ignored");
  });

  it("accepts ArrayBuffer request bodies", async () => {
    const handleWebhook = vi.fn(async () => ({
      ok: true as const,
      ignored: false as const,
      eventId: "evt_array_buffer",
      eventType: "checkout.completed" as const,
      transactionId: "tran_array_buffer",
      payment: {
        amount: 10,
        currency: "USD",
        transaction_id: "tran_array_buffer",
      },
      datafastResponse: null,
    }));
    const handler = createExpressWebhookHandler(createStubClient({ handleWebhook }));
    const response = createResponse();
    const body = new TextEncoder().encode('{"array":true}').buffer;

    await handler({ body, headers: {} }, response);

    expect(handleWebhook).toHaveBeenCalledWith({
      rawBody: '{"array":true}',
      headers: {},
    });
  });

  it("returns 401 for invalid signatures", async () => {
    const handler = createExpressWebhookHandler(
      createStubClient({
        handleWebhook: vi.fn(async () => {
          throw new InvalidCreemSignatureError("bad");
        }),
      }),
    );
    const response = createResponse();

    await handler({ body: "{}", headers: {} }, response);

    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.send).toHaveBeenCalledWith("Invalid signature");
  });

  it("returns 502 for DataFast forwarding failures", async () => {
    const handler = createExpressWebhookHandler(
      createStubClient({
        handleWebhook: vi.fn(async () => {
          throw new DataFastRequestError("bad gateway", {
            retryable: true,
            status: 502,
          });
        }),
      }),
    );
    const response = createResponse();

    await handler({ body: "{}", headers: {} }, response);

    expect(response.status).toHaveBeenCalledWith(502);
    expect(response.send).toHaveBeenCalledWith("Failed to forward payment");
  });

  it("passes unexpected errors to next and explains raw-body mistakes", async () => {
    const next = vi.fn();
    const handler = createExpressWebhookHandler(createStubClient());
    const response = createResponse();

    await handler(
      {
        body: { parsed: true },
        headers: {},
      },
      response,
      next,
    );

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(String(next.mock.calls[0]?.[0]?.message)).toContain("express.raw");
  });

  it("rethrows raw-body mistakes when no next function is provided", async () => {
    const handler = createExpressWebhookHandler(createStubClient());
    const response = createResponse();

    await expect(
      handler(
        {
          body: { parsed: true },
          headers: {},
        },
        response,
      ),
    ).rejects.toThrow("express.raw");
  });
});

function createResponse() {
  type ResponseMock = {
    status: ReturnType<typeof vi.fn<(code: number) => ResponseMock>>;
    send: ReturnType<typeof vi.fn>;
  };

  const response: ResponseMock = {
    status: vi.fn<(code: number) => ResponseMock>(),
    send: vi.fn(),
  };

  response.status.mockImplementation(() => response);
  return response;
}

function createStubClient(overrides?: Partial<CreemDataFastClient>): CreemDataFastClient {
  return {
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
      throw new Error("not used");
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
    ...overrides,
  };
}
