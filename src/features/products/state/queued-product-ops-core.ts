'use client';

import { logProductListDebug } from '@/features/products/lib/product-list-observability';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

export const STORAGE_KEY = 'queued-product-ids';
export const DEFAULT_QUEUED_PRODUCT_TTL_MS = 30_000;
export const MIN_QUEUED_PRODUCT_TTL_MS = 1_000;

export type QueuedSourceState = {
  expiresAt: number | null;
};

export type QueuedProductState = Map<string, Map<string, QueuedSourceState>>;

export type StoredQueuedProductStateV2 = {
  version: 2;
  products: Record<
    string,
    Array<{
      source: string;
      expiresAt?: number | null;
    }>
  >;
};

export let cachedSources: QueuedProductState | null = null;
export const listeners = new Set<() => void>();
export const removalTimers = new Map<string, ReturnType<typeof setTimeout>>();

export const normalizeProductId = (value: string): string => value.trim();
export const normalizeSource = (value: string): string => value.trim();
export const sourceTimerKey = (productId: string, source: string): string => `${productId}::${source}`;
export const isAiRunSource = (source: string): boolean => source.startsWith('ai-run:');

export function clearSourceTimer(productId: string, source: string): void {
  const timerKey = sourceTimerKey(productId, source);
  const existingTimer = removalTimers.get(timerKey);
  if (existingTimer === undefined) return;
  clearTimeout(existingTimer);
  removalTimers.delete(timerKey);
}

export function clearAllTimers(): void {
  removalTimers.forEach((timer) => clearTimeout(timer));
  removalTimers.clear();
}

export function areSetsEqual(left: ReadonlySet<string>, right: ReadonlySet<string>): boolean {
  if (left === right) return true;
  if (left.size !== right.size) return false;
  for (const value of left) {
    if (!right.has(value)) return false;
  }
  return true;
}

export function emitChange(): void {
  const sources = cachedSources;
  const count = sources !== null ? sources.size : 0;
  logProductListDebug(
    'queued-product-ops-change',
    {
      queuedProductIdsCount: count,
      listenerCount: listeners.size,
    },
    {
      dedupeKey: 'queued-product-ops-change',
      throttleMs: 300,
    }
  );
  listeners.forEach((listener) => listener());
}

function serializeSources(): Record<string, Array<{ source: string; expiresAt?: number | null }>> {
  const sources = cachedSources;
  if (sources === null) return {};
  const products: Record<string, Array<{ source: string; expiresAt?: number | null }>> = {};
  
  for (const [productId, productSources] of sources.entries()) {
    const serialized = Array.from(productSources.entries()).map(([source, state]) => ({
      source,
      ...(state.expiresAt !== null ? { expiresAt: state.expiresAt } : {}),
    }));
    if (serialized.length > 0) {
      products[productId] = serialized;
    }
  }
  return products;
}

