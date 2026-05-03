// Product cache helpers: thin re-exports of shared query invalidation helpers
// tailored for the products feature. Use these to invalidate or refetch
// product-related queries from mutation hooks or server-side events.
import * as invalidation from '@/shared/lib/query-invalidation';

export const invalidateProducts = invalidation.invalidateProducts;
export const invalidateProductsAndCounts = invalidation.invalidateProductsAndCounts;
export const invalidateProductsAndDetail = invalidation.invalidateProductsAndDetail;
export const invalidateProductsCountsAndDetail = invalidation.invalidateProductsCountsAndDetail;
export const invalidateProductDetail = invalidation.invalidateProductDetail;
export const invalidateProductMetadata = invalidation.invalidateProductMetadata;
export const invalidateProductTitleTerms = invalidation.invalidateProductTitleTerms;
export const invalidateImageStudioSlots = invalidation.invalidateImageStudioSlots;
export const refetchProductsAndCounts = invalidation.refetchProductsAndCounts;

export * from '@/shared/lib/product-query-keys';
