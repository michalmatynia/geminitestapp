import type { ProductCategory, ProductWithImages } from '@/shared/contracts/products';

export const EDIT_PRODUCT_DETAIL_STALE_TIME_MS = 30_000;
export const PRODUCT_ROW_HIGHLIGHT_DURATION_MS = 900;
export const PRODUCT_ROW_HIGHLIGHT_REPEAT_COUNT = 2;
export const PRODUCT_ROW_HIGHLIGHT_TOTAL_MS =
  PRODUCT_ROW_HIGHLIGHT_DURATION_MS * PRODUCT_ROW_HIGHLIGHT_REPEAT_COUNT;

export const LISTING_IN_FLIGHT_STATUSES = new Set([
  'queued',
  'queued_relist',
  'pending',
  'running',
  'processing',
  'in_progress',
]);

export const LISTING_COMPLETED_STATUSES = new Set([
  'active',
  'success',
  'completed',
  'listed',
  'ok',
  'failed',
  'error',
  'needs_login',
  'auth_required',
]);

const toTrimmedString = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const toMillis = (value: unknown): number | null => {
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isNaN(time) ? null : time;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Date.parse(trimmed);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
};

export const normalizeListingStatus = (status: string | undefined): string =>
  (status ?? '').trim().toLowerCase();

export const isIncomingProductDetailNewer = (
  incoming: ProductWithImages,
  current: ProductWithImages
): boolean => {
  const incomingUpdatedAt = toMillis(incoming.updatedAt);
  const currentUpdatedAt = toMillis(current.updatedAt);

  if (incomingUpdatedAt == null) return false;
  if (currentUpdatedAt == null) return true;
  return incomingUpdatedAt > currentUpdatedAt;
};

export const resolveCategoryLabelByLocale = (
  category: ProductCategory,
  locale: 'name_en' | 'name_pl' | 'name_de'
): string => {
  const localizedName = toTrimmedString(category[locale]);
  if (localizedName) return localizedName;

  return (
    toTrimmedString(category.name_en) ||
    toTrimmedString(category.name) ||
    toTrimmedString(category.name_pl) ||
    toTrimmedString(category.name_de)
  );
};

export const resolveProductCategoryId = (product: ProductWithImages): string => {
  const direct = toTrimmedString(product.categoryId);
  if (direct) return direct;

  const categories = (product as any).categories;
  if (!categories) return '';

  if (Array.isArray(categories)) {
    const first = categories[0];
    if (!first) return '';
    return toTrimmedString(first.categoryId || first.category_id || first.id || first.value);
  }
  
  if (typeof categories === 'object') {
    return toTrimmedString(categories.categoryId || categories.category_id || categories.id || categories.value);
  }

  return '';
};

export const resolveProductCatalogId = (product: ProductWithImages): string => {
  const direct = toTrimmedString(product.catalogId);
  if (direct) return direct;

  const catalogs = product.catalogs;
  if (!Array.isArray(catalogs)) return '';
  
  const first = catalogs[0] as any;
  if (!first) return '';

  return toTrimmedString(first.catalogId || first.catalog?.id || first.id);
};
