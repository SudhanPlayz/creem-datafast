import type { IdempotencyStore } from "../types";

type UpstashLike = {
  set: (
    key: string,
    value: string,
    options?: {
      nx?: boolean;
      ex?: number;
    },
  ) => Promise<"OK" | null | undefined>;
  del?: (key: string) => Promise<unknown>;
};

export function createUpstashIdempotencyStore(
  redis: UpstashLike,
  options?: {
    keyPrefix?: string;
  },
): IdempotencyStore {
  const keyPrefix = options?.keyPrefix ?? "creem-datafast:";

  return {
    async claim(key, ttlSeconds) {
      const result = await redis.set(`${keyPrefix}${key}`, "1", {
        nx: true,
        ex: ttlSeconds,
      });

      return result === "OK";
    },
    async release(key) {
      await redis.del?.(`${keyPrefix}${key}`);
    },
  };
}
