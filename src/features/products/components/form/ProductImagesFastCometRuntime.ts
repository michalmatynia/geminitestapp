'use client';

import { useCallback, useMemo, useState } from 'react';

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

type FastCometUploadRuntimeCallbacks = Pick<
  ProductImageManagerController,
  'onFastCometUploadStart' | 'onFastCometUploadSuccess' | 'onFastCometUploadError'
>;

export type FastCometUploadRuntimeState = FastCometUploadRuntimeCallbacks & {
  fastCometConfigError: string | null;
  clearFastCometConfigError: () => void;
};

const FASTCOMET_UPLOAD_RUNTIME_TTL_MS = 120_000;

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

export const useFastCometUploadRuntimeCallbacks = (): FastCometUploadRuntimeState => {
  const { toast } = useToast();
  const [fastCometConfigError, setFastCometConfigError] = useState<string | null>(null);
  const clearFastCometConfigError = useCallback((): void => setFastCometConfigError(null), []);

  const onFastCometUploadStart = useCallback((event: ProductImageManagerFastCometUploadEvent): void => {
    const source = resolveFastCometUploadSource(event);
    if (source !== null) markQueuedProductSource(event.productId, source, FASTCOMET_UPLOAD_RUNTIME_TTL_MS);
    toast('FastComet upload started.', { duration: 3000, variant: 'info' });
  }, [toast]);

  const onFastCometUploadSuccess = useCallback((event: ProductImageManagerFastCometUploadSuccessEvent): void => {
    const source = resolveFastCometUploadSource(event);
    if (source !== null) removeQueuedProductSource(event.productId, source);
    toast(event.alreadyUploaded === true ? 'Image is already on FastComet.' : 'Image uploaded to FastComet.', { variant: 'success' });
  }, [toast]);

  const onFastCometUploadError = useCallback((event: ProductImageManagerFastCometUploadErrorEvent): void => {
    const source = resolveFastCometUploadSource(event);
    if (source !== null) removeQueuedProductSource(event.productId, source);
    if (isFastCometConfigError(event.error)) {
      setFastCometConfigError(resolveFastCometUploadErrorMessage(event.error));
      return;
    }
    toast(resolveFastCometUploadErrorMessage(event.error), { error: event.error, variant: 'error' });
  }, [toast]);

  return useMemo(
    () => ({ onFastCometUploadStart, onFastCometUploadSuccess, onFastCometUploadError, fastCometConfigError, clearFastCometConfigError }),
    [onFastCometUploadStart, onFastCometUploadSuccess, onFastCometUploadError, fastCometConfigError, clearFastCometConfigError]
  );
};
