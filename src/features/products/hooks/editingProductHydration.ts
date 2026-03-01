import type { ProductWithImages } from '@/shared/contracts/products';

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

