type CacheEntry<T> = {
  result: T;
  timestamp: number;
  ttl: number;
  hash: string;
};

type CacheConfig = {
  defaultTTL: number;
  maxSize: number;
  enableMetrics: boolean;
};

class ValidationCache {
  private cache = new Map<string, CacheEntry<any>>();
  private hits = 0;
  private misses = 0;
  private config: CacheConfig;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      defaultTTL: 300000, // 5 minutes
      maxSize: 1000,
      enableMetrics: true,
      ...config
    };
  }

  private generateHash(data: any): string {
    return btoa(JSON.stringify(data)).slice(0, 16);
  }

  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private evictExpired(): void {
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
      }
    }
  }

  private evictLRU(): void {
    if (this.cache.size <= this.config.maxSize) return;
    
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    const toRemove = entries.slice(0, entries.length - this.config.maxSize);
    toRemove.forEach(([key]) => this.cache.delete(key));
  }

  get<T>(key: string, data: any): T | null {
    this.evictExpired();
    
    const entry = this.cache.get(key);
    if (!entry || this.isExpired(entry)) {
      this.config.enableMetrics && this.misses++;
      return null;
    }

    const hash = this.generateHash(data);
    if (entry.hash !== hash) {
      this.cache.delete(key);
      this.config.enableMetrics && this.misses++;
      return null;
    }

    this.config.enableMetrics && this.hits++;
    return entry.result;
  }

  set<T>(key: string, data: any, result: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      result,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultTTL,
      hash: this.generateHash(data)
    };

    this.cache.set(key, entry);
    this.evictLRU();
  }

  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  getStats() {
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: this.hits / (this.hits + this.misses) || 0
    };
  }
}

export const validationCache = new ValidationCache();

export function withCache<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  keyGenerator: (...args: Parameters<T>) => string,
  ttl?: number
): T {
  return (async (...args: Parameters<T>) => {
    const key = keyGenerator(...args);
    const cached = validationCache.get(key, args[0]);
    
    if (cached) {
      return cached;
    }

    const result = await fn(...args);
    validationCache.set(key, args[0], result, ttl);
    return result;
  }) as T;
}