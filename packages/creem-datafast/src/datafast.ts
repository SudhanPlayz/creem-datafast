import { DataFastRequestError } from "./errors";
import type {
  CreateCreemDataFastOptions,
  DataFastPayment,
  DataFastPaymentResponse,
  Logger,
  RetryOptions,
} from "./types";
import { delay, getHeader, jitterDelay } from "./utils";

const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

type ForwardPaymentConfig = Pick<
  CreateCreemDataFastOptions,
  "datafastApiKey" | "datafastEndpoint" | "fetch" | "timeoutMs"
> & {
  logger?: Logger;
  retry?: RetryOptions;
};

export async function forwardDataFastPayment(
  payment: DataFastPayment,
  config: ForwardPaymentConfig,
): Promise<DataFastPaymentResponse | string | null> {
  const fetchImpl = config.fetch ?? globalThis.fetch;
  if (!fetchImpl) {
    throw new DataFastRequestError("Fetch API is not available in this runtime.", {
      retryable: false,
    });
  }

  const endpoint = config.datafastEndpoint ?? "https://datafa.st/api/v1/payments";
  const retries = config.retry?.retries ?? 2;
  const baseDelayMs = config.retry?.baseDelayMs ?? 250;
  const maxDelayMs = config.retry?.maxDelayMs ?? 2_000;
  const timeoutMs = config.timeoutMs ?? 8_000;

  for (let attempt = 0; ; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(new Error("Request timed out")), timeoutMs);

    try {
      const response = await fetchImpl(endpoint, {
        method: "POST",
        headers: {
          authorization: `Bearer ${config.datafastApiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(payment),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const bodyText = await response.text();
      const requestId =
        getHeader(response.headers, "x-request-id") ?? getHeader(response.headers, "request-id");

      if (response.ok) {
        return bodyText.length > 0 ? safelyParseResponse(bodyText) : null;
      }

      const retryable = RETRYABLE_STATUSES.has(response.status);
      const error = new DataFastRequestError(
        `DataFast request failed with status ${response.status}.`,
        {
          retryable,
          status: response.status,
          requestId,
          responseBody: bodyText,
        },
      );

      if (attempt >= retries || !retryable) {
        throw error;
      }

      config.logger?.warn?.("Retrying DataFast request after HTTP failure.", {
        attempt: attempt + 1,
        status: response.status,
        requestId,
      });
    } catch (error) {
      clearTimeout(timeout);
      const wrappedError =
        error instanceof DataFastRequestError
          ? error
          : new DataFastRequestError("DataFast request failed before a valid response was received.", {
              retryable: true,
              cause: error,
            });

      if (attempt >= retries || !wrappedError.retryable) {
        throw wrappedError;
      }

      config.logger?.warn?.("Retrying DataFast request after transport failure.", {
        attempt: attempt + 1,
        error: wrappedError.message,
      });
    }

    await delay(jitterDelay(baseDelayMs, maxDelayMs, attempt));
  }
}

function safelyParseResponse(input: string): DataFastPaymentResponse | string {
  try {
    return JSON.parse(input) as DataFastPaymentResponse;
  } catch {
    return input;
  }
}
