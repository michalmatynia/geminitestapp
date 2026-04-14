'use client';

import { useEffect, useState } from 'react';
import { logProductListDebug } from '@/features/products/lib/product-list-observability';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

const STORAGE_KEY = 'queued-product-ids';
const DEFAULT_QUEUED_PRODUCT_TTL_MS = 30_000;
const MIN_QUEUED_PRODUCT_TTL_MS = 1_000;

type QueuedSourceState = {
  expiresAt: number | null;
};

type QueuedProductState = Map<string, Map<string, QueuedSourceState>>;

type StoredQueuedProductStateV2 = {
  version: 2;
  products: Record<
    string,
    Array<{
      source: string;
      expiresAt?: number | null;
    }>
  >;
};

let cachedSources: QueuedProductState | null = null;
const listeners = new Set<() => void>();
const removalTimers = new Map<string, ReturnType<typeof setTimeout>>();

const normalizeProductId = (value: string): string => value.trim();
const normalizeSource = (value: string): string => value.trim();
const sourceTimerKey = (productId: string, source: string): string => `${productId}::${source}`;
const isAiRunSource = (source: string): boolean => source.startsWith('ai-run:');

const clearSourceTimer = (productId: string, source: string): void => {
  const timerKey = sourceTimerKey(productId, source);
  const existingTimer = removalTimers.get(timerKey);
  if (!existingTimer) return;
  clearTimeout(existingTimer);
  removalTimers.delete(timerKey);
};

const clearAllTimers = (): void => {
  removalTimers.forEach((timer: ReturnType<typeof setTimeout>) => clearTimeout(timer));
  removalTimers.clear();
};

const areSetsEqual = (left: ReadonlySet<string>, right: ReadonlySet<string>): boolean => {
  if (left === right) return true;
  if (left.size !== right.size) return false;
  for (const value of left) {
    if (!right.has(value)) return false;
  }
  return true;
};

const emitChange = (): void => {
  logProductListDebug(
    'queued-product-ops-change',
    {
      queuedProductIdsCount: cachedSources?.size ?? 0,
      listenerCount: listeners.size,
    },
    {
      dedupeKey: 'queued-product-ops-change',
      throttleMs: 300,
    }
  );
  listeners.forEach((listener: () => void) => listener());
};

const saveToStorage = (): void => {
  if (typeof window === 'undefined' || !cachedSources) return;

  const products = Array.from(cachedSources.entries()).reduce(
    (
      acc: Record<string, Array<{ source: string; expiresAt?: number | null }>>,
      [productId, sources]
    ) => {
      const serializedSources = Array.from(sources.entries()).map(
        ([source, state]: [string, QueuedSourceState]) => ({
          source,
          ...(state.expiresAt !== null ? { expiresAt: state.expiresAt } : {}),
        })
      );
      if (serializedSources.length > 0) {
        acc[productId] = serializedSources;
      }
      return acc;
    },
    {}
  );

  if (Object.keys(products).length === 0) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }

  const payload: StoredQueuedProductStateV2 = {
    version: 2,
    products,
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
};

const ensureSourceMap = (productId: string): Map<string, QueuedSourceState> => {
  if (!cachedSources) {
    cachedSources = new Map<string, Map<string, QueuedSourceState>>();
  }
  let sourceMap = cachedSources.get(productId);
  if (!sourceMap) {
    sourceMap = new Map<string, QueuedSourceState>();
    cachedSources.set(productId, sourceMap);
  }
  return sourceMap;
};

const scheduleQueuedSourceExpiry = (
  productId: string,
  source: string,
  expiresAt: number | null
): void => {
  clearSourceTimer(productId, source);
  if (expiresAt === null) return;

  const delayMs = Math.max(MIN_QUEUED_PRODUCT_TTL_MS, expiresAt - Date.now());
  const timer = setTimeout(() => {
    removalTimers.delete(sourceTimerKey(productId, source));
    logProductListDebug(
      'queued-product-source-expired',
      {
        productId,
        source,
      },
      {
        dedupeKey: `queued-product-source-expired:${productId}:${source}`,
        throttleMs: 250,
      }
    );
    removeQueuedProductSource(productId, source);
  }, delayMs);
  removalTimers.set(sourceTimerKey(productId, source), timer);
};

