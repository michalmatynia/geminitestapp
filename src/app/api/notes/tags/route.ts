export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';

import { tagCreateSchema } from '@/features/notesapp/public';
import { noteService } from '@/features/notesapp/server';
import { parseJsonBody } from '@/features/products/server';
import { apiHandler } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';
import type { TagCreateInput } from '@/shared/types/domain/notes';
import { removeUndefined } from '@/shared/utils';

/**
 * GET /api/notes/tags
 * Fetches all tags.
 */
async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
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
async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const parsed = await parseJsonBody(req, tagCreateSchema, {
    logPrefix: 'tags.POST',
  });
  if (!parsed.ok) {
    return parsed.response;
  }

  const resolvedNotebookId =
    parsed.data.notebookId ?? (await noteService.getOrCreateDefaultNotebook()).id;
  const tag = await noteService.createTag(removeUndefined({
    ...parsed.data,
    notebookId: resolvedNotebookId,
  }) as TagCreateInput);
  return NextResponse.json(tag, { status: 201 });
}

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
  { source: 'notes.tags.GET' });
export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
  { source: 'notes.tags.POST' });
