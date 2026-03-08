import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { noteCreateSchema } from '@/features/notesapp';
import { noteService } from '@/features/notesapp/server';
import { parseJsonBody } from '@/features/products/server';
import type { NoteFilters } from '@/shared/contracts/notes';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import {
  optionalCsvQueryStringArray,
  optionalTrimmedQueryString,
} from '@/shared/lib/api/query-schema';

const searchScopeSchema = z.preprocess((value) => {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized === 'both' || normalized === 'title' || normalized === 'content'
    ? normalized
    : undefined;
}, z.enum(['both', 'title', 'content']).optional());

const optionalPresentBooleanSchema = z.preprocess((value) => {
  if (value === undefined) return undefined;
  return typeof value === 'string' && value.trim().toLowerCase() === 'true';
}, z.boolean().optional());

export const querySchema = z.object({
  truncateContent: z.preprocess(
    (value) => typeof value === 'string' && value.trim().toLowerCase() === 'true',
    z.boolean()
  ),
  notebookId: optionalTrimmedQueryString(),
  search: optionalTrimmedQueryString(),
  searchScope: searchScopeSchema,
  isPinned: optionalPresentBooleanSchema,
  isArchived: optionalPresentBooleanSchema,
  isFavorite: optionalPresentBooleanSchema,
  tagIds: optionalCsvQueryStringArray(),
  categoryIds: optionalCsvQueryStringArray(),
});

/**
 * GET /api/notes
 * Fetches a list of notes with optional filters.
 */
export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const query = (_ctx.query ?? {}) as z.infer<typeof querySchema>;

  const filters: NoteFilters = {
    truncateContent: query.truncateContent,
  };
  if (query.notebookId) {
    filters.notebookId = query.notebookId;
  } else {
    const notebook = await noteService.getOrCreateDefaultNotebook();
    filters.notebookId = notebook.id;
  }

  if (query.search) {
    filters.search = query.search;
  }

  if (query.searchScope) {
    filters.searchScope = query.searchScope;
  }

  if (query.isPinned !== undefined) {
    filters.isPinned = query.isPinned;
  }

  if (query.isArchived !== undefined) {
    filters.isArchived = query.isArchived;
  }

  if (query.isFavorite !== undefined) {
    filters.isFavorite = query.isFavorite;
  }

  if (query.tagIds) {
    filters.tagIds = query.tagIds;
  }

  if (query.categoryIds) {
    filters.categoryIds = query.categoryIds;
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
