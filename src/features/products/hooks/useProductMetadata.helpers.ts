import type { CatalogRecord } from '@/shared/contracts/products/catalogs';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import {
  DEFAULT_PRODUCT_CATEGORY_TREE_CATALOG_ID,
  resolveDefaultProductCategoryTreeCatalogId,
} from '@/shared/lib/products/default-category-tree';

export const CATALOG_ID_KEY_SEPARATOR = '\u001f';

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

export const toTrimmedString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

export const arraysEqual = (a: string[], b: string[]): boolean =>
  a.length === b.length && a.every((value: string, index: number) => value === b[index]);

export const normalizeSelectionIds = (values: ReadonlyArray<unknown>): string[] => {
  const unique = new Set<string>();
  for (const value of values) {
    const normalizedValue = toTrimmedString(value);
    if (normalizedValue.length === 0) continue;
    unique.add(normalizedValue);
  }
  return Array.from(unique);
};

const firstNonEmptyText = (values: string[]): string => {
  for (const value of values) {
    if (value.length > 0) return value;
  }
  return '';
};

const resolveDirectCatalogId = (record: Record<string, unknown>): string =>
  firstNonEmptyText([
    toTrimmedString(record['catalogId']),
    toTrimmedString(record['catalog_id']),
    toTrimmedString(record['id']),
    toTrimmedString(record['value']),
  ]);

const resolveNestedCatalogId = (record: Record<string, unknown>): string => {
  const nestedCatalog = record['catalog'];
  if (!isObjectRecord(nestedCatalog)) return '';
  return firstNonEmptyText([
    toTrimmedString(nestedCatalog['id']),
    toTrimmedString(nestedCatalog['catalogId']),
    toTrimmedString(nestedCatalog['catalog_id']),
  ]);
};

const resolveCatalogId = (value: unknown): string => {
  if (typeof value === 'string') return toTrimmedString(value);
  if (!isObjectRecord(value)) return '';
  const direct = resolveDirectCatalogId(value);
  return direct.length > 0 ? direct : resolveNestedCatalogId(value);
};

export const normalizeCatalogIdList = (values: ReadonlyArray<unknown>): string[] => {
  const unique = new Set<string>();
  for (const value of values) {
    const trimmed = resolveCatalogId(value);
    if (trimmed.length === 0) continue;
    unique.add(trimmed);
  }
  return Array.from(unique);
};

export const createCatalogIdsKey = (values: string[] | undefined): string =>
  normalizeCatalogIdList(values ?? []).join(CATALOG_ID_KEY_SEPARATOR);

export const resolveCategoryIdFromProduct = (
  product: ProductWithImages | undefined
): string | null => {
  if (product === undefined) return null;
  const direct = toTrimmedString(product.categoryId);
  return direct.length > 0 ? direct : null;
};

export const normalizeCategoryId = (categoryId: string | null): string | null => {
  const trimmed = toTrimmedString(categoryId);
  return trimmed.length > 0 ? trimmed : null;
};

export const getQueryDataArray = <T,>(data: T[] | undefined): T[] => data ?? [];

export const getPrimaryCatalogId = (catalogIds: string[]): string => catalogIds[0] ?? '';

export const resolveCategoryTreeCatalogIds = (
  catalogs: CatalogRecord[],
  catalogsLoading: boolean
): string[] => {
  const catalogId =
    resolveDefaultProductCategoryTreeCatalogId(catalogs) ??
    (catalogsLoading ? null : DEFAULT_PRODUCT_CATEGORY_TREE_CATALOG_ID);
  return catalogId !== null ? [catalogId] : [];
};

export const isAnyMetadataLoading = (values: boolean[]): boolean => values.includes(true);
