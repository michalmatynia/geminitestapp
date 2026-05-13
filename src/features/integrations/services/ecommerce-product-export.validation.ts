import type { ProductWithImages } from '@/shared/contracts/products/product';
import { validationError } from '@/shared/errors/app-error';

const MISSING_ECOMMERCE_CATEGORY_REASON = 'missing_ecommerce_category';

const hasText = (value: string | null | undefined): boolean =>
  typeof value === 'string' && value.trim().length > 0;

const hasExportableCategory = (product: ProductWithImages): boolean => {
  if (product.categoryId === null || product.category === undefined) return false;
  return (
    hasText(product.category.name_en) ||
    hasText(product.category.name_pl) ||
    hasText(product.category.name_de) ||
    hasText(product.category.name)
  );
};

export const assertProductHasExportableCategory = (product: ProductWithImages): void => {
  if (hasExportableCategory(product)) return;
  throw validationError('Category is missing. Assign a product category before exporting to ecommerce.', {
    reason: MISSING_ECOMMERCE_CATEGORY_REASON,
    productId: product.id,
    sku: product.sku,
    categoryId: product.categoryId,
  });
};
