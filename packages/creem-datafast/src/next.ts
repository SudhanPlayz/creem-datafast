import type { CreemDataFastClient } from "./types";
import { DataFastRequestError, InvalidCreemSignatureError } from "./errors";

export function createNextWebhookHandler(client: CreemDataFastClient) {
  return async function POST(request: Request): Promise<Response> {
    try {
      const result = await client.handleWebhookRequest(request);
      return new Response(result.ignored ? "Ignored" : "OK", { status: 200 });
    } catch (error) {
      if (error instanceof InvalidCreemSignatureError) {
        return new Response("Invalid signature", { status: 401 });
      }

      if (error instanceof DataFastRequestError) {
        return new Response("Failed to forward payment", { status: 502 });
      }

      throw error;
    }
  };
}
