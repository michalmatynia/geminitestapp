import type { ProductSyncFieldPreview } from '@/shared/contracts/product-sync';
import type { ProductWithImages } from '@/shared/contracts/products/product';

export type BaseConnectionContext = {
  integrationId: string;
  connectionId: string;
  connectionName: string | null;
  inventoryId: string;
  token: string;
};

export type LinkedProductSyncResult = {
  status: 'success' | 'skipped' | 'failed';
  localChanges: string[];
  baseChanges: string[];
  message: string | null;
  errorMessage: string | null;
};

export type LinkedProductSyncPlan = {
  fields: ProductSyncFieldPreview[];
  localPatch: Record<string, unknown>;
  basePayload: Record<string, unknown>;
  localChanges: string[];
  baseChanges: string[];
};

export type BaseSyncResolvedTarget = {
  baseProductId: string | null;
  linkedVia: 'product' | 'listing' | 'sku_backfill' | 'none';
};

export type ResolvedProductSyncTarget = {
  product: ProductWithImages;
  target: BaseSyncResolvedTarget;
};

export type ProductSyncBaseFieldPresentationMetadata = {
  warehousesByIdentifier: Map<
    string,
    {
      id: string;
      name: string;
      identifier: string;
    }
  >;
};
