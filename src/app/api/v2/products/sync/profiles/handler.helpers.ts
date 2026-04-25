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

const buildOptionalProductSyncProfileCreateFields = (
  body: ProductSyncProfileCreatePayload
): Partial<ProductSyncProfile> => {
  const input: Partial<ProductSyncProfile> = {};
  if (body.name !== undefined) input.name = body.name;
  if (body.isDefault !== undefined) input.isDefault = body.isDefault;
  if (body.enabled !== undefined) input.enabled = body.enabled;
  if (body.catalogId !== undefined) input.catalogId = body.catalogId;
  if (body.scheduleIntervalMinutes !== undefined) {
    input.scheduleIntervalMinutes = body.scheduleIntervalMinutes;
  }
  if (body.batchSize !== undefined) input.batchSize = body.batchSize;
  if (body.conflictPolicy !== undefined) input.conflictPolicy = body.conflictPolicy;
  return input;
};

const buildProductSyncFieldRuleCreateInput = (
  fieldRules: ProductSyncProfileCreatePayload['fieldRules'],
  createId: () => string
): ProductSyncProfile['fieldRules'] | undefined => {
  if (fieldRules === undefined) return undefined;
  return fieldRules.map((rule) => ({
    id: rule.id ?? createId(),
    appField: rule.appField,
    baseField: rule.baseField,
    direction: rule.direction,
  }));
};

export const buildProductSyncProfileCreateInput = (
  body: ProductSyncProfileCreatePayload,
  createId: () => string
): Partial<ProductSyncProfile> => {
  const input: Partial<ProductSyncProfile> = {
    connectionId: body.connectionId,
    ...buildOptionalProductSyncProfileCreateFields(body),
  };
  if (body.inventoryId !== undefined) input.inventoryId = body.inventoryId;

  const fieldRules = buildProductSyncFieldRuleCreateInput(body.fieldRules, createId);
  if (fieldRules !== undefined) {
    input.fieldRules = fieldRules;
  }

  return input;
};
