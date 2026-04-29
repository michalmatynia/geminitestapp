// buildTriggeredProductEntityJson: constructs a normalized 'entity JSON' payload
// from product, draft, and loose input values. Normalizes image links, catalog
// resolution and builds category context using leaf category hierarchy helpers.
import type { ProductCategory } from '@/shared/contracts/products/categories';
import type { ProductDraft } from '@/shared/contracts/products/drafts';
import type { ProductWithImages } from '@/shared/contracts/products/product';

import { buildNormalizedProductTriggerStatusFields } from './build-triggered-product-entity-json.helpers';
import {
  buildLeafCategoryHierarchyEntries,
  type LeafCategoryHierarchyEntry,
} from './leafCategoryHierarchy';

type TriggerLeafCategory = {
  id: string;
  label: string;
  fullPath: string;
  parentId: string | null;
  catalogId: string;
  isCurrent: boolean;
};

type TriggerCurrentCategory = {
  id: string;
  label: string;
  fullPath: string;
  isLeaf: boolean;
};

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const resolveTriggerString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const resolveCatalogIdFromEntry = (entry: unknown): string => {
  if (typeof entry === 'string') return entry.trim();
  if (!isPlainRecord(entry)) return '';

  const catalogId = resolveTriggerString(entry['catalogId']);
  if (catalogId !== '') return catalogId;

  return resolveTriggerString(entry['id']);
};

const normalizeTriggerCatalogIds = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];

  const unique = new Set<string>();
  value.forEach((entry: unknown) => {
    const normalized = resolveCatalogIdFromEntry(entry);
    if (normalized !== '') unique.add(normalized);
  });
  return Array.from(unique);
};

const normalizeCatalogEntries = (value: unknown): Array<Record<string, unknown>> => {
  if (!Array.isArray(value)) return [];
  return value.filter(isPlainRecord);
};

const resolveTriggerCatalogIds = (entityJson: Record<string, unknown>): string[] => {
  const explicitCatalogIds = normalizeTriggerCatalogIds(entityJson['catalogIds']);
  if (explicitCatalogIds.length > 0) return explicitCatalogIds;

  const catalogIdsFromCatalogs = normalizeTriggerCatalogIds(
    normalizeCatalogEntries(entityJson['catalogs'])
  );
  if (catalogIdsFromCatalogs.length > 0) return catalogIdsFromCatalogs;

  const catalogId = resolveTriggerString(entityJson['catalogId']);
  return catalogId !== '' ? [catalogId] : [];
};

const normalizeImageLinks = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const next = value
    .map((entry: unknown) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter((entry: string) => entry.length > 0);
  return next.length > 0 ? next : [];
};

const buildTriggerCategoryPath = (
  categoryId: string,
  categoryById: Map<string, ProductCategory>
): string => {
  const segments: string[] = [];
  const visited = new Set<string>();
  let currentId: string | null = categoryId;

  while (currentId !== null && currentId !== '' && !visited.has(currentId)) {
    visited.add(currentId);
    const current = categoryById.get(currentId);
    if (current === undefined) break;

    const label = resolveTriggerString(current.name);
    if (label !== '') segments.unshift(label);

    const parentId = resolveTriggerString(current.parentId);
    currentId = parentId !== '' ? parentId : null;
  }

  return segments.join(' > ');
};

const filterTriggerCategories = (
  categories: ProductCategory[],
  catalogIds: string[]
): ProductCategory[] => {
  const catalogFilter = new Set(
    catalogIds.map((catalogId: string) => catalogId.trim()).filter((catalogId) => catalogId !== '')
  );
  return categories.filter(
    (category: ProductCategory) =>
      catalogFilter.size === 0 || catalogFilter.has(resolveTriggerString(category.catalogId))
  );
};

const buildTriggerCategoryById = (
  categories: ProductCategory[]
): Map<string, ProductCategory> => {
  const categoryById = new Map<string, ProductCategory>();
  categories.forEach((category: ProductCategory) => {
    const categoryId = resolveTriggerString(category.id);
    if (categoryId !== '') categoryById.set(categoryId, category);
  });
  return categoryById;
};

const buildTriggerLeafCategories = (
  leafEntries: LeafCategoryHierarchyEntry[],
  categoryById: Map<string, ProductCategory>,
  currentCategoryId: string | null
): TriggerLeafCategory[] =>
  leafEntries.map((entry) => {
    const category = categoryById.get(entry.id);
    const parentId = resolveTriggerString(category?.parentId);
    return {
      id: entry.id,
      label: entry.leafName,
      fullPath: entry.hierarchyPath,
      parentId: parentId !== '' ? parentId : null,
      catalogId: entry.catalogId,
      isCurrent: entry.id === currentCategoryId,
    };
  });

const resolveCurrentCategoryPath = (
  currentCategoryId: string,
  current: ProductCategory,
  leafEntries: LeafCategoryHierarchyEntry[],
  categoryById: Map<string, ProductCategory>
): string => {
  const leafPath = leafEntries.find((entry) => entry.id === currentCategoryId)?.hierarchyPath;
  if (leafPath !== undefined && leafPath !== '') return leafPath;

  const categoryPath = buildTriggerCategoryPath(currentCategoryId, categoryById);
  if (categoryPath !== '') return categoryPath;

  return resolveTriggerString(current.name);
};