const upsertQueuedProductSourceInternal = (
  productId: string,
  source: string,
  expiresAt: number | null,
  emit: boolean
): void => {
  const sources = ensureSourceMap(productId);
  const currentState = sources.get(source);
  if (currentState?.expiresAt === expiresAt) {
    scheduleQueuedSourceExpiry(productId, source, expiresAt);
    return;
  }

  sources.set(source, { expiresAt });
  scheduleQueuedSourceExpiry(productId, source, expiresAt);
  logProductListDebug(
    'queued-product-source-upserted',
    {
      productId,
      source,
      expiresAt,
      queuedProductIdsCount: cachedSources?.size ?? 0,
    },
    {
      dedupeKey: `queued-product-source-upserted:${productId}:${source}`,
      throttleMs: 250,
    }
  );
  saveToStorage();
  if (emit) emitChange();
};

const removeQueuedProductSourceInternal = (
  productId: string,
  source: string,
  emit: boolean
): boolean => {
  if (!cachedSources) return false;
  const sources = cachedSources.get(productId);
  if (!sources) return false;

  clearSourceTimer(productId, source);
  const removed = sources.delete(source);
  if (!removed) return false;

  if (sources.size === 0) {
    cachedSources.delete(productId);
  }

  logProductListDebug(
    'queued-product-source-removed',
    {
      productId,
      source,
      queuedProductIdsCount: cachedSources?.size ?? 0,
    },
    {
      dedupeKey: `queued-product-source-removed:${productId}:${source}`,
      throttleMs: 250,
    }
  );
  saveToStorage();
  if (emit) emitChange();
  return true;
};

const clearQueuedProductIdInternal = (productId: string, emit: boolean): boolean => {
  if (!cachedSources) return false;
  const sources = cachedSources.get(productId);
  if (!sources) return false;

  Array.from(sources.keys()).forEach((source: string) => clearSourceTimer(productId, source));
  cachedSources.delete(productId);
  logProductListDebug(
    'queued-product-cleared',
    {
      productId,
      queuedProductIdsCount: cachedSources?.size ?? 0,
    },
    {
      dedupeKey: `queued-product-cleared:${productId}`,
      throttleMs: 250,
    }
  );
  saveToStorage();
  if (emit) emitChange();
  return true;
};

const hydrateQueuedProductStateFromStorage = (stored: unknown): void => {
  if (!cachedSources) {
    cachedSources = new Map<string, Map<string, QueuedSourceState>>();
  }

  const now = Date.now();
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return;
  const candidate = stored as Partial<StoredQueuedProductStateV2> & {
    products?: Record<string, Array<{ source?: unknown; expiresAt?: unknown }>>;
  };
  const products = candidate.products;
  if (!products || typeof products !== 'object') return;

  Object.entries(products).forEach(([rawProductId, rawSources]) => {
    const productId = normalizeProductId(rawProductId);
    if (!productId || !Array.isArray(rawSources)) return;

    rawSources.forEach((rawSourceEntry) => {
      const source = normalizeSource(
        typeof rawSourceEntry?.source === 'string' ? rawSourceEntry.source : ''
      );
      if (!source) return;
      const expiresAt =
        typeof rawSourceEntry?.expiresAt === 'number' && Number.isFinite(rawSourceEntry.expiresAt)
          ? rawSourceEntry.expiresAt
          : null;
      if (expiresAt !== null && expiresAt <= now) return;
      upsertQueuedProductSourceInternal(productId, source, expiresAt, false);
    });
  });
};

const loadFromStorage = (): void => {
  if (cachedSources) return;
  cachedSources = new Map<string, Map<string, QueuedSourceState>>();
  if (typeof window === 'undefined') return;

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) return;
  try {
    hydrateQueuedProductStateFromStorage(JSON.parse(stored) as unknown);
  } catch (error) {
    logClientError(error);
    cachedSources = new Map<string, Map<string, QueuedSourceState>>();
  }
};

const refreshFromStorage = (): void => {
  clearAllTimers();
  cachedSources = null;
  loadFromStorage();
  const queuedProductIdsCount = (cachedSources as QueuedProductState | null)?.size ?? 0;
  logProductListDebug(
    'queued-product-storage-refreshed',
    {
      queuedProductIdsCount,
    },
    {
      dedupeKey: 'queued-product-storage-refreshed',
      throttleMs: 250,
    }
  );
  emitChange();
};

export const __resetQueuedProductOpsState = (): void => {
  clearAllTimers();
  cachedSources = null;
  listeners.clear();
};

