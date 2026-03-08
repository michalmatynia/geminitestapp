import { NextRequest, NextResponse } from 'next/server';

import { categoryCreateSchema } from '@/features/notesapp';
import { noteService } from '@/features/notesapp/server';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import type { CategoryCreateInput } from '@/shared/contracts/notes';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { removeUndefined } from '@/shared/utils';

/**
 * GET /api/notes/categories
 * Fetches all categories.
 */
export async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const notebookIdParam = searchParams.get('notebookId');
  const notebook = notebookIdParam
    ? { id: notebookIdParam }
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
