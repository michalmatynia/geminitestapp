import { NextRequest, NextResponse } from 'next/server';

import { noteCreateSchema } from '@/features/notesapp/public';
import { noteService } from '@/features/notesapp/server';
import { parseJsonBody } from '@/features/products/server';
import type { NoteFiltersDto as NoteFilters } from '@/shared/contracts/notes';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

/**
 * GET /api/notes
 * Fetches a list of notes with optional filters.
 */
export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
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
export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const parsed = await parseJsonBody(req, noteCreateSchema, {
    logPrefix: 'notes.POST',
  });
  if (!parsed.ok) {
    return parsed.response;
  }

  const resolvedNotebookId =
    parsed.data.notebookId ?? (await noteService.getOrCreateDefaultNotebook()).id;
  const {
    title,
    content,
    color,
    tagIds,
    editorType,
    isPinned,
    isArchived,
    isFavorite,
    categoryIds,
    relatedNoteIds,
  } = parsed.data;
  const note = await noteService.create({
    title,
    content,
    color: color ?? null,
    tagIds: tagIds ?? [],
    editorType: editorType ?? 'markdown',
    isPinned: isPinned ?? false,
    isArchived: isArchived ?? false,
    isFavorite: isFavorite ?? false,
    categoryIds: categoryIds ?? [],
    relatedNoteIds: relatedNoteIds ?? [],
    notebookId: resolvedNotebookId,
  });
  return NextResponse.json(note, { status: 201 });
}