const buildCurrentTriggerCategory = ({
  currentCategoryId,
  categoryById,
  leafEntries,
  leafCategories,
}: {
  currentCategoryId: string | null;
  categoryById: Map<string, ProductCategory>;
  leafEntries: LeafCategoryHierarchyEntry[];
  leafCategories: TriggerLeafCategory[];
}): TriggerCurrentCategory | null => {
  if (currentCategoryId === null || currentCategoryId === '') return null;

  const current = categoryById.get(currentCategoryId);
  if (current === undefined) return null;

  return {
    id: current.id,
    label: current.name,
    fullPath: resolveCurrentCategoryPath(currentCategoryId, current, leafEntries, categoryById),
    isLeaf: leafCategories.some((entry) => entry.id === current.id),
  };
};

const resolvePrimaryCatalogId = (
  catalogIds: string[],
  filteredCategories: ProductCategory[]
): string | null => {
  const explicitCatalogId = catalogIds[0];
  if (explicitCatalogId !== undefined) return explicitCatalogId;

  const category = filteredCategories.find(
    (item: ProductCategory) => resolveTriggerString(item.catalogId) !== ''
  );
  return category !== undefined ? resolveTriggerString(category.catalogId) : null;
};

const buildTriggerCategoryContext = (args: {
  categories: ProductCategory[];
  catalogIds: string[];
  currentCategoryId: string | null;
}): Record<string, unknown> | null => {
  const filteredCategories = filterTriggerCategories(args.categories, args.catalogIds);
  if (filteredCategories.length === 0) return null;

  const categoryById = buildTriggerCategoryById(filteredCategories);
  const leafEntries = buildLeafCategoryHierarchyEntries(filteredCategories);
  const leafCategories = buildTriggerLeafCategories(
    leafEntries,
    categoryById,
    args.currentCategoryId
  );

  return {
    collection: 'product_categories',
    catalogId: resolvePrimaryCatalogId(args.catalogIds, filteredCategories),
    currentCategoryId: args.currentCategoryId,
    currentCategory: buildCurrentTriggerCategory({
      currentCategoryId: args.currentCategoryId,
      categoryById,
      leafEntries,
      leafCategories,
    }),
    leafCategories,
    allowedLeafLabels: leafCategories.map((category) => category.label),
    totalCategories: filteredCategories.length,
    totalLeafCategories: leafCategories.length,
    fetchedAt: null,
  };
};

const buildImageLinkFields = (values: Record<string, unknown>): Record<string, unknown> => {
  const imageLinks = normalizeImageLinks(values['imageLinks']);
  if (imageLinks !== undefined) return { imageLinks };
  if (values['imageLinks'] !== undefined) return { imageLinks: [] };
  return {};
};

const buildProductIdFields = (product: ProductWithImages | undefined): Record<string, unknown> => {
  const productId = resolveTriggerString(product?.id);
  return productId !== '' ? { id: productId } : {};
};

const findExistingCatalogEntry = (
  existingCatalogs: Array<Record<string, unknown>>,
  catalogId: string
): Record<string, unknown> | null =>
  existingCatalogs.find((entry) => resolveTriggerString(entry['catalogId']) === catalogId) ?? null;

const buildCatalogEntry = ({
  catalogId,
  existingCatalogs,
  productId,
}: {
  catalogId: string;
  existingCatalogs: Array<Record<string, unknown>>;
  productId: string;
}): Record<string, unknown> => {
  const existing = findExistingCatalogEntry(existingCatalogs, catalogId);
  if (existing !== null) return { ...existing, catalogId };
  return productId !== '' ? { catalogId, productId } : { catalogId };
};

const buildCatalogFields = ({
  catalogIds,
  entityJson,
  product,
}: {
  catalogIds: string[];
  entityJson: Record<string, unknown>;
  product?: ProductWithImages;
}): Record<string, unknown> => {
  if (catalogIds.length === 0) return {};

  const existingCatalogs = normalizeCatalogEntries(entityJson['catalogs']);
  const productId = resolveTriggerString(product?.id);
  return {
    catalogId: catalogIds[0] ?? entityJson['catalogId'],
    catalogs: catalogIds.map((catalogId: string) =>
      buildCatalogEntry({ catalogId, existingCatalogs, productId })
    ),
  };
};

const buildCategoryContextFields = ({
  entityJson,
  categories,
  catalogIds,
}: {
  entityJson: Record<string, unknown>;
  categories: ProductCategory[];
  catalogIds: string[];
}): Record<string, unknown> => {
  const currentCategoryId = resolveTriggerString(entityJson['categoryId']);
  const categoryContext = buildTriggerCategoryContext({
    categories,
    catalogIds,
    currentCategoryId: currentCategoryId !== '' ? currentCategoryId : null,
  });
  return categoryContext !== null ? { categoryContext } : {};
};

export const buildTriggeredProductEntityJson = (args: {
  product?: ProductWithImages;
  draft?: ProductDraft | null;
  values: Record<string, unknown>;
  categories?: ProductCategory[];
}): Record<string, unknown> => {
  const base = args.product ?? args.draft ?? {};
  const initialEntityJson: Record<string, unknown> = {
    ...base,
    ...args.values,
    ...buildImageLinkFields(args.values),
    ...buildProductIdFields(args.product),
  };
  const entityJson = {
    ...initialEntityJson,
    ...buildNormalizedProductTriggerStatusFields(initialEntityJson),
  };
  const catalogIds = resolveTriggerCatalogIds(entityJson);
  const entityJsonWithCatalogs = {
    ...entityJson,
    ...buildCatalogFields({ catalogIds, entityJson, product: args.product }),
  };

  return {
    ...entityJsonWithCatalogs,
    ...buildCategoryContextFields({
      entityJson: entityJsonWithCatalogs,
      categories: args.categories ?? [],
      catalogIds,
    }),
  };
};
