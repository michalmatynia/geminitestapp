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

const toRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

const OPAQUE_CATEGORY_ID_PATTERN =
  /^(?:[a-f0-9]{24}|[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i;

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
  category: ProductCategory | Record<string, unknown>,
  locale: 'name_en' | 'name_pl' | 'name_de'
): string => {
  const record = toRecord(category) ?? {};
  const localizedName = toTrimmedString(record[locale]);
  if (localizedName) return localizedName;

  return (
    toTrimmedString(record['name_en']) ||
    toTrimmedString(record['name']) ||
    toTrimmedString(record['name_pl']) ||
    toTrimmedString(record['name_de'])
  );
};

export const resolveCategoryRecordId = (
  category: ProductCategory | Record<string, unknown>
): string => {
  const record = toRecord(category) ?? {};
  return (
    toTrimmedString(record['id']) ||
    toTrimmedString(record['_id']) ||
    toTrimmedString(record['categoryId'])
  );
};

export const buildCategoryNameById = (
  grouped: Record<string, Array<ProductCategory | Record<string, unknown>> | undefined>,
  locale: 'name_en' | 'name_pl' | 'name_de'
): Map<string, string> => {
  const map = new Map<string, string>();
  for (const categories of Object.values(grouped)) {
    if (!Array.isArray(categories)) continue;
    for (const category of categories) {
      const categoryId = resolveCategoryRecordId(category);
      if (!categoryId || map.has(categoryId)) continue;
      const label = resolveCategoryLabelByLocale(category, locale);
      if (!label) continue;
      map.set(categoryId, label);
    }
  }
  return map;
};

export const resolveProductCategoryDisplayLabel = (
  categoryId: string | null | undefined,
  categoryNameById: ReadonlyMap<string, string>
): string => {
  const normalizedCategoryId = toTrimmedString(categoryId);
  if (!normalizedCategoryId) return 'Unassigned';

  const label = toTrimmedString(categoryNameById.get(normalizedCategoryId));
  if (label) return label;

  return OPAQUE_CATEGORY_ID_PATTERN.test(normalizedCategoryId) ? '—' : normalizedCategoryId;
};

export const resolveProductCategoryId = (product: ProductWithImages): string => {
  const direct = toTrimmedString(product.categoryId);
  if (direct) return direct;
  return '';
};

export const resolveProductCatalogId = (product: ProductWithImages): string => {
  const direct = toTrimmedString(product.catalogId);
  if (direct) return direct;

  const catalogs = product.catalogs;
  if (!Array.isArray(catalogs)) return '';

  const first = catalogs[0] as Record<string, unknown> | undefined;
  if (!first) return '';

  return toTrimmedString(
    (first['catalogId'] as string | undefined) ||
      ((first['catalog'] as Record<string, unknown> | undefined)?.['id'] as string | undefined) ||
      (first['id'] as string | undefined)
  );
};
