import type { IdempotencyStore } from "./types";

export class MemoryIdempotencyStore implements IdempotencyStore {
  private readonly entries = new Map<string, number>();

  async claim(key: string, ttlSeconds: number): Promise<boolean> {
    this.pruneExpired();
    const now = Date.now();
    const expiry = this.entries.get(key);
    if (expiry && expiry > now) {
      return false;
    }

    this.entries.set(key, now + ttlSeconds * 1000);
    return true;
  }

  async release(key: string): Promise<void> {
    this.entries.delete(key);
  }

  private pruneExpired(): void {
    const now = Date.now();
    for (const [key, expiry] of this.entries) {
      if (expiry <= now) {
        this.entries.delete(key);
      }
    }
  }
}
