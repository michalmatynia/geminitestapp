import type { ProductSyncRunListQuery, ProductSyncRunsResponse, ProductSyncRunRecord } from '@/shared/contracts/product-sync';

export const buildProductSyncRunListOptions = (
  query: ProductSyncRunListQuery | undefined
): {
  profileId?: string;
  limit?: number;
} => ({
  ...(query?.profileId ? { profileId: query.profileId } : {}),
  ...(query?.limit ? { limit: query.limit } : {}),
});

export const buildProductSyncRunsResponse = (
  runs: ProductSyncRunRecord[]
): ProductSyncRunsResponse => ({ runs });
