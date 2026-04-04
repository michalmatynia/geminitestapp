import type { ProductCategory, ProductCategoryUpdateInput } from '@/shared/contracts/products';
import { badRequestError, conflictError } from '@/shared/errors/app-error';

type ProductCategorySnapshot = Pick<ProductCategory, 'id' | 'name' | 'parentId' | 'catalogId'>;

export type ResolvedCategoryPlacement = {
  nextCatalogId: string;
  nextParentId: string | null;
  currentParentId: string | null;
  placementChanged: boolean;
};

export type CategoryNameLookupInput = {
  catalogId: string;
  name: string;
  parentId: string | null;
};

export const normalizeCategoryUpdateName = (
  data: ProductCategoryUpdateInput
): string | undefined => {
  if (data.name === undefined) return undefined;

  const normalized = data.name.trim();
  if (!normalized) {
    throw badRequestError('Category name is required');
  }

  return normalized;
};

export const resolveCategoryPlacement = (
  current: ProductCategorySnapshot,
  data: ProductCategoryUpdateInput
): ResolvedCategoryPlacement => {
  const nextCatalogId = data.catalogId ?? current.catalogId;
  const nextParentId =
    data.parentId !== undefined
      ? data.parentId
      : data.catalogId && data.catalogId !== current.catalogId
        ? null
        : (current.parentId ?? null);
  const currentParentId = current.parentId ?? null;

  return {
    nextCatalogId,
    nextParentId,
    currentParentId,
    placementChanged:
      nextCatalogId !== current.catalogId || nextParentId !== currentParentId,
  };
};

export const assertCategoryMoveTarget = (
  categoryId: string,
  nextParentId: string | null
): void => {
  if (nextParentId !== categoryId) return;

  throw badRequestError('Cannot move category into itself');
};

export const shouldCheckCategoryDescendantMove = (
  current: ProductCategorySnapshot,
  data: ProductCategoryUpdateInput,
  nextParentId: string | null
): boolean =>
  nextParentId !== null && (data.catalogId === undefined || data.catalogId === current.catalogId);

export const buildCategoryNameLookupInput = (
  current: ProductCategorySnapshot,
  normalizedName: string | undefined,
  placement: ResolvedCategoryPlacement
): CategoryNameLookupInput | null => {
  if (normalizedName === undefined && !placement.placementChanged) return null;

  return {
    catalogId: placement.nextCatalogId,
    name: normalizedName ?? current.name,
    parentId: placement.nextParentId,
  };
};

export const assertAvailableCategoryName = (
  existing: Pick<ProductCategory, 'id'> | null,
  categoryId: string,
  lookup: CategoryNameLookupInput
): void => {
  if (!existing || existing.id === categoryId) return;

  throw conflictError('A category with this name already exists at this level', {
    name: lookup.name,
    parentId: lookup.parentId,
    catalogId: lookup.catalogId,
  });
};

export const buildCategoryUpdatePayload = (
  data: ProductCategoryUpdateInput,
  normalizedName: string | undefined,
  placement: ResolvedCategoryPlacement
): ProductCategoryUpdateInput => ({
  ...(normalizedName !== undefined ? { name: normalizedName } : {}),
  ...(data.description !== undefined ? { description: data.description } : {}),
  ...(data.color !== undefined ? { color: data.color } : {}),
  ...(data.parentId !== undefined || placement.placementChanged
    ? { parentId: placement.nextParentId }
    : {}),
  ...(data.catalogId !== undefined ? { catalogId: placement.nextCatalogId } : {}),
  ...(data.sortIndex !== undefined ? { sortIndex: data.sortIndex } : {}),
});
