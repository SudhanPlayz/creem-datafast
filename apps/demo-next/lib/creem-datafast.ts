import { createCreemDataFast } from "@itzsudhan/creem-datafast";

import { getCreemCoreClient } from "./creem-core";
import { pushDebugEvent } from "./debug-store";

let cachedClient: ReturnType<typeof createCreemDataFast> | undefined;

export function getCreemDataFast() {
  if (cachedClient) {
    return cachedClient;
  }

  const required = {
    CREEM_API_KEY: process.env.CREEM_API_KEY,
    CREEM_WEBHOOK_SECRET: process.env.CREEM_WEBHOOK_SECRET,
    DATAFAST_API_KEY: process.env.DATAFAST_API_KEY,
  };

  for (const [name, value] of Object.entries(required)) {
    if (!value) {
      throw new Error(`Missing required demo environment variable: ${name}`);
    }
  }

  cachedClient = createCreemDataFast({
    creemClient: getCreemCoreClient(),
    creemWebhookSecret: process.env.CREEM_WEBHOOK_SECRET!,
    datafastApiKey: process.env.DATAFAST_API_KEY!,
    testMode: true,
    hydrateTransactions: true,
    fetch: async (input, init) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const body = typeof init?.body === "string" ? safelyParse(init.body) : undefined;

      if (url.includes("/api/v1/payments")) {
        pushDebugEvent({
          kind: "forward",
          title: "Forwarding payment to DataFast",
          payload: body,
        });
      }

      const response = await fetch(input, init);
      if (url.includes("/api/v1/payments")) {
        const clone = response.clone();
        pushDebugEvent({
          kind: "log",
          title: `DataFast responded with ${response.status}`,
          payload: await safeReadBody(clone),
        });
      }

      return response;
    },
    logger: {
      info(message, context) {
        pushDebugEvent({
          kind: "log",
          title: message,
          payload: context,
        });
      },
      warn(message, context) {
        pushDebugEvent({
          kind: "log",
          title: message,
          payload: context,
        });
      },
      error(message, context) {
        pushDebugEvent({
          kind: "log",
          title: message,
          payload: context,
        });
      },
    },
  });

  return cachedClient;
}

function safelyParse(input: string): unknown {
  try {
    return JSON.parse(input) as unknown;
  } catch {
    return input;
  }
}

async function safeReadBody(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    try {
      return await response.text();
    } catch {
      return null;
    }
  }
}
