import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getTagRepository } from '@/features/products/server';
import { badRequestError, conflictError } from '@/shared/errors/app-error';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

export const productTagCreateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  color: z.string().nullable().optional(),
  catalogId: z.string().min(1, 'Catalog ID is required'),
});

/**
 * GET /api/products/tags
 * Fetches all product tags (flat list).
 * Query params:
 * - catalogId: Filter by catalog (required)
 */
export async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const catalogId = searchParams.get('catalogId');

  if (!catalogId) {
    throw badRequestError('catalogId query parameter is required');
  }

  const repository = await getTagRepository();
  const tags = await repository.listTags({ catalogId });
  
  return NextResponse.json(tags);
}

/**
 * POST /api/products/tags
 * Creates a new product tag.
 */
export async function POST_handler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const data = ctx.body as z.infer<typeof productTagCreateSchema>;
  const { name, catalogId } = data;

  const repository = await getTagRepository();
  const existing = await repository.findByName(catalogId, name);
  
  if (existing) {
    throw conflictError(
      'A tag with this name already exists in this catalog',
      { name, catalogId }
    );
  }

  const tag = await repository.createTag({
    name,
    color: data.color ?? '#38bdf8',
    catalogId,
  });

  return NextResponse.json(tag, { status: 201 });
}
