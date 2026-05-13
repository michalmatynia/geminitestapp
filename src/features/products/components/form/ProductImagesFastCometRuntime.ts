'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';

import { getProductById } from '@/features/products/api/products';
import { syncUpdatedProductAcrossCaches } from '@/features/products/hooks/useProductDataMutations.cache';
import {
  buildQueuedProductFastCometUploadSource,
  markQueuedProductSource,
  removeQueuedProductSource,
} from '@/features/products/state/queued-product-ops';
import type {
  ProductImageManagerFastCometUploadErrorEvent,
  ProductImageManagerFastCometUploadEvent,
  ProductImageManagerFastCometUploadSuccessEvent,
} from '@/shared/contracts/product-image-manager';
import { useToast } from '@/shared/ui/toast';
import type { ProductImageManagerController } from '@/shared/ui/image-slot-manager';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

type FastCometUploadRuntimeCallbacks = Pick<
  ProductImageManagerController,
  'onFastCometUploadStart' | 'onFastCometUploadSuccess' | 'onFastCometUploadError'
>;

export type FastCometUploadRuntimeState = FastCometUploadRuntimeCallbacks & {
  fastCometConfigError: string | null;
  clearFastCometConfigError: () => void;
};

const FASTCOMET_UPLOAD_RUNTIME_TTL_MS = 120_000;
const FASTCOMET_UPLOAD_REFRESH_DELAYS_MS = [1500, 5000, 12000, 30000, 60000, 90000, 120000] as const;

const FASTCOMET_CONFIG_ERROR_PREFIXES = [
  'FastComet storage is not configured',
  'FastComet upload was rejected by the server',
] as const;

const isFastCometConfigError = (error: unknown): boolean =>
  error instanceof Error &&
  FASTCOMET_CONFIG_ERROR_PREFIXES.some((prefix) => error.message.startsWith(prefix));

const resolveFastCometUploadSource = (
  event: Pick<ProductImageManagerFastCometUploadEvent, 'imageFileId' | 'imageSlotIndex'>
): string | null => buildQueuedProductFastCometUploadSource(event.imageFileId, event.imageSlotIndex);

const resolveFastCometUploadErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message.trim().length > 0) return error.message;
  return 'FastComet upload failed.';
};

type ProductRefreshTimer = ReturnType<typeof setTimeout>;
type ProductRefreshTimerMap = Map<string, ProductRefreshTimer[]>;

const clearScheduledProductRefresh = (
  timers: ProductRefreshTimerMap,
  source: string | null
): void => {
  if (source === null) return;
  const scheduledTimers = timers.get(source);
  if (scheduledTimers === undefined) return;
  scheduledTimers.forEach((timer: ProductRefreshTimer): void => clearTimeout(timer));
  timers.delete(source);
};

const useQueuedFastCometProductRefresh = (
  queryClient: QueryClient
): {
  clear: (source: string | null) => void;
  schedule: (event: ProductImageManagerFastCometUploadEvent, source: string | null) => void;
} => {
  const productRefreshTimersRef = useRef<ProductRefreshTimerMap>(new Map());

  const refreshProductCaches = useCallback(async (productId: string): Promise<void> => {
    try {
      syncUpdatedProductAcrossCaches(queryClient, await getProductById(productId, { fresh: true }));
    } catch (error: unknown) {
      logClientCatch(error, {
        source: 'products.images.fastcomet-runtime',
        action: 'refreshProductCaches',
        productId,
      });
    }
  }, [queryClient]);

  const clear = useCallback((source: string | null): void => {
    clearScheduledProductRefresh(productRefreshTimersRef.current, source);
  }, []);

  const schedule = useCallback((event: ProductImageManagerFastCometUploadEvent, source: string | null): void => {
    if (source === null) return;
    const timers = productRefreshTimersRef.current;
    clearScheduledProductRefresh(timers, source);
    timers.set(
      source,
      FASTCOMET_UPLOAD_REFRESH_DELAYS_MS.map(
        (delayMs: number): ProductRefreshTimer =>
          setTimeout((): void => {
            void refreshProductCaches(event.productId);
          }, delayMs)
      )
    );
  }, [refreshProductCaches]);

  useEffect(
    () => (): void => {
      productRefreshTimersRef.current.forEach((timers: ProductRefreshTimer[]): void => {
        timers.forEach((timer: ProductRefreshTimer): void => clearTimeout(timer));
      });
      productRefreshTimersRef.current.clear();
    },
    []
  );

  return useMemo(() => ({ clear, schedule }), [clear, schedule]);
};

export const useFastCometUploadRuntimeCallbacks = (): FastCometUploadRuntimeState => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const productRefresh = useQueuedFastCometProductRefresh(queryClient);
  const [fastCometConfigError, setFastCometConfigError] = useState<string | null>(null);
  const clearFastCometConfigError = useCallback((): void => setFastCometConfigError(null), []);

  const onFastCometUploadStart = useCallback((event: ProductImageManagerFastCometUploadEvent): void => {
    const source = resolveFastCometUploadSource(event);
    if (source !== null) markQueuedProductSource(event.productId, source, FASTCOMET_UPLOAD_RUNTIME_TTL_MS);
    productRefresh.schedule(event, source);
    toast('FastComet upload started.', { duration: 3000, variant: 'info' });
  }, [productRefresh, toast]);

  const onFastCometUploadSuccess = useCallback((event: ProductImageManagerFastCometUploadSuccessEvent): void => {
    const source = resolveFastCometUploadSource(event);
    if (source !== null) removeQueuedProductSource(event.productId, source);
    productRefresh.clear(source);
    if (event.product !== undefined) syncUpdatedProductAcrossCaches(queryClient, event.product);
    toast(event.alreadyUploaded === true ? 'Image is already on FastComet.' : 'Image uploaded to FastComet.', { variant: 'success' });
  }, [productRefresh, queryClient, toast]);

  const onFastCometUploadError = useCallback((event: ProductImageManagerFastCometUploadErrorEvent): void => {
    const source = resolveFastCometUploadSource(event);
    if (source !== null) removeQueuedProductSource(event.productId, source);
    productRefresh.clear(source);
    if (isFastCometConfigError(event.error)) {
      setFastCometConfigError(resolveFastCometUploadErrorMessage(event.error));
      return;
    }
    toast(resolveFastCometUploadErrorMessage(event.error), { error: event.error, variant: 'error' });
  }, [productRefresh, toast]);

  return useMemo(
    () => ({ onFastCometUploadStart, onFastCometUploadSuccess, onFastCometUploadError, fastCometConfigError, clearFastCometConfigError }),
    [onFastCometUploadStart, onFastCometUploadSuccess, onFastCometUploadError, fastCometConfigError, clearFastCometConfigError]
  );
};
