export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';

import { noteCreateSchema } from '@/features/notesapp';
import { noteService } from '@/features/notesapp/server';
import { parseJsonBody } from '@/features/products/server';
import { apiHandler } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';
import type { NoteFilters } from '@/shared/types/domain/notes';

export const revalidate = 10;

/**
 * GET /api/notes
 * Fetches a list of notes with optional filters.
 */
async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const { searchParams } = new URL(_req.url);

  const filters: NoteFilters = {
    truncateContent: searchParams.get('truncateContent') === 'true',
  };
  const notebookIdParam = searchParams.get('notebookId');
  if (notebookIdParam) {
    filters.notebookId = notebookIdParam;
  } else {
    const notebook = await noteService.getOrCreateDefaultNotebook();
    filters.notebookId = notebook.id;
  }

  if (searchParams.has('search')) {
    filters.search = searchParams.get('search')!;
  }

  if (searchParams.has('searchScope')) {
    const scope = searchParams.get('searchScope');
    if (scope === 'both' || scope === 'title' || scope === 'content') {
      filters.searchScope = scope;
    }
  }

  if (searchParams.has('isPinned')) {
    filters.isPinned = searchParams.get('isPinned') === 'true';
  }

  if (searchParams.has('isArchived')) {
    filters.isArchived = searchParams.get('isArchived') === 'true';
  }

  if (searchParams.has('isFavorite')) {
    filters.isFavorite = searchParams.get('isFavorite') === 'true';
  }

  if (searchParams.has('tagIds')) {
    filters.tagIds = searchParams.get('tagIds')!.split(',');
  }

  if (searchParams.has('categoryIds')) {
    filters.categoryIds = searchParams.get('categoryIds')!.split(',');
  }

  const notes = await noteService.getAll(filters);
  return NextResponse.json(notes);
}

/**
 * POST /api/notes
 * Creates a new note.
 */
async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const parsed = await parseJsonBody(req, noteCreateSchema, {
    logPrefix: 'notes.POST',
  });
  if (!parsed.ok) {
    return parsed.response;
  }

  const resolvedNotebookId =
    parsed.data.notebookId ?? (await noteService.getOrCreateDefaultNotebook()).id;
  const note = await noteService.create({
    ...parsed.data,
    notebookId: resolvedNotebookId,
  });
  return NextResponse.json(note, { status: 201 });
}

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
  { source: 'notes.GET' });
export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
  { source: 'notes.POST' });
