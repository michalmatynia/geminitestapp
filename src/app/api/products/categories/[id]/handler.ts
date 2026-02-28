import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { CachedProductService } from '@/features/products/performance/cached-service';
import { getCategoryRepository } from '@/features/products/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError, conflictError, notFoundError } from '@/shared/errors/app-error';

export const productCategoryUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  parentId: z.string().nullable().optional(),
  catalogId: z.string().min(1).optional(),
  sortIndex: z.number().int().min(0).optional(),
});

/**
 * GET /api/products/categories/[id]
 * Fetches a single product category by ID.
 */
export async function GET_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const repository = await getCategoryRepository();
  const category = await repository.getCategoryWithChildren(params.id);

  if (!category) {
    throw notFoundError('Category not found', { categoryId: params.id });
  }

  return NextResponse.json(category);
}

/**
 * PUT /api/products/categories/[id]
 * Updates a product category.
 */
export async function PUT_handler(
  _req: NextRequest,
  ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const data = ctx.body as z.infer<typeof productCategoryUpdateSchema>;
  const { parentId, catalogId } = data;
  const normalizedName = data.name !== undefined ? data.name.trim() : undefined;
  if (data.name !== undefined && !normalizedName) {
    throw badRequestError('Category name is required');
  }

  const repository = await getCategoryRepository();
  const current = await repository.getCategoryById(params.id);

  if (!current) {
    throw notFoundError('Category not found', { categoryId: params.id });
  }

  const nextCatalogId = catalogId ?? current.catalogId;
  const nextParentId =
    parentId !== undefined
      ? parentId
      : catalogId && catalogId !== current.catalogId
        ? null
        : (current.parentId ?? null);
  const currentParentId = current.parentId ?? null;

  if (nextParentId === params.id) {
    throw badRequestError('Cannot move category into itself');
  }

  if (nextParentId) {
    const parent = await repository.getCategoryById(nextParentId);
    if (parent?.catalogId !== nextCatalogId) {
      throw badRequestError('Parent category must be in the same catalog.', {
        parentId: nextParentId,
        catalogId: nextCatalogId,
      });
    }
  }

  // Prevent moving category to itself or its descendants
  if (nextParentId !== null && (catalogId === undefined || catalogId === current.catalogId)) {
    const isDescendant = await repository.isDescendant(params.id, nextParentId);
    if (isDescendant) {
      throw badRequestError('Cannot move category into itself or its descendants');
    }
  }

  const nextName = normalizedName ?? current.name;
  const placementChanged = nextCatalogId !== current.catalogId || nextParentId !== currentParentId;
  if (normalizedName !== undefined || placementChanged) {
    const existing = await repository.findByName(nextCatalogId, nextName, nextParentId);

    if (existing && existing.id !== params.id) {
      throw conflictError('A category with this name already exists at this level', {
        name: nextName,
        parentId: nextParentId,
        catalogId: nextCatalogId,
      });
    }
  }

  const updatePayload = {
    ...(normalizedName !== undefined ? { name: normalizedName } : {}),
    ...(data.description !== undefined ? { description: data.description } : {}),
    ...(data.color !== undefined ? { color: data.color } : {}),
    ...(parentId !== undefined || placementChanged ? { parentId: nextParentId } : {}),
    ...(catalogId !== undefined ? { catalogId: nextCatalogId } : {}),
    ...(data.sortIndex !== undefined ? { sortIndex: data.sortIndex } : {}),
  };

  const category = await repository.updateCategory(params.id, updatePayload);

  CachedProductService.invalidateAll();

  return NextResponse.json(category);
}

/**
 * DELETE /api/products/categories/[id]
 * Deletes a product category and all its children (cascade).
 */
export async function DELETE_handler(
  _request: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const repository = await getCategoryRepository();
  await repository.deleteCategory(params.id);

  CachedProductService.invalidateAll();

  return NextResponse.json({ success: true });
}
