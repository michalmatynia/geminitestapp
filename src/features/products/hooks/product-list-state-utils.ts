// product-list-state-utils: shared, pure helpers and constants used by the
// product list UI. This module centralizes:
// - time constants and UI timing values used for transient row highlights
// - canonical sets for listing 'in-flight' and 'completed' statuses used to
//   detect transitions and provide visual feedback
// - lightweight normalization and parsing helpers (strings, records, dates)
// - category and catalog resolution helpers used to derive display labels and
//   stable ids across denormalized product payloads
//
// Keep this module side-effect free and cheap to import from client code.
import type { ProductCategory } from '@/shared/contracts/products/categories';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import {
  resolveCatalogRelationIdValue,
  resolveCategoryDisplayLabel,
  resolveCategoryRecordIdValue,
  resolveCategoryRecordLabel,
} from './product-list-state-utils.helpers';

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
  if (value === null || value === undefined || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
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

  if (incomingUpdatedAt === null) return false;
  if (currentUpdatedAt === null) return true;
  return incomingUpdatedAt > currentUpdatedAt;
};

export const isIncomingProductDetailSameRevision = (
  incoming: ProductWithImages,
  current: ProductWithImages
): boolean => {
  const incomingUpdatedAt = toMillis(incoming.updatedAt);
  const currentUpdatedAt = toMillis(current.updatedAt);

  if (incomingUpdatedAt === null || currentUpdatedAt === null) return false;
  return incomingUpdatedAt === currentUpdatedAt;
};

const resolveComparableLocalizedText = (
  product: ProductWithImages,
  prefix: 'name' | 'description',
  locale: 'en' | 'pl' | 'de'
): string => {
  const directValue = toTrimmedString(
    (product as Record<string, unknown>)[`${prefix}_${locale}`]
  );
  if (directValue) return directValue;

  const localizedRecord = toRecord((product as Record<string, unknown>)[prefix]);
  return toTrimmedString(localizedRecord?.[locale]);
};

export const hasIncomingProductDetailGeneratedTextChanges = (
  incoming: ProductWithImages,
  current: ProductWithImages
): boolean => {
  const locales: Array<'en' | 'pl' | 'de'> = ['en', 'pl', 'de'];

  return locales.some((locale) => {
    return (
      resolveComparableLocalizedText(incoming, 'name', locale) !==
        resolveComparableLocalizedText(current, 'name', locale) ||
      resolveComparableLocalizedText(incoming, 'description', locale) !==
        resolveComparableLocalizedText(current, 'description', locale)
    );
  });
};

export const resolveCategoryLabelByLocale = (
  category: ProductCategory | Record<string, unknown>,
  locale: 'name_en' | 'name_pl' | 'name_de'
): string => {
  const record = toRecord(category) ?? {};
  return resolveCategoryRecordLabel(record, locale);
};

export const resolveCategoryRecordId = (
  category: ProductCategory | Record<string, unknown>
): string => {
  const record = toRecord(category) ?? {};
  return resolveCategoryRecordIdValue(record);
};

const resolveProductCategoryRecord = (product: ProductWithImages): Record<string, unknown> | null => {
  const record = toRecord(product);
  if (!record) return null;
  return toRecord(record['category']);
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

  return resolveCategoryDisplayLabel(
    normalizedCategoryId,
    categoryNameById,
    OPAQUE_CATEGORY_ID_PATTERN
  );
};

export const resolveProductCategoryId = (product: ProductWithImages): string => {
  const direct = toTrimmedString(product.categoryId);
  if (direct) return direct;

  const categoryRecord = resolveProductCategoryRecord(product);
  if (!categoryRecord) return '';

  return resolveCategoryRecordIdValue(categoryRecord);
};

export const resolveProductCatalogId = (product: ProductWithImages): string => {
  const catalogs = product.catalogs;
  if (Array.isArray(catalogs)) {
    const first = catalogs[0] as Record<string, unknown> | undefined;
    const relationCatalogId = resolveCatalogRelationIdValue(first);
    if (relationCatalogId) {
      return relationCatalogId;
    }
  }

  const direct = toTrimmedString(product.catalogId);
  if (direct) return direct;

  const categoryRecord = resolveProductCategoryRecord(product);
  const categoryCatalogId = toTrimmedString(categoryRecord?.['catalogId']);
  if (categoryCatalogId) return categoryCatalogId;

  return '';
};
