export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getTagRepository } from '@/features/products/server';
import { conflictError, notFoundError } from '@/shared/errors/app-error';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api';

const productTagUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  color: z.string().nullable().optional(),
  catalogId: z.string().min(1).optional(),
});

/**
 * PUT /api/products/tags/[id]
 * Updates a product tag.
 */
async function PUT_handler(_req: NextRequest, ctx: ApiHandlerContext, params: { id: string }): Promise<Response> {
  const data = ctx.body as z.infer<typeof productTagUpdateSchema>;
  const { name, catalogId } = data;

  const repository = await getTagRepository();
  const current = await repository.getTagById(params.id);
  
  if (!current) {
    throw notFoundError('Tag not found', { tagId: params.id });
  }
  
  const nextCatalogId = catalogId ?? current.catalogId;
  
  if (name !== undefined) {
    const existing = await repository.findByName(nextCatalogId, name);
    if (existing && existing.id !== params.id) {
      throw conflictError(
        'A tag with this name already exists in this catalog',
        { name, catalogId: nextCatalogId }
      );
    }
  }

  const tag = await repository.updateTag(params.id, {
    ...(name !== undefined && { name }),
    ...(data.color !== undefined && { color: data.color }),
  });

  return NextResponse.json(tag);
}

/**
 * DELETE /api/products/tags/[id]
 * Deletes a product tag.
 */
async function DELETE_handler(_req: NextRequest, _ctx: ApiHandlerContext, params: { id: string }): Promise<Response> {
  const repository = await getTagRepository();
  await repository.deleteTag(params.id);
  return NextResponse.json({ success: true });
}

export const PUT = apiHandlerWithParams<{ id: string }>(PUT_handler, { 
  source: 'products.tags.[id].PUT',
  parseJsonBody: true,
  bodySchema: productTagUpdateSchema,
});
export const DELETE = apiHandlerWithParams<{ id: string }>(DELETE_handler, { 
  source: 'products.tags.[id].DELETE' 
});
