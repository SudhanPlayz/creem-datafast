import { Creem } from "creem";
import type { CreateCheckoutRequest } from "creem/models/components";

import { forwardDataFastPayment, probeDataFastHealth } from "./datafast";
import {
  InvalidCreemSignatureError,
  MissingTrackingError,
  UnsupportedEventError,
} from "./errors";
import { MemoryIdempotencyStore } from "./idempotency";
import { resolveCheckoutTracking } from "./tracking";
import type {
  CreateCheckoutInput,
  CreateCreemDataFastOptions,
  CreemDataFastClient,
  DataFastPayment,
  HandleWebhookResult,
  HeadersLike,
} from "./types";
import { mapWebhookToPayment } from "./webhook";
import { constantTimeEqualHex, getHeader, hmacSha256Hex } from "./utils";

export { createNextWebhookHandler } from "./next";
export { createExpressWebhookHandler } from "./express";
export { getDataFastTracking, appendDataFastTracking, attributeCreemPaymentLink } from "./client/index";
export { createUpstashIdempotencyStore } from "./idempotency/upstash";
export { MemoryIdempotencyStore } from "./idempotency";
export {
  CreemDataFastError,
  DataFastRequestError,
  InvalidCreemSignatureError,
  MissingTrackingError,
  TrackingCollisionError,
  UnsupportedEventError,
} from "./errors";
export type * from "./types";

export function createCreemDataFast(options: CreateCreemDataFastOptions): CreemDataFastClient {
  const creemClient =
    options.creemClient ??
    createCreemClient({
      creemApiKey: options.creemApiKey,
      testMode: options.testMode,
    });
  const idempotencyStore = options.idempotencyStore ?? new MemoryIdempotencyStore();
  const idempotencyTtlSeconds = options.idempotencyTtlSeconds ?? 7 * 24 * 60 * 60;
  const creemConfigured = Boolean(options.creemClient || options.creemApiKey?.trim());

  return {
    async createCheckout(input, context) {
      const preparedRequest = prepareCheckoutRequest(input, context, options.strictTracking);
      const checkout = await creemClient.checkouts.create(preparedRequest.request);

      return {
        ...checkout,
        resolvedTracking: preparedRequest.tracking,
      };
    },

    async verifyWebhookSignature(rawBody, headers) {
      return verifyWebhookSignature(rawBody, headers, options.creemWebhookSecret);
    },

    async forwardPayment(payment) {
      return forwardDataFastPayment(payment, options);
    },

    async handleWebhook(input) {
      return processWebhook(input, { bypassIdempotency: false });
    },

    async replayWebhook(input) {
      return processWebhook(input, { bypassIdempotency: true });
    },

    async handleWebhookRequest(request) {
      const rawBody = await request.text();
      return this.handleWebhook({ rawBody, headers: request.headers });
    },

    async healthCheck() {
      const webhookConfigured = Boolean(options.creemWebhookSecret?.trim());
      const datafastConfigured = Boolean(options.datafastApiKey?.trim());
      const datafastHealth = await probeDataFastHealth(options);
      const errors = [
        ...(creemConfigured ? [] : ["Missing Creem client or API key."]),
        ...(webhookConfigured ? [] : ["Missing Creem webhook secret."]),
        ...(datafastConfigured ? [] : ["Missing DataFast API key."]),
        ...datafastHealth.errors,
      ];
      const ok =
        creemConfigured &&
        webhookConfigured &&
        datafastConfigured &&
        datafastHealth.datafastReachable;

      return {
        ok,
        healthy: ok,
        checkedAt: new Date().toISOString(),
        creemConfigured,
        webhookConfigured,
        datafastConfigured,
        datafastReachable: datafastHealth.datafastReachable,
        datafastEndpoint: datafastHealth.datafastEndpoint,
        datafastStatus: datafastHealth.datafastStatus,
        errors,
      };
    },
  };

  async function processWebhook(
    input: Parameters<CreemDataFastClient["handleWebhook"]>[0],
    mode: { bypassIdempotency: boolean },
  ): Promise<HandleWebhookResult> {
    await verifyWebhookSignature(input.rawBody, input.headers, options.creemWebhookSecret);
    const mappedEvent = await mapWebhookToPayment(input.rawBody, {
      creemClient,
      hydrateTransactions: options.hydrateTransactions,
      logger: options.logger,
    });

    if (mappedEvent.ignored) {
      return {
        ok: true as const,
        ignored: true as const,
        eventId: mappedEvent.eventId,
        eventType: mappedEvent.eventType,
        reason: mappedEvent.reason,
      };
    }

    if (!mode.bypassIdempotency) {
      const claimed = await idempotencyStore.claim(mappedEvent.eventId, idempotencyTtlSeconds);
      if (!claimed) {
        return {
          ok: true as const,
          ignored: true as const,
          eventId: mappedEvent.eventId,
          eventType: mappedEvent.eventType,
          reason: "duplicate",
        };
      }
    }

    try {
      const datafastResponse = await forwardDataFastPayment(mappedEvent.payment, options);
      options.logger?.info?.("Forwarded payment event to DataFast.", {
        eventId: mappedEvent.eventId,
        eventType: mappedEvent.eventType,
        transactionId: mappedEvent.transactionId,
      });

      return {
        ok: true as const,
        ignored: false as const,
        eventId: mappedEvent.eventId,
        eventType: mappedEvent.eventType,
        transactionId: mappedEvent.transactionId,
        payment: mappedEvent.payment,
        datafastResponse,
      };
    } catch (error) {
      if (!mode.bypassIdempotency) {
        await idempotencyStore.release?.(mappedEvent.eventId);
      }
      throw error;
    }
  }
}

function createCreemClient(input: { creemApiKey?: string; testMode?: boolean }) {
  if (!input.creemApiKey) {
    throw new UnsupportedEventError("Missing creemApiKey or creemClient option.");
  }

  return new Creem({
    apiKey: input.creemApiKey,
    serverIdx: input.testMode ? 1 : 0,
  });
}

function prepareCheckoutRequest(
  input: CreateCheckoutInput,
  context: Parameters<CreemDataFastClient["createCheckout"]>[1],
  strictTracking?: boolean,
): {
  request: CreateCheckoutRequest;
  tracking: Awaited<ReturnType<CreemDataFastClient["createCheckout"]>>["resolvedTracking"];
} {
  const { tracking, metadata } = resolveCheckoutTracking(input, context);

  if (strictTracking && !tracking.datafastVisitorId) {
    throw new MissingTrackingError(
      "No datafast_visitor_id could be resolved from explicit input, metadata, query parameters, or cookies.",
    );
  }

  const { tracking: _tracking, mergeStrategy: _mergeStrategy, ...rest } = input;
  return {
    request: {
      ...rest,
      metadata,
    },
    tracking,
  };
}

export async function verifyWebhookSignature(
  rawBody: string,
  headers: HeadersLike,
  webhookSecret: string,
): Promise<true> {
  const signature = getHeader(headers, "creem-signature");
  if (!signature) {
    throw new InvalidCreemSignatureError("Missing creem-signature header.");
  }

  const expectedSignature = await hmacSha256Hex(webhookSecret, rawBody);
  if (!constantTimeEqualHex(expectedSignature, signature)) {
    throw new InvalidCreemSignatureError("Invalid creem-signature header.");
  }

  return true;
}

export async function forwardPayment(
  payment: DataFastPayment,
  options: Pick<
    CreateCreemDataFastOptions,
    "datafastApiKey" | "datafastEndpoint" | "fetch" | "retry" | "timeoutMs" | "logger"
  >,
) {
  return forwardDataFastPayment(payment, options);
}
