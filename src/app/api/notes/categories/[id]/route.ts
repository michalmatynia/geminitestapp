export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';

import { categoryUpdateSchema } from '@/features/notesapp';
import { noteService } from '@/features/notesapp/server';
import { parseJsonBody } from '@/features/products/server';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api';
import type { CategoryUpdateInput } from '@/shared/types/notes';
import { removeUndefined } from '@/shared/utils';

/**
 * PATCH /api/notes/categories/[id]
 * Updates a category.
 */
async function PATCH_handler(req: NextRequest, _ctx: ApiHandlerContext, params: { id: string }): Promise<Response> {
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
async function DELETE_handler(req: NextRequest, _ctx: ApiHandlerContext, params: { id: string }): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const recursive = searchParams.get('recursive') === 'true';

  await noteService.deleteCategory(params.id, recursive);
  return NextResponse.json({ success: true });
}

export const PATCH = apiHandlerWithParams<{ id: string }>(PATCH_handler, { source: 'notes.categories.[id].PATCH' });
export const DELETE = apiHandlerWithParams<{ id: string }>(DELETE_handler, { source: 'notes.categories.[id].DELETE' });
