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

function clearSourceTimer(productId: string, source: string): void {
  const timerKey = sourceTimerKey(productId, source);
  const existingTimer = removalTimers.get(timerKey);
  if (existingTimer === undefined) return;
  clearTimeout(existingTimer);
  removalTimers.delete(timerKey);
}

function clearAllTimers(): void {
  removalTimers.forEach((timer) => clearTimeout(timer));
  removalTimers.clear();
}

function areSetsEqual(left: ReadonlySet<string>, right: ReadonlySet<string>): boolean {
  if (left === right) return true;
  if (left.size !== right.size) return false;
  for (const value of left) {
    if (!right.has(value)) return false;
  }
  return true;
}

function emitChange(): void {
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
  listeners.forEach((listener) => listener());
}

function serializeSources(): Record<string, Array<{ source: string; expiresAt?: number | null }>> {
  if (cachedSources === null) return {};
  const products: Record<string, Array<{ source: string; expiresAt?: number | null }>> = {};
  
  for (const [productId, sources] of cachedSources.entries()) {
    const serialized = Array.from(sources.entries()).map(([source, state]) => ({
      source,
      ...(state.expiresAt !== null ? { expiresAt: state.expiresAt } : {}),
    }));
    if (serialized.length > 0) {
      products[productId] = serialized;
    }
  }
  return products;
}

function saveToStorage(): void {
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

function ensureSourceMap(productId: string): Map<string, QueuedSourceState> {
  if (cachedSources === null) {
    cachedSources = new Map<string, Map<string, QueuedSourceState>>();
  }
  let sourceMap = cachedSources.get(productId);
  if (sourceMap === undefined) {
    sourceMap = new Map<string, QueuedSourceState>();
    cachedSources.set(productId, sourceMap);
  }
  return sourceMap;
}

function scheduleQueuedSourceExpiry(
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

function upsertQueuedProductSourceInternal(
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
  logProductListDebug(
    'queued-product-source-upserted',
    { productId, source, expiresAt, queuedProductIdsCount: cachedSources?.size ?? 0 },
    { dedupeKey: `queued-product-source-upserted:${productId}:${source}`, throttleMs: 250 }
  );
  saveToStorage();
  if (emit === true) emitChange();
}

function removeQueuedProductSourceInternal(
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

function clearQueuedProductIdInternal(productId: string, emit: boolean): boolean {
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

function hydrateQueuedProductStateFromStorage(stored: unknown): void {
  if (cachedSources === null) {
    cachedSources = new Map<string, Map<string, QueuedSourceState>>();
  }

  const now = Date.now();
  if (stored === null || stored === undefined || typeof stored !== 'object' || Array.isArray(stored)) return;
  const candidate = stored as Partial<StoredQueuedProductStateV2>;
  const products = candidate.products;
  if (products === undefined || typeof products !== 'object') return;

  Object.entries(products).forEach(([rawProductId, rawSources]) => {
    const productId = normalizeProductId(rawProductId);
    if (productId === '' || !Array.isArray(rawSources)) return;

    rawSources.forEach((rawSourceEntry) => {
      const source = normalizeSource(typeof rawSourceEntry?.source === 'string' ? rawSourceEntry.source : '');
      if (source === '') return;
      const expiresAt = typeof rawSourceEntry?.expiresAt === 'number' && Number.isFinite(rawSourceEntry.expiresAt) ? rawSourceEntry.expiresAt : null;
      if (expiresAt !== null && expiresAt <= now) return;
      upsertQueuedProductSourceInternal(productId, source, expiresAt, false);
    });
  });
}

function loadFromStorage(): void {
  if (cachedSources !== null) return;
  cachedSources = new Map<string, Map<string, QueuedSourceState>>();
  if (typeof window === 'undefined') return;

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === null) return;
  try {
    hydrateQueuedProductStateFromStorage(JSON.parse(stored) as unknown);
  } catch (error: unknown) {
    logClientError(error);
    cachedSources = new Map<string, Map<string, QueuedSourceState>>();
  }
}

function refreshFromStorage(): void {
  clearAllTimers();
  cachedSources = null;
  loadFromStorage();
  const queuedProductIdsCount = cachedSources?.size ?? 0;
  logProductListDebug(
    'queued-product-storage-refreshed',
    { queuedProductIdsCount },
    { dedupeKey: 'queued-product-storage-refreshed', throttleMs: 250 }
  );
  emitChange();
}

export function resetQueuedProductOpsState(): void {
  clearAllTimers();
  cachedSources = null;
  listeners.clear();
}

export function buildQueuedProductAiRunSource(runId: string): string | null {
  const normalizedRunId = normalizeSource(runId);
  if (normalizedRunId === '') return null;
  return `ai-run:${normalizedRunId}`;
}

export function buildQueuedProductOfflineMutationSource(
  operation: 'update' | 'delete' | 'create'
): string {
  return `offline:${operation}`;
}

export function getQueuedProductIds(): Set<string> {
  loadFromStorage();
  return new Set(Array.from(cachedSources?.keys() ?? []));
}

export function getQueuedAiRunProductIds(): Set<string> {
  loadFromStorage();
  if (cachedSources === null) return new Set<string>();

  return new Set(
    Array.from(cachedSources.entries())
      .filter(([, sources]) => Array.from(sources.keys()).some((source) => isAiRunSource(source)))
      .map(([productId]) => productId)
  );
}

export function getQueuedProductSources(id: string): Set<string> {
  const productId = normalizeProductId(id);
  if (productId === '') return new Set<string>();
  loadFromStorage();
  return new Set(Array.from(cachedSources?.get(productId)?.keys() ?? []));
}

export function addQueuedProductSource(id: string, source: string): void {
  const productId = normalizeProductId(id);
  const normalizedSource = normalizeSource(source);
  if (productId === '' || normalizedSource === '') return;
  loadFromStorage();
  upsertQueuedProductSourceInternal(productId, normalizedSource, null, true);
}

export function removeQueuedProductSource(id: string, source: string): void {
  const productId = normalizeProductId(id);
  const normalizedSource = normalizeSource(source);
  if (productId === '' || normalizedSource === '') return;
  loadFromStorage();
  removeQueuedProductSourceInternal(productId, normalizedSource, true);
}

export function markQueuedProductSource(
  id: string,
  source: string,
  ttlMs: number = DEFAULT_QUEUED_PRODUCT_TTL_MS
): void {
  const productId = normalizeProductId(id);
  const normalizedSource = normalizeSource(source);
  if (productId === '' || normalizedSource === '') return;
  loadFromStorage();
  const expiresAt = Date.now() + Math.max(MIN_QUEUED_PRODUCT_TTL_MS, ttlMs);
  upsertQueuedProductSourceInternal(productId, normalizedSource, expiresAt, true);
}

export function clearQueuedProductId(id: string): void {
  const productId = normalizeProductId(id);
  if (productId === '') return;
  loadFromStorage();
  clearQueuedProductIdInternal(productId, true);
}

export function useQueuedProductIds(): Set<string> {
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
          'queued-product-storage-event', { hook: 'useQueuedProductIds', storageKey: event.key },
          { dedupeKey: 'queued-product-storage-event:ids', throttleMs: 250 }
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
}

export function useQueuedAiRunProductIds(): Set<string> {
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
          'queued-product-storage-event', { hook: 'useQueuedAiRunProductIds', storageKey: event.key },
          { dedupeKey: 'queued-product-storage-event:ai-runs', throttleMs: 250 }
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
}
