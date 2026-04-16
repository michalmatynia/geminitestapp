import type {
  ProductSyncProfile,
  ProductSyncProfileCreatePayload,
  ProductSyncProfilesResponse,
} from '@/shared/contracts/product-sync';

export const PRODUCT_SYNC_NO_STORE_HEADERS = {
  'Cache-Control': 'no-store',
} as const;

export const buildProductSyncProfilesResponse = (
  profiles: ProductSyncProfile[]
): ProductSyncProfilesResponse => ({ profiles });

export const buildProductSyncProfileCreateInput = (
  body: ProductSyncProfileCreatePayload,
  createId: () => string
): Partial<ProductSyncProfile> => ({
  ...(body.name !== undefined ? { name: body.name } : {}),
  ...(body.isDefault !== undefined ? { isDefault: body.isDefault } : {}),
  ...(body.enabled !== undefined ? { enabled: body.enabled } : {}),
  connectionId: body.connectionId,
  inventoryId: body.inventoryId,
  ...(body.catalogId !== undefined ? { catalogId: body.catalogId } : {}),
  ...(body.scheduleIntervalMinutes !== undefined
    ? { scheduleIntervalMinutes: body.scheduleIntervalMinutes }
    : {}),
  ...(body.batchSize !== undefined ? { batchSize: body.batchSize } : {}),
  ...(body.fieldRules !== undefined
    ? {
        fieldRules: body.fieldRules.map((rule) => ({
          id: rule.id ?? createId(),
          appField: rule.appField,
          baseField: rule.baseField,
          direction: rule.direction,
        })),
      }
    : {}),
  ...(body.conflictPolicy !== undefined ? { conflictPolicy: body.conflictPolicy } : {}),
});
