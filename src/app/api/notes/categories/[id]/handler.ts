import { NextRequest, NextResponse } from 'next/server';

import { categoryUpdateSchema } from '@/features/notesapp';
import { noteService } from '@/features/notesapp/server';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import type { CategoryUpdateInput } from '@/shared/contracts/notes';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { removeUndefined } from '@/shared/utils';

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
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const recursive = searchParams.get('recursive') === 'true';

  await noteService.deleteCategory(params.id, recursive);
  return NextResponse.json({ success: true });
}
