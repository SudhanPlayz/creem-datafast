import { describe, expect, it, vi } from "vitest";

import { UnsupportedEventError } from "../src/errors";
import { mapWebhookToPayment } from "../src/webhook";
import { createFakeCreemClient } from "./helpers";

describe("webhook mapping internals", () => {
  it("throws when webhook payloads are missing the event id or type", async () => {
    await expect(
      mapWebhookToPayment(JSON.stringify({ eventType: "checkout.completed" }), {}),
    ).rejects.toBeInstanceOf(UnsupportedEventError);
  });

  it("throws when checkout.completed has no amount or currency", async () => {
    await expect(
      mapWebhookToPayment(
        JSON.stringify({
          id: "evt_bad_checkout",
          eventType: "checkout.completed",
          object: {
            order: {},
          },
        }),
        {},
      ),
    ).rejects.toBeInstanceOf(UnsupportedEventError);
  });

  it("maps checkout.completed using product currency and event fallbacks", async () => {
    await expect(
      mapWebhookToPayment(
        JSON.stringify({
          id: "evt_checkout_fallback",
          eventType: "checkout.completed",
          created_at: 1728734325927,
          object: {
            order: {
              amountDue: 4000,
            },
            product: {
              currency: "USD",
            },
            customer: "cust_789",
          },
        }),
        {},
      ),
    ).resolves.toMatchObject({
      ignored: false,
      eventId: "evt_checkout_fallback",
      transactionId: "evt_checkout_fallback",
      payment: {
        amount: 40,
        currency: "USD",
        customer_id: "cust_789",
        renewal: false,
      },
    });
  });

  it("falls back after subscription transaction hydration fails", async () => {
    const warn = vi.fn();

    await expect(
      mapWebhookToPayment(
        JSON.stringify({
          id: "evt_sub_fallback",
          eventType: "subscription.paid",
          created_at: 1728734327355,
          object: {
            id: "sub_123",
            customer: "cust_123",
            metadata: {
              datafast_session_id: "sess_123",
            },
            product: {
              price: 2500,
              currency: "USD",
            },
          },
        }),
        {
          creemClient: createFakeCreemClient({
            transactions: {
              async getById() {
                throw new Error("hydrate failed");
              },
            },
          }),
          hydrateTransactions: true,
          logger: { warn },
        },
      ),
    ).resolves.toMatchObject({
      ignored: false,
      eventId: "evt_sub_fallback",
      eventType: "subscription.paid",
      transactionId: "sub_123",
      payment: {
        amount: 25,
        currency: "USD",
        customer_id: "cust_123",
        renewal: true,
      },
    });

    expect(warn).toHaveBeenCalledWith(
      "Falling back to webhook payload after transaction hydration failure.",
      expect.objectContaining({
        transactionId: "sub_123",
        error: "hydrate failed",
      }),
    );
  });

  it("uses refund fallback metadata and hydrated transaction fields", async () => {
    await expect(
      mapWebhookToPayment(
        JSON.stringify({
          id: "evt_refund_fallback",
          eventType: "refund.created",
          created_at: 1728734327355,
          object: {
            transaction: {
              id: "tran_refund",
            },
            subscription: {
              metadata: {
                datafast_visitor_id: "vis_from_subscription",
              },
            },
            customer: {
              id: "cust_123",
              name: "John Refund",
            },
          },
        }),
        {
          creemClient: createFakeCreemClient({
            transactions: {
              async getById(id) {
                return {
                  id,
                  mode: "test",
                  object: "transaction",
                  refundedAmount: 345,
                  currency: "KWD",
                  type: "refund",
                  status: "refunded",
                  createdAt: "2026-03-20T06:00:00.000Z",
                } as never;
              },
            },
          }),
          hydrateTransactions: true,
        },
      ),
    ).resolves.toMatchObject({
      ignored: false,
      transactionId: "tran_refund",
      payment: {
        amount: 0.345,
        currency: "KWD",
        datafast_visitor_id: "vis_from_subscription",
        refunded: true,
        customer_id: "cust_123",
        name: "John Refund",
      },
    });
  });

  it("uses hydrated transaction amount when amountPaid is absent", async () => {
    await expect(
      mapWebhookToPayment(
        JSON.stringify({
          id: "evt_sub_amount_fallback",
          eventType: "subscription.paid",
          object: {
            id: "sub_456",
            product: {
              price: 999,
              currency: "USD",
            },
          },
        }),
        {
          creemClient: createFakeCreemClient({
            transactions: {
              async getById(id) {
                return {
                  id,
                  mode: "test",
                  object: "transaction",
                  amount: 4321,
                  currency: "USD",
                  type: "payment",
                  status: "paid",
                } as never;
              },
            },
          }),
          hydrateTransactions: true,
        },
      ),
    ).resolves.toMatchObject({
      ignored: false,
      payment: {
        amount: 43.21,
        currency: "USD",
      },
    });
  });

  it("supports hydration-free subscription mapping when no transactions client exists", async () => {
    await expect(
      mapWebhookToPayment(
        JSON.stringify({
          id: "evt_sub_plain",
          eventType: "subscription.paid",
          object: {
            product: {
              price: 999,
              currency: "EUR",
            },
          },
        }),
        {
          creemClient: {
            checkouts: {
              async create() {
                throw new Error("not used");
              },
            },
          },
          hydrateTransactions: true,
        },
      ),
    ).resolves.toMatchObject({
      ignored: false,
      eventId: "evt_sub_plain",
      payment: {
        amount: 9.99,
        currency: "EUR",
      },
    });
  });

  it("maps refunds from transaction amount fallbacks and throws when refund data is incomplete", async () => {
    await expect(
      mapWebhookToPayment(
        JSON.stringify({
          id: "evt_refund_amount_paid",
          eventType: "refund.created",
          object: {
            transaction: {
              id: "tran_123",
              amount_paid: 1500,
              currency: "EUR",
              created_at: 1728734327000,
            },
          },
        }),
        {},
      ),
    ).resolves.toMatchObject({
      ignored: false,
      transactionId: "tran_123",
      payment: {
        amount: 15,
        currency: "EUR",
      },
    });

    await expect(
      mapWebhookToPayment(
        JSON.stringify({
          id: "evt_refund_bad",
          eventType: "refund.created",
          object: {
            transaction: {},
          },
        }),
        {},
      ),
    ).rejects.toBeInstanceOf(UnsupportedEventError);
  });

  it("throws when subscription.paid still lacks amount or currency", async () => {
    await expect(
      mapWebhookToPayment(
        JSON.stringify({
          id: "evt_sub_bad",
          eventType: "subscription.paid",
          object: {
            product: {},
          },
        }),
        {},
      ),
    ).rejects.toBeInstanceOf(UnsupportedEventError);
  });

  it("logs non-Error hydration failures for refunds", async () => {
    const warn = vi.fn();

    await expect(
      mapWebhookToPayment(
        JSON.stringify({
          id: "evt_refund_string_error",
          eventType: "refund.created",
          object: {
            transaction: {
              id: "tran_string_error",
              amount: 1200,
              currency: "USD",
            },
          },
        }),
        {
          creemClient: createFakeCreemClient({
            transactions: {
              async getById() {
                throw "plain-string-error";
              },
            },
          }),
          hydrateTransactions: true,
          logger: { warn },
        },
      ),
    ).resolves.toMatchObject({
      ignored: false,
      payment: {
        amount: 12,
        currency: "USD",
      },
    });

    expect(warn).toHaveBeenCalledWith(
      "Falling back to webhook payload after transaction hydration failure.",
      expect.objectContaining({
        transactionId: "tran_string_error",
        error: "plain-string-error",
      }),
    );
  });
});
