import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { noteService } from '@/features/notesapp/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { optionalTrimmedQueryString } from '@/shared/lib/api/query-schema';

export const querySchema = z.object({
  notebookId: optionalTrimmedQueryString(),
});

/**
 * GET /api/notes/categories/tree
 * Fetches categories as a hierarchical tree structure
 */
export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const query = (_ctx.query ?? {}) as z.infer<typeof querySchema>;
  const notebook = query.notebookId
    ? { id: query.notebookId }
    : await noteService.getOrCreateDefaultNotebook();
  const tree = await noteService.getCategoryTree(notebook.id);
  return NextResponse.json(tree);
}
