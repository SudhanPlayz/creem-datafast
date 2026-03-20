import { Creem } from "creem";
import type { CreateCheckoutRequest } from "creem/models/components";

import { forwardDataFastPayment } from "./datafast";
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
  HeadersLike,
} from "./types";
import { mapWebhookToPayment } from "./webhook";
import { constantTimeEqualHex, getHeader, hmacSha256Hex } from "./utils";

export { createNextWebhookHandler } from "./next";
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
      await this.verifyWebhookSignature(input.rawBody, input.headers);
      const mappedEvent = await mapWebhookToPayment(input.rawBody, {
        creemClient,
        hydrateTransactions: options.hydrateTransactions,
        logger: options.logger,
      });
      const eventDetails = getEventDetails(input.rawBody);

      if (mappedEvent.ignored) {
        return {
          ok: true,
          ignored: true,
          eventId: eventDetails.id,
          eventType: eventDetails.eventType,
          reason: mappedEvent.reason,
        };
      }

      const claimed = await idempotencyStore.claim(mappedEvent.eventId, idempotencyTtlSeconds);
      if (!claimed) {
        return {
          ok: true,
          ignored: true,
          eventId: mappedEvent.eventId,
          eventType: mappedEvent.eventType,
          reason: "duplicate",
        };
      }

      try {
        const datafastResponse = await this.forwardPayment(mappedEvent.payment);
        options.logger?.info?.("Forwarded payment event to DataFast.", {
          eventId: mappedEvent.eventId,
          eventType: mappedEvent.eventType,
          transactionId: mappedEvent.transactionId,
        });

        return {
          ok: true,
          ignored: false,
          eventId: mappedEvent.eventId,
          eventType: mappedEvent.eventType,
          transactionId: mappedEvent.transactionId,
          payment: mappedEvent.payment,
          datafastResponse,
        };
      } catch (error) {
        await idempotencyStore.release?.(mappedEvent.eventId);
        throw error;
      }
    },

    async handleWebhookRequest(request) {
      const rawBody = await request.text();
      return this.handleWebhook({ rawBody, headers: request.headers });
    },
  };
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

function getEventDetails(rawBody: string): { id: string; eventType: string } {
  try {
    const parsed = JSON.parse(rawBody) as { id?: string; eventType?: string };
    return {
      id: parsed.id ?? "unknown",
      eventType: parsed.eventType ?? "unknown",
    };
  } catch {
    return {
      id: "unknown",
      eventType: "unknown",
    };
  }
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
