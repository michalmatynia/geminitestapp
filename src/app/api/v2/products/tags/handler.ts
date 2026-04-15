import { type NextRequest, NextResponse } from 'next/server';
import { type z } from 'zod';

import { getTagRepository } from '@/features/products/server';
import { createProductTagSchema } from '@/shared/contracts/products/tags';
export { createProductTagSchema as productTagCreateSchema };
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError, conflictError } from '@/shared/errors/app-error';
import { catalogIdQuerySchema } from '@/shared/validations/product-metadata-api-schemas';

export const querySchema = catalogIdQuerySchema;

/**
 * GET /api/v2/products/tags
 * Fetches all product tags (flat list).
 * Query params:
 * - catalogId: Filter by catalog (required)
 */
export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const query = (_ctx.query ?? {}) as z.infer<typeof querySchema>;
  const catalogId = query.catalogId;

  if (!catalogId) {
    throw badRequestError('catalogId query parameter is required');
  }

  const repository = await getTagRepository();
  const tags = await repository.listTags({ catalogId });

  return NextResponse.json(tags);
}

/**
 * POST /api/v2/products/tags
 * Creates a new product tag.
 */
export async function POST_handler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const data = ctx.body as z.infer<typeof createProductTagSchema>;
  const { name, catalogId } = data;

  const repository = await getTagRepository();
  const existing = await repository.findByName(catalogId, name);

  if (existing) {
    throw conflictError('A tag with this name already exists in this catalog', { name, catalogId });
  }

  const tag = await repository.createTag({
    name,
    color: data.color ?? '#38bdf8',
    catalogId,
  });

  return NextResponse.json(tag, { status: 201 });
}
