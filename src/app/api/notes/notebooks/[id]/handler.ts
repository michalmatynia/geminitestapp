import { NextRequest, NextResponse } from 'next/server';

import { notebookUpdateSchema } from '@/features/notesapp';
import { noteService } from '@/features/notesapp/server';
import { parseJsonBody } from '@/features/products/server';
import type { NotebookUpdateInput } from '@/shared/contracts/notes';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { removeUndefined } from '@/shared/utils';

/**
 * PATCH /api/notes/notebooks/[id]
 * Updates a notebook.
 */
export async function PATCH_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const { id } = params;
  const parsed = await parseJsonBody(req, notebookUpdateSchema, {
    logPrefix: 'notebooks.PATCH',
    allowEmpty: true,
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const notebook = await noteService.updateNotebook(
    id,
    removeUndefined(parsed.data) as Partial<NotebookUpdateInput>
  );
  return NextResponse.json(notebook);
}

/**
 * DELETE /api/notes/notebooks/[id]
 * Deletes a notebook (and its notes/tags/categories).
 */
export async function DELETE_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const { id } = params;
  await noteService.deleteNotebook(id);
  return NextResponse.json({ success: true });
}
