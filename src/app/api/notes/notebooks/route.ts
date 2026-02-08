export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';

import { notebookCreateSchema } from '@/features/notesapp';
import { noteService } from '@/features/notesapp/server';
import { parseJsonBody } from '@/features/products/server';
import { apiHandler } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api';
import type { NotebookCreateInput } from '@/shared/types/notes';
import { removeUndefined } from '@/shared/utils';

/**
 * GET /api/notes/notebooks
 * Fetches all notebooks (creates a default if none exist).
 */
async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const notebooks = await noteService.getAllNotebooks();
  return NextResponse.json(notebooks);
}

/**
 * POST /api/notes/notebooks
 * Creates a notebook.
 */
async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const parsed = await parseJsonBody(req, notebookCreateSchema, {
    logPrefix: 'notebooks.POST',
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const notebook = await noteService.createNotebook(removeUndefined(parsed.data) as NotebookCreateInput);
  return NextResponse.json(notebook, { status: 201 });
}

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
  { source: 'notes.notebooks.GET' });
export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
  { source: 'notes.notebooks.POST' });
