import { describe, expect, it } from "vitest";

import { createNextWebhookHandler } from "../src/next";
import type { CreemDataFastClient } from "../src/types";
import { InvalidCreemSignatureError } from "../src/errors";

describe("createNextWebhookHandler", () => {
  it("returns 200 for processed events", async () => {
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
        return {
          ok: true,
          ignored: false,
          eventId: "evt_1",
          eventType: "checkout.completed",
          transactionId: "ord_1",
          payment: {
            amount: 10,
            currency: "USD",
            transaction_id: "ord_1",
          },
          datafastResponse: null,
        };
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
    expect(response.status).toBe(200);
  });

  it("returns 200 with an Ignored body for ignored events", async () => {
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
        return {
          ok: true,
          ignored: true,
          eventId: "evt_ignored",
          eventType: "subscription.canceled",
          reason: "unsupported_event",
        };
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
    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe("Ignored");
  });

  it("returns 401 for invalid signatures", async () => {
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
        throw new InvalidCreemSignatureError("bad");
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
    expect(response.status).toBe(401);
  });

  it("rethrows unexpected errors", async () => {
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
        throw new Error("unexpected");
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

    await expect(handler(new Request("https://example.com"))).rejects.toThrow("unexpected");
  });
});
