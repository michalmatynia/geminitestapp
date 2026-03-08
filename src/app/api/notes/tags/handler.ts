import { NextRequest, NextResponse } from 'next/server';

import { tagCreateSchema } from '@/features/notesapp';
import { noteService } from '@/features/notesapp/server';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import type { TagCreateInput } from '@/shared/contracts/notes';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { removeUndefined } from '@/shared/utils';

/**
 * GET /api/notes/tags
 * Fetches all tags.
 */
export async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const notebookIdParam = searchParams.get('notebookId');
  const notebook = notebookIdParam
    ? { id: notebookIdParam }
    : await noteService.getOrCreateDefaultNotebook();
  const tags = await noteService.getAllTags(notebook.id);
  return NextResponse.json(tags);
}

/**
 * POST /api/notes/tags
 * Creates a new tag.
 */
export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const parsed = await parseJsonBody(req, tagCreateSchema, {
    logPrefix: 'tags.POST',
  });
  if (!parsed.ok) {
    return parsed.response;
  }

  const resolvedNotebookId =
    parsed.data.notebookId ?? (await noteService.getOrCreateDefaultNotebook()).id;
  const tag = await noteService.createTag(
    removeUndefined({
      ...parsed.data,
      notebookId: resolvedNotebookId,
    }) as TagCreateInput
  );
  return NextResponse.json(tag, { status: 201 });
}
