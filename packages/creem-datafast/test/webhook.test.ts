import { describe, expect, it, vi } from "vitest";

import { createCreemDataFast, InvalidCreemSignatureError } from "../src/index";
import { createFakeCreemClient, signPayload, TEST_WEBHOOK_SECRET } from "./helpers";

describe("webhooks", () => {
  it("verifies signatures", async () => {
    const client = createCreemDataFast({
      creemClient: createFakeCreemClient(),
      creemWebhookSecret: TEST_WEBHOOK_SECRET,
      datafastApiKey: "df_test",
    });
    const payload = JSON.stringify({ id: "evt_1", eventType: "checkout.completed" });

    await expect(
      client.verifyWebhookSignature(payload, {
        "creem-signature": signPayload(payload),
      }),
    ).resolves.toBe(true);

    await expect(
      client.verifyWebhookSignature(payload, {
        "creem-signature": "bad",
      }),
    ).rejects.toBeInstanceOf(InvalidCreemSignatureError);
  });

  it("maps checkout.completed and forwards the payment", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ message: "ok", transaction_id: "ord_123" }), { status: 200 }),
    );
    const client = createCreemDataFast({
      creemClient: createFakeCreemClient(),
      creemWebhookSecret: TEST_WEBHOOK_SECRET,
      datafastApiKey: "df_test",
      fetch: fetchMock as typeof fetch,
    });

    const payload = JSON.stringify({
      id: "evt_checkout",
      eventType: "checkout.completed",
      created_at: 1728734325927,
      object: {
        id: "ch_123",
        order: {
          id: "ord_123",
          amount_paid: 2999,
          currency: "USD",
          type: "one_time",
          created_at: "2024-10-12T11:58:33.097Z",
        },
        customer: {
          id: "cust_123",
          email: "customer@example.com",
          name: "John Doe",
        },
        metadata: {
          datafast_visitor_id: "vis_123",
        },
      },
    });

    const result = await client.handleWebhook({
      rawBody: payload,
      headers: {
        "creem-signature": signPayload(payload),
      },
    });

    expect(result).toMatchObject({
      ignored: false,
      transactionId: "ord_123",
      payment: {
        amount: 29.99,
        currency: "USD",
        transaction_id: "ord_123",
        datafast_visitor_id: "vis_123",
      },
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("deduplicates repeated events", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const client = createCreemDataFast({
      creemClient: createFakeCreemClient(),
      creemWebhookSecret: TEST_WEBHOOK_SECRET,
      datafastApiKey: "df_test",
      fetch: fetchMock as typeof fetch,
    });

    const payload = JSON.stringify({
      id: "evt_duplicate",
      eventType: "checkout.completed",
      object: {
        order: {
          id: "ord_123",
          amount: 1000,
          currency: "USD",
        },
      },
    });
    const headers = { "creem-signature": signPayload(payload) };

    await client.handleWebhook({ rawBody: payload, headers });
    const second = await client.handleWebhook({ rawBody: payload, headers });

    expect(second).toMatchObject({
      ignored: true,
      reason: "duplicate",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("delegates subscription checkout.completed to subscription.paid", async () => {
    const client = createCreemDataFast({
      creemClient: createFakeCreemClient(),
      creemWebhookSecret: TEST_WEBHOOK_SECRET,
      datafastApiKey: "df_test",
      fetch: vi.fn(async () => new Response(null, { status: 200 })) as typeof fetch,
    });

    const payload = JSON.stringify({
      id: "evt_subscription_checkout",
      eventType: "checkout.completed",
      object: {
        subscription: {
          id: "sub_123",
        },
        order: {
          id: "ord_123",
          amount: 1000,
          currency: "USD",
          type: "recurring",
        },
      },
    });

    const result = await client.handleWebhook({
      rawBody: payload,
      headers: {
        "creem-signature": signPayload(payload),
      },
    });

    expect(result).toMatchObject({
      ignored: true,
      reason: "subscription_checkout_delegated",
    });
  });

  it("hydrates subscription.paid amounts from the transaction API", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const client = createCreemDataFast({
      creemClient: createFakeCreemClient({
        transactions: {
          async getById(id) {
            return {
              id,
              mode: "test",
              object: "transaction",
              amount: 12345,
              amountPaid: 12345,
              currency: "JPY",
              type: "payment",
              status: "paid",
              createdAt: 1728734327355,
            } as never;
          },
        },
      }),
      creemWebhookSecret: TEST_WEBHOOK_SECRET,
      datafastApiKey: "df_test",
      hydrateTransactions: true,
      fetch: fetchMock as typeof fetch,
    });

    const payload = JSON.stringify({
      id: "evt_subscription_paid",
      eventType: "subscription.paid",
      created_at: 1728734327355,
      object: {
        id: "sub_123",
        last_transaction_id: "tran_123",
        last_transaction_date: "2024-10-12T11:58:47.109Z",
        metadata: {
          datafast_visitor_id: "vis_123",
        },
        customer: {
          id: "cust_123",
          email: "customer@example.com",
        },
        product: {
          price: 1000,
          currency: "EUR",
        },
      },
    });

    const result = await client.handleWebhook({
      rawBody: payload,
      headers: { "creem-signature": signPayload(payload) },
    });

    expect(result).toMatchObject({
      ignored: false,
      payment: {
        amount: 12345,
        currency: "JPY",
        renewal: true,
      },
    });
  });

  it("maps refund.created as a refunded payment", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const client = createCreemDataFast({
      creemClient: createFakeCreemClient(),
      creemWebhookSecret: TEST_WEBHOOK_SECRET,
      datafastApiKey: "df_test",
      fetch: fetchMock as typeof fetch,
    });

    const payload = JSON.stringify({
      id: "evt_refund",
      eventType: "refund.created",
      object: {
        id: "ref_123",
        refund_amount: 1210,
        refund_currency: "EUR",
        customer: {
          id: "cust_123",
          email: "customer@example.com",
        },
      },
    });

    const result = await client.handleWebhook({
      rawBody: payload,
      headers: { "creem-signature": signPayload(payload) },
    });

    expect(result).toMatchObject({
      ignored: false,
      transactionId: "ref_123",
      payment: {
        amount: 12.1,
        refunded: true,
      },
    });
  });

  it("supports the generic Request handler path", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const client = createCreemDataFast({
      creemClient: createFakeCreemClient(),
      creemWebhookSecret: TEST_WEBHOOK_SECRET,
      datafastApiKey: "df_test",
      fetch: fetchMock as typeof fetch,
    });

    const payload = JSON.stringify({
      id: "evt_request_handler",
      eventType: "checkout.completed",
      object: {
        order: {
          id: "ord_456",
          amount: 1000,
          currency: "USD",
        },
      },
    });

    const request = new Request("https://example.com/api/webhooks/creem", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "creem-signature": signPayload(payload),
      },
      body: payload,
    });

    const result = await client.handleWebhookRequest(request);
    expect(result).toMatchObject({
      ignored: false,
      transactionId: "ord_456",
    });
  });
});
