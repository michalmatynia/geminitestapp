import { isProductStudioRunInFlightStatus } from './ProductStudioContext.constants';
import type { ProductStudioRunStatus } from './ProductStudioContext.types';

export type CachedRunState = {
  runId: string;
  runStatus: ProductStudioRunStatus;
  pendingExpectedOutputs: number;
  baselineVariantIds: string[];
  storedAt: number;
};

const RUN_CACHE_TTL_MS = 5 * 60 * 1000;

const activeRunCache = new Map<string, CachedRunState>();

const buildCacheKey = (productId: string, imageSlotIndex: number): string =>
  `${productId}:${imageSlotIndex}`;

export const writeActiveRunCache = (
  productId: string,
  imageSlotIndex: number,
  state: Omit<CachedRunState, 'storedAt'>
): void => {
  activeRunCache.set(buildCacheKey(productId, imageSlotIndex), {
    ...state,
    storedAt: Date.now(),
  });
};

export const writeInFlightActiveRunCache = (
  productId: string,
  imageSlotIndex: number,
  state: Omit<CachedRunState, 'runStatus' | 'storedAt'> & {
    runStatus: ProductStudioRunStatus | null;
  }
): void => {
  if (!isProductStudioRunInFlightStatus(state.runStatus)) return;
  writeActiveRunCache(productId, imageSlotIndex, { ...state, runStatus: state.runStatus });
};

export const readActiveRunCache = (
  productId: string,
  imageSlotIndex: number
): CachedRunState | null => {
  const key = buildCacheKey(productId, imageSlotIndex);
  const cached = activeRunCache.get(key);
  if (cached === undefined) return null;
  if (Date.now() - cached.storedAt > RUN_CACHE_TTL_MS) {
    activeRunCache.delete(key);
    return null;
  }
  return cached;
};

export const clearActiveRunCache = (productId: string, imageSlotIndex: number): void => {
  activeRunCache.delete(buildCacheKey(productId, imageSlotIndex));
};
