import type { ProductCategory } from '@/shared/contracts/products/categories';

export type LeafCategoryHierarchyEntry = {
  id: string;
  catalogId: string;
  leafName: string;
  hierarchyPath: string;
  pathSegments: string[];
};

const normalizeCategorySegment = (value: string): string => value.trim().replace(/\s+/g, ' ');

const resolveCategoryId = (value: string | null | undefined): string =>
  typeof value === 'string' ? value.trim() : '';

const resolveCategoryPathSegments = (
  category: ProductCategory,
  categoryById: Map<string, ProductCategory>
): string[] => {
  const segments: string[] = [];
  const visitedIds = new Set<string>();

  let current: ProductCategory | undefined = category;
  while (current) {
    const currentId = resolveCategoryId(current.id);
    if (!currentId || visitedIds.has(currentId)) break;
    visitedIds.add(currentId);

    const label = normalizeCategorySegment(current.name);
    if (label) {
      segments.unshift(label);
    }

    const parentId = resolveCategoryId(current.parentId);
    current = parentId ? categoryById.get(parentId) : undefined;
  }

  if (segments.length > 0) {
    return segments;
  }

  const fallbackLabel = normalizeCategorySegment(category.name);
  return fallbackLabel ? [fallbackLabel] : [];
};

export const buildLeafCategoryHierarchyEntries = (
  categories: ProductCategory[]
): LeafCategoryHierarchyEntry[] => {
  const categoryById = new Map<string, ProductCategory>();
  const parentIds = new Set<string>();

  categories.forEach((category) => {
    const categoryId = resolveCategoryId(category.id);
    if (!categoryId) return;
    categoryById.set(categoryId, category);

    const parentId = resolveCategoryId(category.parentId);
    if (parentId) {
      parentIds.add(parentId);
    }
  });

  return categories
    .filter((category) => {
      const categoryId = resolveCategoryId(category.id);
      return Boolean(categoryId) && !parentIds.has(categoryId);
    })
    .map((category) => {
      const pathSegments = resolveCategoryPathSegments(category, categoryById);
      const leafName =
        pathSegments[pathSegments.length - 1] ?? normalizeCategorySegment(category.name);
      return {
        id: category.id,
        catalogId: category.catalogId,
        leafName,
        hierarchyPath: pathSegments.join(' > '),
        pathSegments,
      };
    })
    .sort((left, right) => {
      const hierarchyOrder = left.hierarchyPath.localeCompare(right.hierarchyPath, undefined, {
        sensitivity: 'base',
      });
      if (hierarchyOrder !== 0) return hierarchyOrder;
      return left.id.localeCompare(right.id);
    });
};
