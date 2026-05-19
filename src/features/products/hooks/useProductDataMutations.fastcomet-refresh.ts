'use client';

import type { QueryClient } from '@tanstack/react-query';

import { getProductById } from '@/features/products/api/products';
import {
  buildQueuedProductFastCometUploadSource,
  markQueuedProductSource,
  removeQueuedProductSource,
} from '@/features/products/state/queued-product-ops';
import type { ProductImage, ProductWithImages } from '@/shared/contracts/products/product';
import { isFastCometImageFile } from '@/shared/ui/image-slot-manager/product-image-source-classification';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

import { syncUpdatedProductAcrossCaches } from './useProductDataMutations.cache';

type PendingFastCometImageTarget = {
  imageFileId: string;
  imageSlotIndex: number;
  source: string;
};

type ScheduledProductFastCometRefresh = {
  timeoutId: ReturnType<typeof setTimeout> | null;
  targets: PendingFastCometImageTarget[];
};

const PRODUCT_SAVE_FASTCOMET_REFRESH_INTERVAL_MS = 1500;
const PRODUCT_SAVE_FASTCOMET_REFRESH_TTL_MS = 180_000;

const scheduledRefreshes = new Map<string, ScheduledProductFastCometRefresh>();

const hasProductId = (product: ProductWithImages): boolean =>
  typeof product.id === 'string' && product.id.trim().length > 0;

const isPendingFastCometImage = (image: ProductImage): boolean =>
  !isFastCometImageFile(image.imageFile);

const resolveProductSaveFastCometTargets = (
  product: ProductWithImages
): PendingFastCometImageTarget[] =>
  (Array.isArray(product.images) ? product.images : [])
    .map((image: ProductImage, imageSlotIndex: number) => ({ image, imageSlotIndex }))
    .filter(({ image }: { image: ProductImage; imageSlotIndex: number }) =>
      isPendingFastCometImage(image)
    )
    .map(({ image, imageSlotIndex }: { image: ProductImage; imageSlotIndex: number }) => {
      const source = buildQueuedProductFastCometUploadSource(image.imageFileId, imageSlotIndex);
      return source === null ? null : { imageFileId: image.imageFileId, imageSlotIndex, source };
    })
    .filter((target): target is PendingFastCometImageTarget => target !== null);

const clearProductSaveFastCometRefresh = (productId: string): void => {
  const existing = scheduledRefreshes.get(productId);
  if (existing?.timeoutId !== null && existing?.timeoutId !== undefined) {
    clearTimeout(existing.timeoutId);
  }
  scheduledRefreshes.delete(productId);
};

const findProductImage = (
  product: ProductWithImages,
  imageFileId: string,
  imageSlotIndex: number
): ProductImage | undefined => {
  const images = Array.isArray(product.images) ? product.images : [];
  return (
    images[imageSlotIndex]?.imageFileId === imageFileId
      ? images[imageSlotIndex]
      : images.find((image: ProductImage): boolean => image.imageFileId === imageFileId)
  );
};

const resolveRemainingFastCometTargets = (
  product: ProductWithImages,
  targets: PendingFastCometImageTarget[]
): PendingFastCometImageTarget[] =>
  targets.filter((target: PendingFastCometImageTarget): boolean => {
    const image = findProductImage(product, target.imageFileId, target.imageSlotIndex);
    return image === undefined || isPendingFastCometImage(image);
  });

const clearCompletedQueuedSources = (
  productId: string,
  previousTargets: PendingFastCometImageTarget[],
  remainingTargets: PendingFastCometImageTarget[]
): void => {
  const remainingSources = new Set(
    remainingTargets.map((target: PendingFastCometImageTarget): string => target.source)
  );
  previousTargets.forEach((target: PendingFastCometImageTarget): void => {
    if (!remainingSources.has(target.source)) {
      removeQueuedProductSource(productId, target.source);
    }
  });
};

const clearQueuedSources = (
  productId: string,
  targets: PendingFastCometImageTarget[]
): void => {
  targets.forEach((target: PendingFastCometImageTarget): void => {
    removeQueuedProductSource(productId, target.source);
  });
};

const markQueuedSources = (
  productId: string,
  targets: PendingFastCometImageTarget[]
): void => {
  targets.forEach((target: PendingFastCometImageTarget): void => {
    markQueuedProductSource(productId, target.source, PRODUCT_SAVE_FASTCOMET_REFRESH_TTL_MS);
  });
};

const scheduleNextProductFastCometRefresh = (
  queryClient: QueryClient,
  productId: string,
  deadlineMs: number
): void => {
  const scheduled = scheduledRefreshes.get(productId);
  if (scheduled === undefined) return;

  scheduled.timeoutId = setTimeout((): void => {
    void refreshProductFastCometStatus(queryClient, productId, deadlineMs);
  }, PRODUCT_SAVE_FASTCOMET_REFRESH_INTERVAL_MS);
};

const refreshProductFastCometStatus = async (
  queryClient: QueryClient,
  productId: string,
  deadlineMs: number
): Promise<void> => {
  const scheduled = scheduledRefreshes.get(productId);
  if (scheduled === undefined) return;

  try {
    const product = await getProductById(productId, { fresh: true });
    syncUpdatedProductAcrossCaches(queryClient, product);

    const remainingTargets = resolveRemainingFastCometTargets(product, scheduled.targets);
    clearCompletedQueuedSources(productId, scheduled.targets, remainingTargets);

    if (remainingTargets.length === 0) {
      clearProductSaveFastCometRefresh(productId);
      return;
    }

    scheduled.targets = remainingTargets;
  } catch (error: unknown) {
    logClientCatch(error, {
      source: 'products.hooks.productSaveFastCometRefresh',
      action: 'refreshProductFastCometStatus',
      productId,
      level: 'warn',
    });
  }

  if (Date.now() >= deadlineMs) {
    const latestScheduled = scheduledRefreshes.get(productId);
    if (latestScheduled !== undefined) {
      clearQueuedSources(productId, latestScheduled.targets);
    }
    clearProductSaveFastCometRefresh(productId);
    return;
  }

  scheduleNextProductFastCometRefresh(queryClient, productId, deadlineMs);
};

export const scheduleProductSaveFastCometRefresh = (
  queryClient: QueryClient,
  savedProduct: ProductWithImages | null | undefined
): void => {
  if (savedProduct === null || savedProduct === undefined || !hasProductId(savedProduct)) return;

  const targets = resolveProductSaveFastCometTargets(savedProduct);
  if (targets.length === 0) return;

  const productId = savedProduct.id;
  const existing = scheduledRefreshes.get(productId);
  if (existing !== undefined) {
    clearQueuedSources(productId, existing.targets);
  }
  clearProductSaveFastCometRefresh(productId);
  markQueuedSources(productId, targets);
  scheduledRefreshes.set(productId, { timeoutId: null, targets });
  scheduleNextProductFastCometRefresh(
    queryClient,
    productId,
    Date.now() + PRODUCT_SAVE_FASTCOMET_REFRESH_TTL_MS
  );
};

export const clearScheduledProductSaveFastCometRefreshes = (): void => {
  Array.from(scheduledRefreshes.keys()).forEach(clearProductSaveFastCometRefresh);
};
