/**
 * Database Cache Utilities
 * 
 * Provides a specialized, TTL-based in-memory caching mechanism for database 
 * operations. This utility is designed to reduce database read frequency for
 * frequently accessed configurations (e.g., routing maps, policy settings).
 * 
 * Features:
 * - Request Deduplication: Ensures that concurrent calls for a stale/missing 
 *   cache key trigger only one underlying database operation.
 * - Error Resilience: Captures and reports runtime errors in the fetcher 
 *   process using the centralized observability system.
 * - Default Values: Optionally returns a default value on fetch failure.
 */

import { reportRuntimeCatch } from '@/shared/utils/observability/runtime-error-reporting';

export type DatabaseCacheValue<T> = {
  value: T;
  ts: number;
};

export interface DatabaseCacheOptions<T> {
  ttlMs: number;
  source: string;
  action: string;
  defaultValue?: T;
}

/**
 * Standardized in-memory cache for database settings and routing.
 * Consolidates duplicated caching logic across the database layer to improve 
 * performance and reduce load on primary database instances.
 */
export class SafeDatabaseCache<T> {
  private cache: DatabaseCacheValue<T> | null = null;
  private inflight: Promise<T> | null = null;
  private readonly options: DatabaseCacheOptions<T>;

  constructor(options: DatabaseCacheOptions<T>) {
    this.options = options;
  }

  /**
   * Retrieves the value from cache or executes the fetcher on cache miss/expiration.
   * 
   * Uses an `inflight` promise to dedup simultaneous requests during revalidation.
   * 
   * @param fetcher - An async function to fetch data from the source (e.g., MongoDB).
   * @returns A promise resolving to the cached or fetched value.
   */
  public async get(fetcher: () => Promise<T>): Promise<T> {
    const now = Date.now();

    // Hit: Check cache expiry
    if (this.cache && now - this.cache.ts < this.options.ttlMs) {
      return this.cache.value;
    }

    // Deduplication: Return ongoing fetcher promise
    if (this.inflight) {
      return this.inflight;
    }

    // Miss: Fetch fresh data
    this.inflight = (async (): Promise<T> => {
      try {
        return await fetcher();
      } catch (error) {
        // Report fetcher failure to observability store
        void reportRuntimeCatch(error, {
          source: this.options.source,
          action: this.options.action,
          cacheDefaultUsed: this.options.defaultValue !== undefined,
        });

        // Use fallback if defined, else re-throw error
        if (this.options.defaultValue !== undefined) {
          return this.options.defaultValue;
        }
        throw error;
      }
    })();

    try {
      const value = await this.inflight;
      this.cache = { value, ts: Date.now() };
      return value;
    } finally {
      this.inflight = null;
    }
  }

  /**
   * Explicitly clears the cache entry and any active inflight request.
   */
  public invalidate(): void {
    this.cache = null;
    this.inflight = null;
  }

  /**
   * Attempts to retrieve the cached value without triggering a refetch or 
   * promise wait if the entry has expired.
   * 
   * @returns The cached value if fresh, or null if expired or not found.
   */
  public peek(): T | null {
    const now = Date.now();
    if (this.cache && now - this.cache.ts < this.options.ttlMs) {
      return this.cache.value;
    }
    return null;
  }
}
