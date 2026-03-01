import type { ProductWithImages } from '@/shared/contracts/products';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

const EDIT_PRODUCT_HYDRATED_FLAG = '__editProductHydrated';

type HydratedProductWithImages = ProductWithImages & {
  [EDIT_PRODUCT_HYDRATED_FLAG]?: true;
};

export const markEditingProductHydrated = (product: ProductWithImages): ProductWithImages => {
  const next = { ...product } as HydratedProductWithImages;
  Object.defineProperty(next, EDIT_PRODUCT_HYDRATED_FLAG, {
    value: true,
    enumerable: false,
    configurable: true,
  });
  return next;
};

export const isEditingProductHydrated = (
  product: ProductWithImages | null | undefined
): boolean => {
  if (!product) return false;
  return Boolean((product as HydratedProductWithImages)[EDIT_PRODUCT_HYDRATED_FLAG]);
};

/**
 * Logs a structured client error when a non-hydrated product is passed to
 * the edit provider. Call from guards only — not from render paths.
 */
export const warnNonHydratedEditProduct = (product: ProductWithImages): void => {
  logClientError(
    new Error('[ProductForm] Non-hydrated product passed to edit provider'),
    {
      context: {
        service: 'products',
        category: 'hydration-guard',
        productId: product.id,
        catalogId: typeof product.catalogId === 'string' ? product.catalogId : '',
        catalogsLength: Array.isArray(product.catalogs) ? product.catalogs.length : -1,
      },
    }
  );
};

