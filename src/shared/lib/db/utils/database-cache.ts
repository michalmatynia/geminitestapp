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
 * Standardized thread-safe in-memory cache for database settings and routing.
 * Consolidates duplicated caching logic across the database layer.
 */
export class SafeDatabaseCache<T> {
  private cache: DatabaseCacheValue<T> | null = null;
  private inflight: Promise<T> | null = null;
  private readonly options: DatabaseCacheOptions<T>;

  constructor(options: DatabaseCacheOptions<T>) {
    this.options = options;
  }

  public async get(fetcher: () => Promise<T>): Promise<T> {
    const now = Date.now();

    // 1. Check cache hits
    if (this.cache && now - this.cache.ts < this.options.ttlMs) {
      return this.cache.value;
    }

    // 2. Handle concurrent inflight requests
    if (this.inflight) {
      return this.inflight;
    }

    // 3. Perform fresh fetch
    this.inflight = (async (): Promise<T> => {
      try {
        return await fetcher();
      } catch (error) {
        void reportRuntimeCatch(error, {
          source: this.options.source,
          action: this.options.action,
          cacheDefaultUsed: this.options.defaultValue !== undefined,
        });

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

  public invalidate(): void {
    this.cache = null;
    this.inflight = null;
  }

  public peek(): T | null {
    const now = Date.now();
    if (this.cache && now - this.cache.ts < this.options.ttlMs) {
      return this.cache.value;
    }
    return null;
  }
}
