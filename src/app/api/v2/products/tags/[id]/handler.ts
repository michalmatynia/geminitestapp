import { type NextRequest, NextResponse } from 'next/server';
import { type z } from 'zod';

import { getTagRepository } from '@/features/products/server';
import { updateProductTagSchema } from '@/shared/contracts/products/tags';
export { updateProductTagSchema as productTagUpdateSchema };
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { notFoundError } from '@/shared/errors/app-error';
import {
  assertAvailableProductTagName,
  buildProductTagNameLookupInput,
  buildProductTagUpdateInput,
  parseTagId,
} from './handler.helpers';

/**
 * PUT /api/v2/products/tags/[id]
 * Updates a product tag.
 */
export async function putHandler(
  _req: NextRequest,
  ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const tagId = parseTagId(params);
  const data = ctx.body as z.infer<typeof updateProductTagSchema>;

  const repository = await getTagRepository();
  const current = await repository.getTagById(tagId);

  if (!current) {
    throw notFoundError('Tag not found', { tagId });
  }

  const lookup = buildProductTagNameLookupInput(current, data);
  if (lookup) {
    const existing = await repository.findByName(lookup.catalogId, lookup.name);
    assertAvailableProductTagName(existing, tagId, lookup);
  }

  const tag = await repository.updateTag(tagId, buildProductTagUpdateInput(data));

  return NextResponse.json(tag);
}

/**
 * DELETE /api/v2/products/tags/[id]
 * Deletes a product tag.
 */
export async function deleteHandler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const repository = await getTagRepository();
  const tagId = parseTagId(params);
  await repository.deleteTag(tagId);
  return NextResponse.json({ success: true });
}
