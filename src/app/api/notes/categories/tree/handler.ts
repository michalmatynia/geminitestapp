import { NextRequest, NextResponse } from 'next/server';

import { noteService } from '@/features/notesapp/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

/**
 * GET /api/notes/categories/tree
 * Fetches categories as a hierarchical tree structure
 */
export async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const notebookIdParam = searchParams.get('notebookId');
  const notebook = notebookIdParam
    ? { id: notebookIdParam }
    : await noteService.getOrCreateDefaultNotebook();
  const tree = await noteService.getCategoryTree(notebook.id);
  return NextResponse.json(tree);
}
