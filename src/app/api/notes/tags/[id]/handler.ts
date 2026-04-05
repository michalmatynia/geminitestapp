import { NextRequest, NextResponse } from 'next/server';

import { tagUpdateSchema } from '@/features/notesapp/public';
import { noteService } from '@/features/notesapp/server';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import type { TagUpdateInput } from '@/shared/contracts/notes';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { removeUndefined } from '@/shared/utils/object-utils';

/**
 * PATCH /api/notes/tags/[id]
 * Updates a tag.
 */
export async function PATCH_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const { id } = params;
  const parsed = await parseJsonBody(req, tagUpdateSchema, {
    logPrefix: 'tags.PATCH',
    allowEmpty: true,
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const tag = await noteService.updateTag(id, removeUndefined(parsed.data) as TagUpdateInput);
  return NextResponse.json(tag);
}

/**
 * DELETE /api/notes/tags/[id]
 * Deletes a tag.
 */
export async function DELETE_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const { id } = params;
  await noteService.deleteTag(id);
  return NextResponse.json({ success: true });
}
