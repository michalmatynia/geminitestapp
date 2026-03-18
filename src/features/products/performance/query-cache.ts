type CacheEntry<T> = {
  data: T;
  timestamp: number;
  ttl: number;
  tags: string[];
};

type CacheOptions = {
  ttl?: number | undefined;
  tags?: string[] | undefined;
  keyPrefix?: string | undefined;
};

export class QueryCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map<string, CacheEntry<unknown>>();
  private tagIndex: Map<string, Set<string>> = new Map<string, Set<string>>();
  private readonly defaultTTL: number = 300000; // 5 minutes

  private generateKey(query: string, params: unknown[], prefix?: string): string {
    const paramHash = JSON.stringify(params).slice(0, 50);
    return `${prefix || 'query'}:${query}:${paramHash}`;
  }

  private isExpired(entry: CacheEntry<unknown>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private addToTagIndex(key: string, tags: string[]): void {
    tags.forEach((tag: string) => {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set<string>());
      }
      this.tagIndex.get(tag)!.add(key);
    });
  }

  private removeFromTagIndex(key: string, tags: string[]): void {
    tags.forEach((tag: string) => {
      this.tagIndex.get(tag)?.delete(key);
    });
  }

  get<T>(query: string, params: unknown[] = [], options: CacheOptions = {}): T | null {
    const key = this.generateKey(query, params, options.keyPrefix);
    const entry = this.cache.get(key);

    if (!entry || this.isExpired(entry)) {
      if (entry) {
        this.removeFromTagIndex(key, entry.tags);
        this.cache.delete(key);
      }
      return null;
    }

    return entry.data as T;
  }

  set<T>(query: string, params: unknown[], data: T, options: CacheOptions = {}): void {
    const key = this.generateKey(query, params, options.keyPrefix);
    const tags = options.tags || [];

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: options.ttl || this.defaultTTL,
      tags,
    };

    // Remove old entry from tag index if exists
    const oldEntry = this.cache.get(key);
    if (oldEntry) {
      this.removeFromTagIndex(key, oldEntry.tags);
    }

    this.cache.set(key, entry);
    this.addToTagIndex(key, tags);
  }

  invalidateByTag(tag: string): number {
    const keys = this.tagIndex.get(tag);
    if (!keys) return 0;

    let count = 0;
    keys.forEach((key: string) => {
      const entry = this.cache.get(key);
      if (entry) {
        this.removeFromTagIndex(key, entry.tags);
        this.cache.delete(key);
        count++;
      }
    });

    this.tagIndex.delete(tag);
    return count;
  }

  invalidateByPattern(pattern: RegExp): number {
    let count = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (pattern.test(key)) {
        this.removeFromTagIndex(key, entry.tags);
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  clear(): void {
    this.cache.clear();
    this.tagIndex.clear();
  }

  getStats(): { size: number; tags: number; memory: number } {
    return {
      size: this.cache.size,
      tags: this.tagIndex.size,
      memory: JSON.stringify([...this.cache.entries()]).length,
    };
  }
}

// Stable JSON serialization: sorts object keys recursively to produce order-independent output
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return JSON.stringify(value);
  }
  const obj = value as Record<string, unknown>;
  const pairs = Object.keys(obj)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(obj[key])}`);
  return `{${pairs.join(',')}}`;
}

// Database query wrapper with caching and in-flight request deduplication
export function withQueryCache<TArgs extends unknown[], TResult>(
  queryFn: (...args: TArgs) => Promise<TResult>,
  options: {
    keyGenerator: (...args: TArgs) => string;
    ttl?: number;
    tags?: (...args: TArgs) => string[];
    invalidateOn?: string[];
  }
): (...args: TArgs) => Promise<TResult> {
  const pendingPromises = new Map<string, Promise<TResult>>();
  return (...args: TArgs): Promise<TResult> => {
    const key = options.keyGenerator(...args);
    const tags = options.tags?.(...args) || [];

    // Try cache first
    const cached = queryCache.get<TResult>(key, [], { tags, ttl: options.ttl });
    if (cached !== null) return Promise.resolve(cached);

    // Deduplicate concurrent in-flight requests for the same key
    const pending = pendingPromises.get(key);
    if (pending) return pending;

    // Execute query, cache result, and clean up pending entry
    const promise = queryFn(...args)
      .then((result) => {
        queryCache.set(key, [], result, { tags, ttl: options.ttl });
        return result;
      })
      .finally(() => {
        pendingPromises.delete(key);
      });

    pendingPromises.set(key, promise);
    return promise;
  };
}

// Global cache instance
export const queryCache: QueryCache = new QueryCache();

// Product-specific cache helpers
export const ProductCacheHelpers = {
  invalidateProduct: (productId: string): void => {
    queryCache.invalidateByTag(`product:${productId}`);
    queryCache.invalidateByTag('products:list');
  },

  invalidateCategory: (categoryId: string): void => {
    queryCache.invalidateByTag(`category:${categoryId}`);
    queryCache.invalidateByTag('products:list');
  },

  invalidateAll: (): void => {
    queryCache.invalidateByTag('products:list');
    queryCache.invalidateByTag('products:count');
    queryCache.invalidateByTag('products:paged');
    queryCache.invalidateByTag('products:ids');
    queryCache.invalidateByTag('products:search');
    queryCache.invalidateByPattern(/^products:/);
    queryCache.invalidateByPattern(/^query:products:/);
  },

  getTags: {
    product: (id: string): string[] => [`product:${id}`, 'products:list'],
    productList: (filters?: Record<string, unknown>): string[] => [
      'products:list',
      `products:filter:${JSON.stringify(filters || {})}`,
    ],
    category: (id: string): string[] => [`category:${id}`, 'categories:list'],
  },
};
