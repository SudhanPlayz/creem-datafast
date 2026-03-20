import type { HeadersLike, RequestLike } from "./types";

const textEncoder = new TextEncoder();

export function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
}

export function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function headersFrom(input?: HeadersLike): Headers {
  if (input instanceof Headers) {
    return new Headers(input);
  }

  const headers = new Headers();
  if (!input) {
    return headers;
  }

  if (Array.isArray(input)) {
    for (const [key, value] of input) {
      headers.set(key, value);
    }
    return headers;
  }

  for (const [key, value] of Object.entries(input)) {
    if (Array.isArray(value)) {
      headers.set(key, value.join(", "));
      continue;
    }

    if (value !== undefined) {
      headers.set(key, String(value));
    }
  }

  return headers;
}

export function getHeader(input: HeadersLike | undefined, name: string): string | undefined {
  return headersFrom(input).get(name) ?? undefined;
}

export function getRequestDetails(request?: RequestLike): { headers: Headers; url?: string } {
  if (!request) {
    return { headers: new Headers() };
  }

  if (request instanceof Request) {
    return { headers: new Headers(request.headers), url: request.url };
  }

  return {
    headers: headersFrom(request.headers),
    url: request.url,
  };
}

export function toUrl(input: string): URL {
  return new URL(input, "http://localhost");
}

export function parseJson(rawBody: string): unknown {
  return JSON.parse(rawBody) as unknown;
}

export async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (subtle) {
    const key = await subtle.importKey(
      "raw",
      textEncoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const signature = await subtle.sign("HMAC", key, textEncoder.encode(payload));
    return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  const { createHmac } = await import("node:crypto");
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function constantTimeEqualHex(left: string, right: string): boolean {
  const normalizedLeft = normalizeHex(left);
  const normalizedRight = normalizeHex(right);

  if (!normalizedLeft || !normalizedRight || normalizedLeft.length !== normalizedRight.length) {
    return false;
  }

  let diff = 0;
  for (let index = 0; index < normalizedLeft.length; index += 1) {
    diff |= normalizedLeft.charCodeAt(index) ^ normalizedRight.charCodeAt(index);
  }

  return diff === 0;
}

export function toIsoString(value: unknown): string | undefined {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value).toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return undefined;
}

export function cleanObject<T extends Record<string, unknown>>(value: T): T {
  for (const [key, entry] of Object.entries(value)) {
    if (entry === undefined) {
      delete value[key];
    }
  }

  return value;
}

export function jitterDelay(baseDelayMs: number, maxDelayMs: number, attempt: number): number {
  const capped = Math.min(baseDelayMs * 2 ** attempt, maxDelayMs);
  const floor = Math.max(50, Math.floor(capped * 0.5));
  const ceiling = Math.max(capped, floor);
  return floor + Math.floor(Math.random() * (ceiling - floor + 1));
}

function normalizeHex(value: string): string | undefined {
  const trimmed = value.trim().toLowerCase();
  if (trimmed.length === 0 || trimmed.length % 2 !== 0) {
    return undefined;
  }

  return /^[0-9a-f]+$/u.test(trimmed) ? trimmed : undefined;
}
