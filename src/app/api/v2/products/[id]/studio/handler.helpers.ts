import { z } from 'zod';

import { productStudioConfigResponseSchema } from '@/shared/contracts/products/studio';
import { type ProductStudioConfig } from '@/shared/contracts/products';
import { badRequestError } from '@/shared/errors/app-error';

const putSchema = z.object({
  projectId: z.string().trim().nullable().optional(),
});

export type ProductStudioPutPayload = z.infer<typeof putSchema>;

export const requireProductStudioProductId = (params: { id: string }): string => {
  const productId = params.id.trim();
  if (!productId) {
    throw badRequestError('Product id is required.');
  }
  return productId;
};

export const buildEmptyProductStudioConfigResponse = (
  updatedAt: string = new Date().toISOString()
): z.infer<typeof productStudioConfigResponseSchema> =>
  productStudioConfigResponseSchema.parse({
    config: {
      projectId: null,
      sourceSlotByImageIndex: {},
      sourceSlotHistoryByImageIndex: {},
      updatedAt,
    },
  });

export const parseProductStudioPutPayload = (body: unknown): ProductStudioPutPayload => {
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) {
    throw badRequestError('Invalid payload.', { errors: parsed.error.format() });
  }
  return parsed.data;
};

export const buildProductStudioPutInput = (
  payload: ProductStudioPutPayload
): { projectId?: string | null } => ({
  ...(payload.projectId !== undefined ? { projectId: payload.projectId } : {}),
});

export const buildProductStudioConfigResponse = (config: ProductStudioConfig) =>
  productStudioConfigResponseSchema.parse({ config });
