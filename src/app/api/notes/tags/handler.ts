import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { tagCreateSchema } from '@/features/notesapp/public';
import { noteService } from '@/features/notesapp/server';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import type { TagCreateInput } from '@/shared/contracts/notes';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { optionalTrimmedQueryString } from '@/shared/lib/api/query-schema';
import { removeUndefined } from '@/shared/utils/object-utils';

/**
 * Note Tags API Handlers
 *
 * HTTP request handlers for note tags.
 * Handlers: getHandler, postHandler
 *
 * - Lists and creates tags for organizing notes
 * - Manages tag metadata and usage
 * - Handles tag merging and cleanup
 */

export const querySchema = z.object({
  notebookId: optionalTrimmedQueryString(),
});

/**
 * GET /api/notes/tags
 * Fetches all tags.
 */
/**
 * Handles HTTP requests.
 *
 * - Validates request inputs
 * - Performs business logic
 * - Returns appropriate response
 *
 * @param req - NextRequest object
 * @param ctx - API handler context
 * @returns Response with operation result
 */
export async function getHandler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const query = (_ctx.query ?? {}) as z.infer<typeof querySchema>;
  const notebook = query.notebookId
    ? { id: query.notebookId }
    : await noteService.getOrCreateDefaultNotebook();
  const tags = await noteService.getAllTags(notebook.id);
  return NextResponse.json(tags);
}

/**
 * POST /api/notes/tags
 * Creates a new tag.
 */
/**
 * Handles HTTP requests.
 *
 * - Validates request inputs
 * - Performs business logic
 * - Returns appropriate response
 *
 * @param req - NextRequest object
 * @param ctx - API handler context
 * @returns Response with operation result
 */
export async function postHandler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
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
