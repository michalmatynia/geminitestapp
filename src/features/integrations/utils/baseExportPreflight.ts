const normalizeCategoryId = (value: string | null | undefined): string => value?.trim() || '';

export const BASE_EXPORT_MISSING_CATEGORY_MESSAGE =
  'Product has no internal category assigned. Assign a category before exporting with category mapping.';

export const getBaseExportPreflightError = (
  categoryId: string | null | undefined
): string | null => (normalizeCategoryId(categoryId) ? null : BASE_EXPORT_MISSING_CATEGORY_MESSAGE);
