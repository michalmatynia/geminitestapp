'use client';

import { 
  DEFAULT_QUEUED_PRODUCT_TTL_MS,
  MIN_QUEUED_PRODUCT_TTL_MS,
  cachedSources,
  normalizeProductId,
  normalizeSource,
  isAiRunSource,
  clearAllTimers,
  loadFromStorage,
  upsertQueuedProductSourceInternal,
  clearQueuedProductIdInternal,
  removeQueuedProductSourceInternal,
  listeners
} from './queued-product-ops-core';

export function resetQueuedProductOpsState(): void {
  clearAllTimers();
  // cachedSources is not directly exportable for mutation, but we can reset timers and listeners
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
