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
  private cache = new Map<string, CacheEntry<any>>();
  private tagIndex = new Map<string, Set<string>>();
  private readonly defaultTTL = 300000; // 5 minutes

  private generateKey(query: string, params: any[], prefix?: string): string {
    const paramHash = JSON.stringify(params).slice(0, 50);
    return `${prefix || 'query'}:${query}:${paramHash}`;
  }

  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private addToTagIndex(key: string, tags: string[]): void {
    tags.forEach(tag => {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      this.tagIndex.get(tag)!.add(key);
    });
  }

  private removeFromTagIndex(key: string, tags: string[]): void {
    tags.forEach(tag => {
      this.tagIndex.get(tag)?.delete(key);
    });
  }

  get<T>(query: string, params: any[] = [], options: CacheOptions = {}): T | null {
    const key = this.generateKey(query, params, options.keyPrefix);
    const entry = this.cache.get(key);

    if (!entry || this.isExpired(entry)) {
      if (entry) {
        this.removeFromTagIndex(key, entry.tags);
        this.cache.delete(key);
      }
      return null;
    }

    return entry.data;
  }

  set<T>(query: string, params: any[], data: T, options: CacheOptions = {}): void {
    const key = this.generateKey(query, params, options.keyPrefix);
    const tags = options.tags || [];
    
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: options.ttl || this.defaultTTL,
      tags
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
    keys.forEach(key => {
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

  getStats() {
    return {
      size: this.cache.size,
      tags: this.tagIndex.size,
      memory: JSON.stringify([...this.cache.entries()]).length
    };
  }
}

// Database query wrapper with caching
export function withQueryCache<T extends (...args: any[]) => Promise<any>>(
  queryFn: T,
  options: {
    keyGenerator: (...args: Parameters<T>) => string;
    ttl?: number;
    tags?: (...args: Parameters<T>) => string[];
    invalidateOn?: string[];
  }
): T {
  return (async (...args: Parameters<T>) => {
    const key = options.keyGenerator(...args);
    const tags = options.tags?.(...args) || [];
    
    // Try cache first
    const cached = queryCache.get(key, [], { tags, ttl: options.ttl });
    if (cached) return cached;

    // Execute query
    const result = await queryFn(...args);
    
    // Cache result
    queryCache.set(key, [], result, { tags, ttl: options.ttl });
    
    return result;
  }) as T;
}

// Global cache instance
export const queryCache = new QueryCache();

// Product-specific cache helpers
export const ProductCacheHelpers = {
  invalidateProduct: (productId: string) => {
    queryCache.invalidateByTag(`product:${productId}`);
    queryCache.invalidateByTag('products:list');
  },

  invalidateCategory: (categoryId: string) => {
    queryCache.invalidateByTag(`category:${categoryId}`);
    queryCache.invalidateByTag('products:list');
  },

  invalidateAll: () => {
    queryCache.invalidateByPattern(/^products:/);
  },

  getTags: {
    product: (id: string) => [`product:${id}`, 'products:list'],
    productList: (filters?: any) => ['products:list', `products:filter:${JSON.stringify(filters || {})}`],
    category: (id: string) => [`category:${id}`, 'categories:list']
  }
};