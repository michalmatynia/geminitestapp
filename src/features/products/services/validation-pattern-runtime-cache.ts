import 'server-only';

import type { ProductValidationPattern } from '@/shared/contracts/products';

import { getProductDataProvider, type ProductDbProvider } from './product-provider';
import { getValidationPatternRepository } from './validation-pattern-repository';

const DEFAULT_CACHE_TTL_MS = 15_000;

type RuntimePatternCacheEntry = {
  patterns: ProductValidationPattern[];
  fetchedAt: number;
};

const cacheByProvider = new Map<ProductDbProvider, RuntimePatternCacheEntry>();
const inflightByProvider = new Map<ProductDbProvider, Promise<ProductValidationPattern[]>>();

const readCachedPatterns = (
  provider: ProductDbProvider,
  maxAgeMs: number
): ProductValidationPattern[] | null => {
  const cached = cacheByProvider.get(provider);
  if (!cached) return null;
  if (Date.now() - cached.fetchedAt > maxAgeMs) return null;
  return cached.patterns;
};

export const listValidationPatternsCached = async ({
  providerOverride,
  maxAgeMs = DEFAULT_CACHE_TTL_MS,
}: {
  providerOverride?: ProductDbProvider | undefined;
  maxAgeMs?: number | undefined;
} = {}): Promise<ProductValidationPattern[]> => {
  const provider = providerOverride ?? (await getProductDataProvider());
  const cached = readCachedPatterns(provider, maxAgeMs);
  if (cached) return cached;

  const inflight = inflightByProvider.get(provider);
  if (inflight) return inflight;

  const load = (async (): Promise<ProductValidationPattern[]> => {
    const repository = await getValidationPatternRepository(provider);
    const patterns = await repository.listPatterns();
    cacheByProvider.set(provider, {
      patterns,
      fetchedAt: Date.now(),
    });
    return patterns;
  })();

  inflightByProvider.set(provider, load);
  try {
    return await load;
  } finally {
    inflightByProvider.delete(provider);
  }
};

export const invalidateValidationPatternRuntimeCache = (
  provider?: ProductDbProvider | undefined
): void => {
  if (provider) {
    cacheByProvider.delete(provider);
    inflightByProvider.delete(provider);
    return;
  }
  cacheByProvider.clear();
  inflightByProvider.clear();
};

