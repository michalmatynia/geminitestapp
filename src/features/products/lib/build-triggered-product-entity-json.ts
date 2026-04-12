import type { ProductDraft } from '@/shared/contracts/products/drafts';
import type { ProductCategory } from '@/shared/contracts/products/categories';
import type { ProductWithImages } from '@/shared/contracts/products/product';

import { buildLeafCategoryHierarchyEntries } from './leafCategoryHierarchy';
import { normalizeProductTriggerStatus } from './build-triggered-product-entity-json.helpers';

const normalizeTriggerCatalogIds = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const unique = new Set<string>();
  value.forEach((entry: unknown) => {
    const normalized =
      typeof entry === 'string'
        ? entry.trim()
        : entry && typeof entry === 'object'
          ? (typeof (entry as { catalogId?: unknown }).catalogId === 'string'
              ? (entry as { catalogId: string }).catalogId.trim()
              : typeof (entry as { id?: unknown }).id === 'string'
                ? (entry as { id: string }).id.trim()
                : '')
          : '';
    if (normalized) unique.add(normalized);
  });
  return Array.from(unique);
};

const normalizeCatalogEntries = (value: unknown): Array<Record<string, unknown>> => {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (entry: unknown): entry is Record<string, unknown> =>
      Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry)
  );
};

const resolveTriggerCatalogIds = (entityJson: Record<string, unknown>): string[] => {
  const explicitCatalogIds = normalizeTriggerCatalogIds(entityJson['catalogIds']);
  if (explicitCatalogIds.length > 0) {
    return explicitCatalogIds;
  }

  const catalogs = normalizeCatalogEntries(entityJson['catalogs']);
  const catalogIdsFromCatalogs = normalizeTriggerCatalogIds(catalogs);
  if (catalogIdsFromCatalogs.length > 0) {
    return catalogIdsFromCatalogs;
  }

  if (typeof entityJson['catalogId'] === 'string' && entityJson['catalogId'].trim().length > 0) {
    return [entityJson['catalogId'].trim()];
  }

  return [];
};

const resolveTriggerString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

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

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const current = categoryById.get(currentId);
    if (!current) break;

    const label = resolveTriggerString(current.name);
    if (label) {
      segments.unshift(label);
    }

    currentId = resolveTriggerString(current.parentId) || null;
  }

  return segments.join(' > ');
};

const buildTriggerCategoryContext = (args: {
  categories: ProductCategory[];
  catalogIds: string[];
  currentCategoryId: string | null;
}): Record<string, unknown> | null => {
  if (args.categories.length === 0) {
    return null;
  }

  const catalogFilter = new Set(
    args.catalogIds.map((catalogId: string) => catalogId.trim()).filter(Boolean)
  );
  const filteredCategories = args.categories.filter(
    (category: ProductCategory) =>
      catalogFilter.size === 0 || catalogFilter.has(resolveTriggerString(category.catalogId))
  );
  if (filteredCategories.length === 0) {
    return null;
  }

  const categoryById = new Map<string, ProductCategory>();
  filteredCategories.forEach((category: ProductCategory) => {
    const categoryId = resolveTriggerString(category.id);
    if (!categoryId) return;
    categoryById.set(categoryId, category);
  });
  const leafEntries = buildLeafCategoryHierarchyEntries(filteredCategories);

  const leafCategories = leafEntries.map((entry) => {
    const category = categoryById.get(entry.id) ?? null;
    return {
      id: entry.id,
      label: entry.leafName,
      fullPath: entry.hierarchyPath,
      parentId: category?.parentId ?? null,
      catalogId: entry.catalogId,
      isCurrent: entry.id === args.currentCategoryId,
    };
  });

  const currentCategory =
    args.currentCategoryId && categoryById.has(args.currentCategoryId)
      ? (() => {
          const current = categoryById.get(args.currentCategoryId)!;
          const currentPath =
            leafEntries.find((entry) => entry.id === args.currentCategoryId)?.hierarchyPath ??
            buildTriggerCategoryPath(args.currentCategoryId, categoryById) ??
            current.name;
          return {
            id: current.id,
            label: current.name,
            fullPath: currentPath,
            isLeaf: leafCategories.some((entry) => entry.id === current.id),
          };
        })()
      : null;

  const primaryCatalogId =
    args.catalogIds[0] ??
    filteredCategories.find((category: ProductCategory) => resolveTriggerString(category.catalogId))?.catalogId ??
    null;

  return {
    collection: 'product_categories',
    catalogId: primaryCatalogId,
    currentCategoryId: args.currentCategoryId,
    currentCategory,
    leafCategories,
    allowedLeafLabels: leafCategories.map((category) => category.label),
    totalCategories: filteredCategories.length,
    totalLeafCategories: leafCategories.length,
    fetchedAt: null,
  };
};

export const buildTriggeredProductEntityJson = (args: {
  product?: ProductWithImages;
  draft?: ProductDraft | null;
  values: Record<string, unknown>;
  categories?: ProductCategory[];
}): Record<string, unknown> => {
  const base = args.product ?? args.draft ?? {};
  const imageLinks = normalizeImageLinks(args.values['imageLinks']);
  const entityJson: Record<string, unknown> = { ...base, ...args.values };
  if (imageLinks !== undefined) {
    entityJson['imageLinks'] = imageLinks;
  } else if (args.values['imageLinks'] !== undefined) {
    entityJson['imageLinks'] = [];
  }
  if (args.product?.id) {
    entityJson['id'] = args.product.id;
  }

  normalizeProductTriggerStatus(entityJson);

  const catalogIds = resolveTriggerCatalogIds(entityJson);
  if (catalogIds.length === 0) {
    const categoryContext = buildTriggerCategoryContext({
      categories: args.categories ?? [],
      catalogIds,
      currentCategoryId: resolveTriggerString(entityJson['categoryId']) || null,
    });
    if (categoryContext) {
      entityJson['categoryContext'] = categoryContext;
    }
    return entityJson;
  }

  const existingCatalogs = normalizeCatalogEntries(entityJson['catalogs']);
  entityJson['catalogId'] = catalogIds[0] ?? entityJson['catalogId'];
  entityJson['catalogs'] = catalogIds.map((catalogId: string) => {
    const existing =
      existingCatalogs.find(
        (entry: unknown) =>
          entry &&
          typeof entry === 'object' &&
          typeof (entry as { catalogId?: unknown }).catalogId === 'string' &&
          (entry as { catalogId: string }).catalogId.trim() === catalogId
      ) ?? null;
    if (existing && typeof existing === 'object') {
      return {
        ...existing,
        catalogId,
      };
    }
    return {
      catalogId,
      ...(args.product?.id ? { productId: args.product.id } : {}),
    };
  });

  const categoryContext = buildTriggerCategoryContext({
    categories: args.categories ?? [],
    catalogIds,
    currentCategoryId: resolveTriggerString(entityJson['categoryId']) || null,
  });
  if (categoryContext) {
    entityJson['categoryContext'] = categoryContext;
  }

  return entityJson;
};
