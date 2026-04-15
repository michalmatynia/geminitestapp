import { type NextRequest, NextResponse } from 'next/server';

import { notebookCreateSchema } from '@/features/notesapp/public';
import { noteService } from '@/features/notesapp/server';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { removeUndefined } from '@/shared/utils/object-utils';

/**
 * GET /api/notes/notebooks
 * Fetches all notebooks (creates a default if none exist).
 */
export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const notebooks = await noteService.getAllNotebooks();
  return NextResponse.json(notebooks);
}

/**
 * POST /api/notes/notebooks
 * Creates a notebook.
 */
export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const parsed = await parseJsonBody(req, notebookCreateSchema, {
    logPrefix: 'notebooks.POST',
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const notebook = await noteService.createNotebook(removeUndefined(parsed.data));
  return NextResponse.json(notebook, { status: 201 });
}
