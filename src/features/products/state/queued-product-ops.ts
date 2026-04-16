'use client';

import { useEffect, useState } from 'react';
import { logProductListDebug } from '@/features/products/lib/product-list-observability';
import { 
  STORAGE_KEY,
  cachedSources,
  listeners,
  isAiRunSource,
  areSetsEqual,
  loadFromStorage,
  refreshFromStorage,
} from './queued-product-ops-core';

export {
  resetQueuedProductOpsState,
  buildQueuedProductAiRunSource,
  buildQueuedProductOfflineMutationSource,
  getQueuedProductIds,
  getQueuedAiRunProductIds,
  getQueuedProductSources,
  addQueuedProductSource,
  removeQueuedProductSource,
  markQueuedProductSource,
  clearQueuedProductId
} from './queued-product-ops-exports';

export function useQueuedProductIds(): Set<string> {
  const [ids, setIds] = useState<Set<string>>(() => {
    loadFromStorage();
    return new Set(Array.from(cachedSources?.keys() ?? []));
  });

  useEffect(() => {
    const handleChange = (): void => {
      setIds((currentIds) => {
        loadFromStorage();
        const nextIds = new Set(Array.from(cachedSources?.keys() ?? []));
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

function resolveAiRunProductIds(): Set<string> {
  loadFromStorage();
  if (cachedSources === null) return new Set<string>();

  const entries = Array.from(cachedSources.entries());
  const aiEntries = entries.filter(([, sources]) => 
    Array.from(sources.keys()).some((source) => isAiRunSource(source))
  );
  return new Set(aiEntries.map(([productId]) => productId));
}

export function useQueuedAiRunProductIds(): Set<string> {
  const [ids, setIds] = useState<Set<string>>(() => resolveAiRunProductIds());

  useEffect(() => {
    const handleChange = (): void => {
      setIds((currentIds) => {
        const nextIds = resolveAiRunProductIds();
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
