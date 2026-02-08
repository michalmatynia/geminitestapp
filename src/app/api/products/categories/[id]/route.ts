export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getCategoryRepository } from '@/features/products/server';
import {
  badRequestError,
  conflictError,
  notFoundError,
} from '@/shared/errors/app-error';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api';

const productCategoryUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  parentId: z.string().nullable().optional(),
  catalogId: z.string().min(1).optional(),
});

/**
 * GET /api/products/categories/[id]
 * Fetches a single product category by ID.
 */
async function GET_handler(
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
async function PUT_handler(
  _req: NextRequest,
  ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const data = productCategoryUpdateSchema.parse(ctx.body);
  const { name, parentId, catalogId } = data;

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
        : current.parentId ?? null;

  if (nextParentId) {
    const parent = await repository.getCategoryById(nextParentId);
    if (!parent || parent.catalogId !== nextCatalogId) {
      throw badRequestError('Parent category must be in the same catalog.', {
        parentId: nextParentId,
        catalogId: nextCatalogId,
      });
    }
  }

  // Prevent moving category to itself or its descendants
  if (
    nextParentId !== null &&
    (catalogId === undefined ||
      catalogId === current.catalogId)
  ) {
    const isDescendant = await repository.isDescendant(params.id, nextParentId);
    if (isDescendant) {
      throw badRequestError('Cannot move category into itself or its descendants');
    }
  }

  // Check for duplicate name under the new parent
  if (name !== undefined) {
    const existing = await repository.findByName(nextCatalogId, name, nextParentId);

    if (existing && existing.id !== params.id) {
      throw conflictError('A category with this name already exists at this level', {
        name,
        parentId: nextParentId,
        catalogId: nextCatalogId,
      });
    }
  }

  const category = await repository.updateCategory(params.id, {
    ...(data.name && { name: data.name }),
    ...(data.description && { description: data.description }),
    ...(data.color && { color: data.color }),
    ...(data.parentId && { parentId: data.parentId }),
  });

  return NextResponse.json(category);
}

/**
 * DELETE /api/products/categories/[id]
 * Deletes a product category and all its children (cascade).
 */
async function DELETE_handler(
  _request: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const repository = await getCategoryRepository();
  await repository.deleteCategory(params.id);
  return NextResponse.json({ success: true });
}

export const GET = apiHandlerWithParams<{ id: string }>(GET_handler, {
  source: 'products.categories.[id].GET',
});
export const PUT = apiHandlerWithParams<{ id: string }>(PUT_handler, {
  source: 'products.categories.[id].PUT',
  parseJsonBody: true,
  bodySchema: productCategoryUpdateSchema,
});
export const DELETE = apiHandlerWithParams<{ id: string }>(DELETE_handler, {
  source: 'products.categories.[id].DELETE',
});
