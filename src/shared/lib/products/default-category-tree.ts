import type { CatalogRecord } from '@/shared/contracts/products/catalogs';

export const DEFAULT_PRODUCT_CATEGORY_TREE_CATALOG_NAME = 'Mentios';
export const DEFAULT_PRODUCT_CATEGORY_TREE_CATALOG_ID = 'catalog-mentios';

type CategoryTreeCatalogCandidate = Pick<CatalogRecord, 'id' | 'name'>;

const isCatalogCandidate = (value: unknown): value is CategoryTreeCatalogCandidate =>
  value !== null &&
  typeof value === 'object' &&
  typeof (value as { id?: unknown }).id === 'string' &&
  typeof (value as { name?: unknown }).name === 'string';

const normalizeString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

export const resolveDefaultProductCategoryTreeCatalogId = (
  catalogs: unknown
): string | null => {
  const candidates = Array.isArray(catalogs) ? catalogs.filter(isCatalogCandidate) : [];
  const catalogByName = candidates.find(
    (catalog) =>
      normalizeString(catalog.name).toLowerCase() ===
      DEFAULT_PRODUCT_CATEGORY_TREE_CATALOG_NAME.toLowerCase()
  );
  const catalogById =
    catalogByName ??
    candidates.find(
      (catalog) =>
        normalizeString(catalog.id).toLowerCase() ===
        DEFAULT_PRODUCT_CATEGORY_TREE_CATALOG_ID.toLowerCase()
    );
  const catalogId = normalizeString(catalogById?.id);
  return catalogId.length > 0 ? catalogId : null;
};
