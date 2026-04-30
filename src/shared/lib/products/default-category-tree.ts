import type { CatalogRecord } from '@/shared/contracts/products/catalogs';

export const DEFAULT_PRODUCT_CATEGORY_TREE_CATALOG_NAME = 'Mentios';
export const DEFAULT_PRODUCT_CATEGORY_TREE_CATALOG_ID = 'catalog-mentios';

type CategoryTreeCatalogCandidate = Pick<CatalogRecord, 'id' | 'name'>;

const normalizeString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

export const resolveDefaultProductCategoryTreeCatalogId = (
  catalogs: readonly CategoryTreeCatalogCandidate[]
): string | null => {
  const catalogByName = catalogs.find(
    (catalog) =>
      normalizeString(catalog.name).toLowerCase() ===
      DEFAULT_PRODUCT_CATEGORY_TREE_CATALOG_NAME.toLowerCase()
  );
  const catalogById =
    catalogByName ??
    catalogs.find(
      (catalog) =>
        normalizeString(catalog.id).toLowerCase() ===
        DEFAULT_PRODUCT_CATEGORY_TREE_CATALOG_ID.toLowerCase()
    );
  const catalogId = normalizeString(catalogById?.id);
  return catalogId.length > 0 ? catalogId : null;
};
