import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getTagRepository } from '@/features/products/server';
import { updateProductTagSchema } from '@/shared/contracts/products/tags';
export { updateProductTagSchema as productTagUpdateSchema };
import type { ApiHandlerContext } from '@/shared/contracts/ui/ui/api';
import { conflictError, notFoundError, validationError } from '@/shared/errors/app-error';

const paramsSchema = z.object({
  id: z.string().trim().min(1, 'Tag id is required'),
});

const parseTagId = (params: { id: string }): string => {
  const parsed = paramsSchema.safeParse(params);
  if (!parsed.success) {
    throw validationError('Invalid route parameters', {
      issues: parsed.error.flatten(),
    });
  }
  return parsed.data.id;
};

/**
 * PUT /api/v2/products/tags/[id]
 * Updates a product tag.
 */
export async function PUT_handler(
  _req: NextRequest,
  ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const tagId = parseTagId(params);
  const data = ctx.body as z.infer<typeof updateProductTagSchema>;
  const { name, catalogId } = data;

  const repository = await getTagRepository();
  const current = await repository.getTagById(tagId);

  if (!current) {
    throw notFoundError('Tag not found', { tagId });
  }

  const nextCatalogId = catalogId ?? current.catalogId;

  if (name !== undefined) {
    const existing = await repository.findByName(nextCatalogId, name);
    if (existing && existing.id !== tagId) {
      throw conflictError('A tag with this name already exists in this catalog', {
        name,
        catalogId: nextCatalogId,
      });
    }
  }

  const tag = await repository.updateTag(tagId, {
    ...(name !== undefined && { name }),
    ...(data.color !== undefined && { color: data.color }),
  });

  return NextResponse.json(tag);
}

/**
 * DELETE /api/v2/products/tags/[id]
 * Deletes a product tag.
 */
export async function DELETE_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const repository = await getTagRepository();
  const tagId = parseTagId(params);
  await repository.deleteTag(tagId);
  return NextResponse.json({ success: true });
}
