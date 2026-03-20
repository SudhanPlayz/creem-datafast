import { describe, expect, it, vi } from "vitest";

import { createCreemDataFast, MissingTrackingError, TrackingCollisionError } from "../src/index";
import { createFakeCreemClient } from "./helpers";

describe("createCheckout", () => {
  it("injects tracking from cookies into metadata", async () => {
    const create = vi.fn(async (input) => ({
      id: "ch_test",
      mode: "test",
      object: "checkout",
      status: "pending",
      product: input.productId,
      metadata: input.metadata,
      checkoutUrl: "https://checkout.creem.io/ch_test",
    }));

    const client = createCreemDataFast({
      creemClient: createFakeCreemClient({
        checkouts: { create: create as never },
      }),
      creemWebhookSecret: "secret",
      datafastApiKey: "df_test",
    });

    const result = await client.createCheckout(
      {
        productId: "prod_123",
        successUrl: "https://example.com/success",
      },
      {
        cookieHeader: "datafast_visitor_id=vis_123; datafast_session_id=sess_456",
      },
    );

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          datafast_visitor_id: "vis_123",
          datafast_session_id: "sess_456",
        }),
      }),
    );
    expect(result.resolvedTracking).toEqual({
      datafastVisitorId: "vis_123",
      datafastSessionId: "sess_456",
    });
  });

  it("preserves metadata tracking by default", async () => {
    const create = vi.fn(async (input) => ({
      id: "ch_test",
      mode: "test",
      object: "checkout",
      status: "pending",
      product: input.productId,
      metadata: input.metadata,
    }));

    const client = createCreemDataFast({
      creemClient: createFakeCreemClient({
        checkouts: { create: create as never },
      }),
      creemWebhookSecret: "secret",
      datafastApiKey: "df_test",
    });

    await client.createCheckout(
      {
        productId: "prod_123",
        metadata: {
          datafast_visitor_id: "meta_vis",
        },
      },
      {
        request: {
          url: "https://example.com/api/checkout?datafast_visitor_id=query_vis",
        },
      },
    );

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          datafast_visitor_id: "meta_vis",
        }),
      }),
    );
  });

  it("overwrites metadata tracking when mergeStrategy is overwrite", async () => {
    const create = vi.fn(async (input) => ({
      id: "ch_test",
      mode: "test",
      object: "checkout",
      status: "pending",
      product: input.productId,
      metadata: input.metadata,
    }));

    const client = createCreemDataFast({
      creemClient: createFakeCreemClient({
        checkouts: { create: create as never },
      }),
      creemWebhookSecret: "secret",
      datafastApiKey: "df_test",
    });

    await client.createCheckout(
      {
        productId: "prod_123",
        mergeStrategy: "overwrite",
        metadata: {
          datafast_visitor_id: "meta_vis",
        },
      },
      {
        request: {
          url: "https://example.com/api/checkout?datafast_visitor_id=query_vis",
        },
      },
    );

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          datafast_visitor_id: "query_vis",
        }),
      }),
    );
  });

  it("throws on conflicting metadata when mergeStrategy is error", async () => {
    const client = createCreemDataFast({
      creemClient: createFakeCreemClient(),
      creemWebhookSecret: "secret",
      datafastApiKey: "df_test",
    });

    await expect(
      client.createCheckout(
        {
          productId: "prod_123",
          mergeStrategy: "error",
          metadata: {
            datafast_visitor_id: "meta_vis",
          },
        },
        {
          request: {
            url: "https://example.com/api/checkout?datafast_visitor_id=query_vis",
          },
        },
      ),
    ).rejects.toBeInstanceOf(TrackingCollisionError);
  });

  it("throws when strictTracking is enabled and no visitor id exists", async () => {
    const client = createCreemDataFast({
      creemClient: createFakeCreemClient(),
      creemWebhookSecret: "secret",
      datafastApiKey: "df_test",
      strictTracking: true,
    });

    await expect(
      client.createCheckout({
        productId: "prod_123",
      }),
    ).rejects.toBeInstanceOf(MissingTrackingError);
  });
});
