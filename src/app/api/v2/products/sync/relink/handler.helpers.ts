import type { ProductSyncRelinkPayload, ProductSyncRelinkResponse } from '@/shared/contracts/product-sync';

export const PRODUCT_SYNC_RELINK_SOURCE = 'api-products-sync-relink';

export const buildProductSyncRelinkJobInput = (
  body: ProductSyncRelinkPayload
): {
  connectionId?: string;
  inventoryId?: string;
  catalogId?: string | null;
  limit?: number;
  source: string;
} => ({
  ...(body.connectionId ? { connectionId: body.connectionId } : {}),
  ...(body.inventoryId ? { inventoryId: body.inventoryId } : {}),
  ...(body.catalogId !== undefined ? { catalogId: body.catalogId } : {}),
  ...(body.limit !== undefined ? { limit: body.limit } : {}),
  source: PRODUCT_SYNC_RELINK_SOURCE,
});

export const buildProductSyncRelinkResponse = (
  jobId: string
): ProductSyncRelinkResponse => ({
  status: 'queued',
  jobId,
});