export function saveToStorage(): void {
  if (typeof window === 'undefined' || cachedSources === null) return;

  const products = serializeSources();
  if (Object.keys(products).length === 0) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }

  const payload: StoredQueuedProductStateV2 = {
    version: 2,
    products,
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function ensureSourceMap(productId: string): Map<string, QueuedSourceState> {
  cachedSources ??= new Map<string, Map<string, QueuedSourceState>>();
  
  let sourceMap = cachedSources.get(productId);
  if (sourceMap === undefined) {
    sourceMap = new Map<string, QueuedSourceState>();
    cachedSources.set(productId, sourceMap);
  }
  return sourceMap;
}

export function scheduleQueuedSourceExpiry(
  productId: string,
  source: string,
  expiresAt: number | null
): void {
  clearSourceTimer(productId, source);
  if (expiresAt === null) return;

  const delayMs = Math.max(MIN_QUEUED_PRODUCT_TTL_MS, expiresAt - Date.now());
  const timer = setTimeout(() => {
    removalTimers.delete(sourceTimerKey(productId, source));
    logProductListDebug(
      'queued-product-source-expired', { productId, source },
      { dedupeKey: `queued-product-source-expired:${productId}:${source}`, throttleMs: 250 }
    );
    removeQueuedProductSource(productId, source);
  }, delayMs);
  removalTimers.set(sourceTimerKey(productId, source), timer);
}

export function upsertQueuedProductSourceInternal(
  productId: string,
  source: string,
  expiresAt: number | null,
  emit: boolean
): void {
  const sources = ensureSourceMap(productId);
  const currentState = sources.get(source);
  if (currentState?.expiresAt === expiresAt) {
    scheduleQueuedSourceExpiry(productId, source, expiresAt);
    return;
  }

  sources.set(source, { expiresAt });
  scheduleQueuedSourceExpiry(productId, source, expiresAt);
  const totalSources = cachedSources;
  const count = totalSources !== null ? totalSources.size : 0;
  logProductListDebug(
    'queued-product-source-upserted',
    { productId, source, expiresAt, queuedProductIdsCount: count },
    { dedupeKey: `queued-product-source-upserted:${productId}:${source}`, throttleMs: 250 }
  );
  saveToStorage();
  if (emit === true) emitChange();
}

export function removeQueuedProductSourceInternal(
  productId: string,
  source: string,
  emit: boolean
): boolean {
  if (cachedSources === null) return false;
  const sources = cachedSources.get(productId);
  if (sources === undefined) return false;

  clearSourceTimer(productId, source);
  const removed = sources.delete(source);
  if (removed === false) return false;

  if (sources.size === 0) {
    cachedSources.delete(productId);
  }

  logProductListDebug(
    'queued-product-source-removed',
    { productId, source, queuedProductIdsCount: cachedSources.size },
    { dedupeKey: `queued-product-source-removed:${productId}:${source}`, throttleMs: 250 }
  );
  saveToStorage();
  if (emit === true) emitChange();
  return true;
}

export function clearQueuedProductIdInternal(productId: string, emit: boolean): boolean {
  if (cachedSources === null) return false;
  const sources = cachedSources.get(productId);
  if (sources === undefined) return false;

  Array.from(sources.keys()).forEach((source) => clearSourceTimer(productId, source));
  cachedSources.delete(productId);
  logProductListDebug(
    'queued-product-cleared',
    { productId, queuedProductIdsCount: cachedSources.size },
    { dedupeKey: `queued-product-cleared:${productId}`, throttleMs: 250 }
  );
  saveToStorage();
  if (emit === true) emitChange();
  return true;
}

type StoredSourceEntry = { source?: unknown; expiresAt?: unknown };

function resolveSourceFromEntry(entry: StoredSourceEntry): string {
  const s = entry.source;
  return normalizeSource(typeof s === 'string' ? s : '');
}

function resolveExpiresAtFromEntry(entry: StoredSourceEntry): number | null {
  const e = entry.expiresAt;
  return typeof e === 'number' && Number.isFinite(e) ? e : null;
}

export function hydrateQueuedProductStateFromStorage(stored: unknown): void {
  cachedSources ??= new Map<string, Map<string, QueuedSourceState>>();

  const now = Date.now();
  if (stored === null || stored === undefined || typeof stored !== 'object' || Array.isArray(stored)) return;
  const candidate = stored as Partial<StoredQueuedProductStateV2>;
  const products = candidate.products;
  if (products === undefined || typeof products !== 'object') return;

  Object.entries(products).forEach(([rawProductId, rawSources]) => {
    const productId = normalizeProductId(rawProductId);
    if (productId === '' || !Array.isArray(rawSources)) return;

    rawSources.forEach((rawSourceEntry) => {
      const source = resolveSourceFromEntry(rawSourceEntry as StoredSourceEntry);
      if (source === '') return;
      const expiresAt = resolveExpiresAtFromEntry(rawSourceEntry as StoredSourceEntry);
      if (expiresAt !== null && expiresAt <= now) return;
      upsertQueuedProductSourceInternal(productId, source, expiresAt, false);
    });
  });
}

export function loadFromStorage(): QueuedProductState {
  cachedSources ??= new Map<string, Map<string, QueuedSourceState>>();
  if (typeof window === 'undefined') return cachedSources;

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === null) return cachedSources;
  try {
    hydrateQueuedProductStateFromStorage(JSON.parse(stored) as unknown);
  } catch (error: unknown) {
    if (error instanceof Error) logClientError(error);
    cachedSources = new Map<string, Map<string, QueuedSourceState>>();
  }
  return cachedSources;
}

export function refreshFromStorage(): void {
  clearAllTimers();
  cachedSources = null;
  const sources = loadFromStorage();
  const count = sources.size;
  logProductListDebug(
    'queued-product-storage-refreshed',
    { queuedProductIdsCount: count },
    { dedupeKey: 'queued-product-storage-refreshed', throttleMs: 250 }
  );
  emitChange();
}

export function removeQueuedProductSource(id: string, source: string): void {
  const productId = normalizeProductId(id);
  const normalizedSource = normalizeSource(source);
  if (productId === '' || normalizedSource === '') return;
  loadFromStorage();
  removeQueuedProductSourceInternal(productId, normalizedSource, true);
}
