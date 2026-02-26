

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { logSystemEvent } from '@/features/observability/server';
import { CachedProductService } from '@/features/products/performance/cached-service';
import { getCategoryRepository } from '@/features/products/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import {
  badRequestError,
  conflictError,
  notFoundError,
} from '@/shared/errors/app-error';

export const reorderCategorySchema = z.object({
  categoryId: z.string().min(1),
  parentId: z.string().nullable(),
  position: z.enum(['inside', 'before', 'after']).optional(),
  targetId: z.string().nullable().optional(),
  catalogId: z.string().min(1).optional(),
});

type ReorderCategoryPayload = z.infer<typeof reorderCategorySchema>;

const shouldLogTiming = (): boolean => process.env['DEBUG_API_TIMING'] === 'true';

const buildServerTiming = (
  entries: Record<string, number | null | undefined>
): string => {
  const parts = Object.entries(entries)
    .filter(
      ([, value]: [string, number | null | undefined]): boolean =>
        typeof value === 'number' && Number.isFinite(value) && value >= 0
    )
    .map(
      ([name, value]: [string, number | null | undefined]): string =>
        `${name};dur=${Math.round(value as number)}`
    );
  return parts.join(', ');
};

const attachTimingHeaders = (
  response: Response,
  entries: Record<string, number | null | undefined>
): void => {
  const value = buildServerTiming(entries);
  if (value) {
    response.headers.set('Server-Timing', value);
  }
};

const normalizeId = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

export async function POST_handler(
  _req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const timings: Record<string, number | null | undefined> = {};
  const requestStart = performance.now();
  const payload = ctx.body as ReorderCategoryPayload;

  const repositoryStart = performance.now();
  const repository = await getCategoryRepository();
  timings['repository'] = performance.now() - repositoryStart;

  const categoryId = payload.categoryId.trim();
  const targetParentId = normalizeId(payload.parentId);
  const targetId = normalizeId(payload.targetId);
  const position = payload.position ?? 'inside';

  const currentStart = performance.now();
  const current = await repository.getCategoryById(categoryId);
  timings['current'] = performance.now() - currentStart;
  if (!current) {
    throw notFoundError('Category not found', { categoryId });
  }

  const nextCatalogId = payload.catalogId?.trim() || current.catalogId;
  if (targetParentId === categoryId) {
    throw badRequestError('Cannot move category into itself');
  }

  if (targetParentId) {
    const parentStart = performance.now();
    const parent = await repository.getCategoryById(targetParentId);
    timings['parent'] = performance.now() - parentStart;
    if (parent?.catalogId !== nextCatalogId) {
      throw badRequestError('Parent category must be in the same catalog.', {
        parentId: targetParentId,
        catalogId: nextCatalogId,
      });
    }
  }

  if (targetParentId !== null && nextCatalogId === current.catalogId) {
    const descendantStart = performance.now();
    const isDescendant = await repository.isDescendant(categoryId, targetParentId);
    timings['descendantCheck'] = performance.now() - descendantStart;
    if (isDescendant) {
      throw badRequestError('Cannot move category into itself or its descendants');
    }
  }

  const duplicateStart = performance.now();
  const duplicate = await repository.findByName(
    nextCatalogId,
    current.name,
    targetParentId
  );
  timings['duplicateCheck'] = performance.now() - duplicateStart;
  if (duplicate && duplicate.id !== categoryId) {
    throw conflictError('A category with this name already exists at this level', {
      name: current.name,
      parentId: targetParentId,
      catalogId: nextCatalogId,
    });
  }

  const siblingsStart = performance.now();
  const siblings = await repository.listCategories({
    catalogId: nextCatalogId,
    parentId: targetParentId,
  });
  timings['siblings'] = performance.now() - siblingsStart;
  const siblingIds = siblings
    .map((category): string => category.id)
    .filter((id: string): boolean => id !== categoryId);

  let sortIndex = siblingIds.length;
  if (position === 'before' || position === 'after') {
    if (!targetId) {
      throw badRequestError('targetId is required for before/after reorder.');
    }
    const targetIndex = siblingIds.indexOf(targetId);
    if (targetIndex < 0) {
      throw badRequestError('targetId is not a sibling in the requested parent.');
    }
    sortIndex = position === 'before' ? targetIndex : targetIndex + 1;
  }

  sortIndex = Math.max(0, Math.min(sortIndex, siblingIds.length));

  const updateStart = performance.now();
  const updated = await repository.updateCategory(categoryId, {
    parentId: targetParentId,
    catalogId: nextCatalogId,
    sortIndex,
  });
  timings['update'] = performance.now() - updateStart;
  timings['total'] = performance.now() - requestStart;

  CachedProductService.invalidateAll();

  if (shouldLogTiming()) {
    await logSystemEvent({
      level: 'info',
      message: '[timing] products.categories.reorder.POST',
      context: {
        categoryId,
        targetParentId,
        targetId,
        position,
        sortIndex,
        timings,
      },
    });
  }

  const response = NextResponse.json(updated);
  attachTimingHeaders(response, timings);
  return response;
}

