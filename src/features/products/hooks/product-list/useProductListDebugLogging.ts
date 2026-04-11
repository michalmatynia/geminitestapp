'use client';

import { useEffect, useRef } from 'react';
import { logProductListDebug } from '@/features/products/lib/product-list-observability';

export type ProductListDebugSnapshot = {
  page: number;
  pageSize: number;
  visibleCount: number;
  rowSelectionCount: number;
  isLoading: boolean;
  isFetching: boolean;
  hasLoadError: boolean;
  loadErrorMessage: string | null;
  queuedProductIdsCount: number;
  trackedAiRunsCount: number;
  backgroundSyncEnabled: boolean;
  catalogFilter: string;
  hasSearch: boolean;
  hasSku: boolean;
  hasDescription: boolean;
  hasProductId: boolean;
  hasAdvancedFilter: boolean;
  baseExported: '' | 'true' | 'false';
  includeArchived: boolean;
  showTriggerRunFeedback: boolean;
  isEditHydrating: boolean;
};

const collectProductListDebugSnapshotChanges = (
  previous: ProductListDebugSnapshot,
  next: ProductListDebugSnapshot
): Record<string, { previous: unknown; next: unknown }> => {
  const changes: Record<string, { previous: unknown; next: unknown }> = {};
  (Object.keys(next) as Array<keyof ProductListDebugSnapshot>).forEach((key) => {
    if (previous[key] !== next[key]) {
      changes[String(key)] = {
        previous: previous[key],
        next: next[key],
      };
    }
  });
  return changes;
};

export function useProductListDebugLogging(args: {
  enabled: boolean;
  snapshot: ProductListDebugSnapshot;
}): void {
  const { enabled, snapshot: debugSnapshot } = args;
  const previousDebugSnapshotRef = useRef<ProductListDebugSnapshot | null>(null);

  useEffect(() => {
    if (!enabled) {
      previousDebugSnapshotRef.current = null;
      return;
    }

    const previousSnapshot = previousDebugSnapshotRef.current;
    const changes = previousSnapshot
      ? collectProductListDebugSnapshotChanges(previousSnapshot, debugSnapshot)
      : {};
    if (previousSnapshot && Object.keys(changes).length === 0) {
      return;
    }

    logProductListDebug(
      previousSnapshot ? 'product-list-state-change' : 'product-list-state-init',
      {
        snapshot: debugSnapshot,
        ...(previousSnapshot ? { changes } : {}),
      },
      {
        dedupeKey: previousSnapshot ? 'product-list-state-change' : 'product-list-state-init',
        throttleMs: previousSnapshot ? 400 : 0,
      }
    );
    previousDebugSnapshotRef.current = debugSnapshot;
  }, [debugSnapshot, enabled]);
}
