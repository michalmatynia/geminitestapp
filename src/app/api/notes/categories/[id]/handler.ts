import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { categoryUpdateSchema } from '@/features/notesapp';
import { noteService } from '@/features/notesapp/server';
import { parseJsonBody } from '@/features/products/server';
import type { CategoryUpdateInput } from '@/shared/contracts/notes';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { optionalBooleanQuerySchema } from '@/shared/lib/api/query-schema';
import { removeUndefined } from '@/shared/utils';

export const querySchema = z.object({
  recursive: optionalBooleanQuerySchema().default(false),
});

/**
 * PATCH /api/notes/categories/[id]
 * Updates a category.
 */
export async function PATCH_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const parsed = await parseJsonBody(req, categoryUpdateSchema, {
    logPrefix: 'categories.PATCH',
    allowEmpty: true,
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const category = await noteService.updateCategory(
    params.id,
    removeUndefined(parsed.data) as CategoryUpdateInput
  );
  return NextResponse.json(category);
}

/**
 * DELETE /api/notes/categories/[id]
 * Deletes a category.
 *
 * Query params:
 * - recursive=true: Delete all subfolders and notes within the category
 */
export async function DELETE_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const query = (_ctx.query ?? {}) as z.infer<typeof querySchema>;

  await noteService.deleteCategory(params.id, query.recursive);
  return NextResponse.json({ success: true });
}
