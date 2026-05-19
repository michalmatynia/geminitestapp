import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { noteService } from '@/features/notesapp/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { optionalTrimmedQueryString } from '@/shared/lib/api/query-schema';

/**
 * Note Categories Tree Handlers
 *
 * HTTP request handlers for hierarchical category structure.
 * Handlers: getHandler
 *
 * - Returns category tree structure
 * - Provides hierarchical organization view
 * - Handles nested category relationships
 */

export const querySchema = z.object({
  notebookId: optionalTrimmedQueryString(),
});

/**
 * GET /api/notes/categories/tree
 * Fetches categories as a hierarchical tree structure
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
  const tree = await noteService.getCategoryTree(notebook.id);
  return NextResponse.json(tree);
}
