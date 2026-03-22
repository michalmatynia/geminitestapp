import * as invalidation from '@/shared/lib/query-invalidation';

export const invalidateProducts = invalidation.invalidateProducts;
export const invalidateProductsAndCounts = invalidation.invalidateProductsAndCounts;
export const invalidateProductsAndDetail = invalidation.invalidateProductsAndDetail;
export const invalidateProductsCountsAndDetail = invalidation.invalidateProductsCountsAndDetail;
export const invalidateProductDetail = invalidation.invalidateProductDetail;
export const invalidateProductMetadata = invalidation.invalidateProductMetadata;
export const invalidateImageStudioSlots = invalidation.invalidateImageStudioSlots;
export const refetchProductsAndCounts = invalidation.refetchProductsAndCounts;

export * from '@/shared/lib/product-query-keys';
