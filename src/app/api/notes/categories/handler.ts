import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { categoryCreateSchema } from '@/features/notesapp/public';
import { noteService } from '@/features/notesapp/server';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import type { CategoryCreateInput } from '@/shared/contracts/notes';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { optionalTrimmedQueryString } from '@/shared/lib/api/query-schema';
import { removeUndefined } from '@/shared/utils';

export const querySchema = z.object({
  notebookId: optionalTrimmedQueryString(),
});

/**
 * GET /api/notes/categories
 * Fetches all categories.
 */
export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
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
export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
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
