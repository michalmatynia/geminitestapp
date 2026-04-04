import { z } from 'zod';

import type {
  ProductSyncDeleteResponse,
  ProductSyncProfile,
  ProductSyncProfileUpdatePayload,
} from '@/shared/contracts/product-sync';
import { notFoundError, validationError } from '@/shared/errors/app-error';

const paramsSchema = z.object({
  id: z.string().trim().min(1, 'Sync profile id is required'),
});

export const requireProductSyncProfileId = (params: { id: string }): string => {
  const parsed = paramsSchema.safeParse(params);
  if (!parsed.success) {
    throw validationError('Invalid route parameters', {
      issues: parsed.error.flatten(),
    });
  }
  return parsed.data.id;
};

export const buildProductSyncProfilePatch = (
  body: ProductSyncProfileUpdatePayload,
  createId: () => string
): Partial<ProductSyncProfile> => ({
  ...(body.name !== undefined ? { name: body.name } : {}),
  ...(body.enabled !== undefined ? { enabled: body.enabled } : {}),
  ...(body.connectionId !== undefined ? { connectionId: body.connectionId } : {}),
  ...(body.inventoryId !== undefined ? { inventoryId: body.inventoryId } : {}),
  ...(body.catalogId !== undefined ? { catalogId: body.catalogId } : {}),
  ...(body.scheduleIntervalMinutes !== undefined
    ? { scheduleIntervalMinutes: body.scheduleIntervalMinutes }
    : {}),
  ...(body.batchSize !== undefined ? { batchSize: body.batchSize } : {}),
  ...(body.conflictPolicy !== undefined ? { conflictPolicy: body.conflictPolicy } : {}),
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
});

export const requireExistingProductSyncProfile = <TProfile>(
  profile: TProfile | null,
  profileId: string
): TProfile => {
  if (!profile) {
    throw notFoundError('Sync profile not found.', { profileId });
  }

  return profile;
};

export const buildProductSyncProfileDeleteResponse = (): ProductSyncDeleteResponse => ({
  ok: true,
});
