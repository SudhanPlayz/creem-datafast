import { DataFastRequestError, InvalidCreemSignatureError } from "./errors";
import type { CreemDataFastClient, HeadersLike } from "./types";

type ExpressLikeRequest = {
  body: unknown;
  headers: HeadersLike;
};

type ExpressLikeResponse = {
  status(code: number): ExpressLikeResponse;
  send(body?: unknown): unknown;
};

type ExpressLikeNext = (error?: unknown) => unknown;

const textDecoder = new TextDecoder();

export function createExpressWebhookHandler(client: CreemDataFastClient) {
  return async function expressWebhookHandler(
    request: ExpressLikeRequest,
    response: ExpressLikeResponse,
    next?: ExpressLikeNext,
  ) {
    try {
      const rawBody = normalizeRawBody(request.body);
      const result = await client.handleWebhook({
        rawBody,
        headers: request.headers,
      });

      response.status(200).send(result.ignored ? "Ignored" : "OK");
    } catch (error) {
      if (error instanceof InvalidCreemSignatureError) {
        response.status(401).send("Invalid signature");
        return;
      }

      if (error instanceof DataFastRequestError) {
        response.status(502).send("Failed to forward payment");
        return;
      }

      if (next) {
        next(error);
        return;
      }

      throw error;
    }
  };
}

function normalizeRawBody(body: unknown): string {
  if (typeof body === "string") {
    return body;
  }

  if (body instanceof Uint8Array) {
    return textDecoder.decode(body);
  }

  if (body instanceof ArrayBuffer) {
    return textDecoder.decode(new Uint8Array(body));
  }

  throw new Error(
    "Express webhook routes must preserve the raw request body. Use express.raw({ type: 'application/json' }) for this route.",
  );
}
