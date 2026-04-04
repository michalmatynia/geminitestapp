import type { ProductWithImages } from '@/shared/contracts/products';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';

export const requireDuplicateProductId = (params: { id: string }): string => {
  const productId = params.id.trim();
  if (!productId) {
    throw badRequestError('Product id is required');
  }

  return productId;
};

export const resolveDuplicateProductSku = (sku?: string): string => sku ?? '';

export const buildDuplicateProductOptions = (
  userId: string | null | undefined
): {
  userId: string;
} | undefined => (userId ? { userId } : undefined);

export const requireDuplicatedProduct = (
  product: ProductWithImages | null,
  productId: string
): ProductWithImages => {
  if (!product) {
    throw notFoundError('Product not found', { productId });
  }

  return product;
};