export const buildQueuedProductAiRunSource = (runId: string): string | null => {
  const normalizedRunId = normalizeSource(runId);
  if (!normalizedRunId) return null;
  return `ai-run:${normalizedRunId}`;
};

export const buildQueuedProductOfflineMutationSource = (
  operation: 'update' | 'delete' | 'create'
): string => `offline:${operation}`;

export const getQueuedProductIds = (): Set<string> => {
  loadFromStorage();
  return new Set(Array.from(cachedSources?.keys() ?? []));
};

export const getQueuedAiRunProductIds = (): Set<string> => {
  loadFromStorage();
  if (!cachedSources) return new Set<string>();

  return new Set(
    Array.from(cachedSources.entries())
      .filter(([, sources]: [string, Map<string, QueuedSourceState>]) =>
        Array.from(sources.keys()).some((source: string) => isAiRunSource(source))
      )
      .map(([productId]: [string, Map<string, QueuedSourceState>]) => productId)
  );
};

export const getQueuedProductSources = (id: string): Set<string> => {
  const productId = normalizeProductId(id);
  if (!productId) return new Set<string>();
  loadFromStorage();
  return new Set(Array.from(cachedSources?.get(productId)?.keys() ?? []));
};

export const addQueuedProductSource = (id: string, source: string): void => {
  const productId = normalizeProductId(id);
  const normalizedSource = normalizeSource(source);
  if (!productId || !normalizedSource) return;
  loadFromStorage();
  upsertQueuedProductSourceInternal(productId, normalizedSource, null, true);
};

export const removeQueuedProductSource = (id: string, source: string): void => {
  const productId = normalizeProductId(id);
  const normalizedSource = normalizeSource(source);
  if (!productId || !normalizedSource) return;
  loadFromStorage();
  removeQueuedProductSourceInternal(productId, normalizedSource, true);
};

export const markQueuedProductSource = (
  id: string,
  source: string,
  ttlMs: number = DEFAULT_QUEUED_PRODUCT_TTL_MS
): void => {
  const productId = normalizeProductId(id);
  const normalizedSource = normalizeSource(source);
  if (!productId || !normalizedSource) return;
  loadFromStorage();
  const expiresAt = Date.now() + Math.max(MIN_QUEUED_PRODUCT_TTL_MS, ttlMs);
  upsertQueuedProductSourceInternal(productId, normalizedSource, expiresAt, true);
};

export const clearQueuedProductId = (id: string): void => {
  const productId = normalizeProductId(id);
  if (!productId) return;
  loadFromStorage();
  clearQueuedProductIdInternal(productId, true);
};

export const useQueuedProductIds = (): Set<string> => {
  const [ids, setIds] = useState<Set<string>>(() => getQueuedProductIds());

  useEffect(() => {
    const handleChange = (): void => {
      setIds((currentIds) => {
        const nextIds = getQueuedProductIds();
        return areSetsEqual(currentIds, nextIds) ? currentIds : nextIds;
      });
    };

    listeners.add(handleChange);
    const handleStorage = (event: StorageEvent): void => {
      if (event.key === STORAGE_KEY) {
        logProductListDebug(
          'queued-product-storage-event',
          {
            hook: 'useQueuedProductIds',
            storageKey: event.key,
          },
          {
            dedupeKey: 'queued-product-storage-event:ids',
            throttleMs: 250,
          }
        );
        refreshFromStorage();
      }
    };
    window.addEventListener('storage', handleStorage);

    return (): void => {
      listeners.delete(handleChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  return ids;
};

export const useQueuedAiRunProductIds = (): Set<string> => {
  const [ids, setIds] = useState<Set<string>>(() => getQueuedAiRunProductIds());

  useEffect(() => {
    const handleChange = (): void => {
      setIds((currentIds) => {
        const nextIds = getQueuedAiRunProductIds();
        return areSetsEqual(currentIds, nextIds) ? currentIds : nextIds;
      });
    };

    listeners.add(handleChange);
    const handleStorage = (event: StorageEvent): void => {
      if (event.key === STORAGE_KEY) {
        logProductListDebug(
          'queued-product-storage-event',
          {
            hook: 'useQueuedAiRunProductIds',
            storageKey: event.key,
          },
          {
            dedupeKey: 'queued-product-storage-event:ai-runs',
            throttleMs: 250,
          }
        );
        refreshFromStorage();
      }
    };
    window.addEventListener('storage', handleStorage);

    return (): void => {
      listeners.delete(handleChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  return ids;
};
