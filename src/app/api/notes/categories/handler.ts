import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { categoryCreateSchema } from '@/features/notesapp/public';
import { noteService } from '@/features/notesapp/server';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import type { CategoryCreateInput } from '@/shared/contracts/notes';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { optionalTrimmedQueryString } from '@/shared/lib/api/query-schema';
import { removeUndefined } from '@/shared/utils/object-utils';

/**
 * Note Categories API Handlers
 *
 * HTTP request handlers for note category management.
 * Handlers: getHandler, postHandler
 *
 * - Lists and creates note categories
 * - Manages category hierarchy and metadata
 * - Handles category-note associations
 */

export const querySchema = z.object({
  notebookId: optionalTrimmedQueryString(),
});

/**
 * GET /api/notes/categories
 * Fetches all categories.
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
  const categories = await noteService.getAllCategories(notebook.id);
  return NextResponse.json(categories);
}

/**
 * POST /api/notes/categories
 * Creates a new category.
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
  const parsed = await parseJsonBody(req, categoryCreateSchema, {
    logPrefix: 'categories.POST',
  });
  if (!parsed.ok) {
    return parsed.response;
  }

  const resolvedNotebookId =
    parsed.data.notebookId ?? (await noteService.getOrCreateDefaultNotebook()).id;
  const category = await noteService.createCategory(
    removeUndefined({
      ...parsed.data,
      notebookId: resolvedNotebookId,
    }) as CategoryCreateInput
  );
  return NextResponse.json(category, { status: 201 });
}
