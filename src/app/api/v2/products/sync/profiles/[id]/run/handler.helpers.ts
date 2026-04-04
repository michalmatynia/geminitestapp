import { z } from 'zod';

import { validationError } from '@/shared/errors/app-error';
import type { ProductSyncRunTrigger } from '@/shared/contracts/product-sync';

const paramsSchema = z.object({
  id: z.string().trim().min(1, 'Sync profile id is required'),
});

export const requireProductSyncRunProfileId = (params: { id: string }): string => {
  const parsed = paramsSchema.safeParse(params);
  if (!parsed.success) {
    throw validationError('Invalid route parameters', {
      issues: parsed.error.flatten(),
    });
  }

  return parsed.data.id;
};

export const buildManualProductSyncRunInput = (
  profileId: string
): {
  profileId: string;
  trigger: ProductSyncRunTrigger;
} => ({
  profileId,
  trigger: 'manual',
});
