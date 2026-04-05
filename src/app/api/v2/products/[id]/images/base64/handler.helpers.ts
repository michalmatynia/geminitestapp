import { z } from 'zod';

import type { ProductImageBase64Response, ProductWithImages } from '@/shared/contracts/products/product';
import { notFoundError, validationError } from '@/shared/errors/app-error';

const paramsSchema = z.object({
  id: z.string().trim().min(1, 'Product id is required'),
});

export const requireProductImageBase64ProductId = (params: { id: string }): string => {
  const parsed = paramsSchema.safeParse(params);
  if (!parsed.success) {
    throw validationError('Invalid route parameters', {
      issues: parsed.error.flatten(),
    });
  }

  return parsed.data.id;
};

export const requireProductImageBase64Product = (
  product: ProductWithImages | null,
  productId: string
): ProductWithImages => {
  if (!product) {
    throw notFoundError('Product not found', { productId });
  }

  return product;
};

export const buildProductImageBase64Response = (
  productId: string,
  imageBase64s: Array<string | null | undefined>
): ProductImageBase64Response => ({
  status: 'ok',
  productId,
  count: imageBase64s.filter(Boolean).length,
});
