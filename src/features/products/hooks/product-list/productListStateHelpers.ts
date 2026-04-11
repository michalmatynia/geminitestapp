import { normalizeProductPageSize } from '@/shared/lib/products/constants';

export type DeferredDraftBootstrapTarget = {
  requestIdleCallback?: (callback: () => void) => number;
  cancelIdleCallback?: (handle: number) => void;
  setTimeout: (handler: () => void, timeout?: number) => number;
  clearTimeout: (handle: number) => void;
};

export function applyProductListAdvancedFilterState(args: {
  value: string;
  presetId: string | null;
  setLocalState: (value: string, presetId: string | null) => void;
  persistState: (state: { advancedFilter: string; presetId: string | null }) => Promise<void>;
}): void {
  const normalizedValue = args.value.trim();
  const normalizedPresetId = normalizedValue.length > 0 ? args.presetId : null;

  args.setLocalState(normalizedValue, normalizedPresetId);
  void args.persistState({
    advancedFilter: normalizedValue,
    presetId: normalizedPresetId,
  });
}

export function applyProductListPageSizeChange(args: {
  size: number;
  setLocalPageSize: (size: number) => void;
  persistPageSize: (size: number) => Promise<void>;
}): void {
  const normalizedPageSize = normalizeProductPageSize(args.size, 12);
  args.setLocalPageSize(normalizedPageSize);
  void args.persistPageSize(normalizedPageSize);
}

export function shouldEnableProductListBackgroundSync(args: {
  queuedProductIdsCount: number;
  activeTrackedProductAiRunsCount: number;
}): boolean {
  return args.queuedProductIdsCount > 0 || args.activeTrackedProductAiRunsCount > 0;
}

export function shouldEnableProductListBackgroundSyncRuntime(args: {
  rowRuntimeReady: boolean;
  isLoading: boolean;
  queuedProductIdsCount: number;
  activeTrackedProductAiRunsCount: number;
}): boolean {
  if (!args.rowRuntimeReady) return false;
  if (args.isLoading) return false;
  return shouldEnableProductListBackgroundSync({
    queuedProductIdsCount: args.queuedProductIdsCount,
    activeTrackedProductAiRunsCount: args.activeTrackedProductAiRunsCount,
  });
}

export function scheduleDeferredProductListDraftBootstrap(
  target: DeferredDraftBootstrapTarget,
  onReady: () => void
): () => void {
  if (typeof target.requestIdleCallback === 'function') {
    const idleHandle = target.requestIdleCallback(() => {
      onReady();
    });
    return (): void => {
      target.cancelIdleCallback?.(idleHandle);
    };
  }

  const timeoutHandle = target.setTimeout(() => {
    onReady();
  }, 1);
  return (): void => {
    target.clearTimeout(timeoutHandle);
  };
}
