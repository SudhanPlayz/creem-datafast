import { createHmac } from "node:crypto";

import type { CreemLike } from "../src/types";

export const TEST_WEBHOOK_SECRET = "whsec_test_secret";

export function signPayload(payload: string, secret = TEST_WEBHOOK_SECRET): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function createFakeCreemClient(overrides?: Partial<CreemLike>): CreemLike {
  return {
    checkouts: {
      async create(input) {
        return {
          id: "ch_test",
          mode: "test",
          object: "checkout",
          status: "pending",
          product: input.productId,
          metadata: input.metadata,
          checkoutUrl: "https://checkout.creem.io/ch_test",
        } as never;
      },
    },
    transactions: {
      async getById(id) {
        return {
          id,
          mode: "test",
          object: "transaction",
          amount: 0,
          currency: "USD",
          type: "payment",
          status: "paid",
          createdAt: Date.now(),
        } as never;
      },
    },
    ...overrides,
  };
}
