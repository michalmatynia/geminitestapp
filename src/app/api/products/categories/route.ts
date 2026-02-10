export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { logSystemEvent } from '@/features/observability/server';
import { getCategoryRepository } from '@/features/products/server';
import { badRequestError, conflictError } from '@/shared/errors/app-error';
import { apiHandler } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';

const shouldLogTiming = () => process.env['DEBUG_API_TIMING'] === 'true';

const buildServerTiming = (entries: Record<string, number | null | undefined>): string => {
  const parts = Object.entries(entries)
    .filter(([, value]) => typeof value === 'number' && Number.isFinite(value) && value >= 0)
    .map(([name, value]) => `${name};dur=${Math.round(value as number)}`);
  return parts.join(', ');
};

const attachTimingHeaders = (response: Response, entries: Record<string, number | null | undefined>): void => {
  const value = buildServerTiming(entries);
  if (value) {
    response.headers.set('Server-Timing', value);
  }
};

const productCategoryCreateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  parentId: z.string().nullable().optional(),
  catalogId: z.string().min(1, 'Catalog ID is required'),
  sortIndex: z.number().int().min(0).optional(),
});

/**
 * GET /api/products/categories
 * Fetches all product categories (flat list).
 * Query params:
 * - catalogId: Filter by catalog (required)
 */
async function getHandlerInternal(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const timings: Record<string, number | null | undefined> = {};
  const requestStart = performance.now();
  const { searchParams } = new URL(req.url);
  const catalogId = searchParams.get('catalogId');

  if (!catalogId) {
    throw badRequestError('catalogId query parameter is required');
  }

  const repositoryStart = performance.now();
  const repository = await getCategoryRepository();
  const categories = await repository.listCategories({ catalogId });
  timings['repository'] = performance.now() - repositoryStart;
  
  timings['total'] = performance.now() - requestStart;
  if (shouldLogTiming()) {
    await logSystemEvent({
      level: 'info',
      message: '[timing] products.categories.GET',
      context: { timings },
    });
  }
  
  const response = NextResponse.json(categories);
  attachTimingHeaders(response, timings);
  return response;
}

/**
 * POST /api/products/categories
 * Creates a new product category.
 */
async function postHandlerInternal(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const data = ctx.body as z.infer<typeof productCategoryCreateSchema>;
  const { name, parentId, catalogId } = data;
  const normalizedName = name.trim();
  if (!normalizedName) {
    throw badRequestError('Category name is required');
  }

  const repository = await getCategoryRepository();
  
  // Check for duplicate name under the same parent within the same catalog
  const existing = await repository.findByName(catalogId, normalizedName, parentId ?? null);

  if (existing) {
    throw conflictError('A category with this name already exists at this level', {
      name: normalizedName,
      parentId: parentId ?? null,
      catalogId,
    });
  }

  const category = await repository.createCategory({
    name: normalizedName,
    catalogId,
    ...(data.description !== undefined ? { description: data.description } : {}),
    ...(data.color !== undefined ? { color: data.color } : {}),
    ...(data.parentId !== undefined ? { parentId: data.parentId } : {}),
    ...(data.sortIndex !== undefined ? { sortIndex: data.sortIndex } : {}),
  });

  return NextResponse.json(category, { status: 201 });
}

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => getHandlerInternal(req, ctx),
  {
    source: 'products.categories.GET',
    cacheControl: 'no-store',
  });
export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => postHandlerInternal(req, ctx),
  { source: 'products.categories.POST', parseJsonBody: true, bodySchema: productCategoryCreateSchema });
