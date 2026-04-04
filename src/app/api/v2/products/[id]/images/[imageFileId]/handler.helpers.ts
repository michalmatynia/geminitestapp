import { z } from 'zod';

import { validationError } from '@/shared/errors/app-error';

const paramsSchema = z.object({
  id: z.string().trim().min(1, 'Product id is required'),
  imageFileId: z.string().trim().min(1, 'Image file id is required'),
});

export const requireProductImageDeleteParams = (params: {
  id: string;
  imageFileId: string;
}): {
  productId: string;
  imageFileId: string;
} => {
  const parsed = paramsSchema.safeParse(params);
  if (!parsed.success) {
    throw validationError('Invalid route parameters', {
      issues: parsed.error.flatten(),
    });
  }

  return {
    productId: parsed.data.id,
    imageFileId: parsed.data.imageFileId,
  };
};

export const buildProductImageDeleteResponse = (): Response => new Response(null, { status: 204 });
