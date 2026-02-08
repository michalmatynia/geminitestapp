export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';

import { noteUpdateSchema } from '@/features/notesapp';
import { noteService } from '@/features/notesapp/server';
import { parseJsonBody } from '@/features/products/server';
import { notFoundError } from '@/shared/errors/app-error';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api';
import type { NoteUpdateInput } from '@/shared/types/notes';
import { removeUndefined } from '@/shared/utils';

/**
 * GET /api/notes/[id]
 * Fetches a single note by ID.
 */
async function GET_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const id = params.id;
  const note = await noteService.getById(id);

  if (!note) {
    throw notFoundError('Note not found', { noteId: id });
  }

  return NextResponse.json(note);
}

/**
 * PATCH /api/notes/[id]
 * Updates a note.
 */
async function PATCH_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const id = params.id;
  const parsed = await parseJsonBody(req, noteUpdateSchema, {
    logPrefix: 'notes.PATCH',
    allowEmpty: true,
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const body = parsed.data;
  const note = await noteService.update(
    id,
    removeUndefined(body) as NoteUpdateInput
  );

  return NextResponse.json(note);
}

/**
 * DELETE /api/notes/[id]
 * Deletes a note.
 */
async function DELETE_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const id = params.id;
  await noteService.delete(id);
  return NextResponse.json({ success: true });
}

export const GET = apiHandlerWithParams<{ id: string }>(GET_handler, {
  source: 'notes.[id].GET',
});
export const PATCH = apiHandlerWithParams<{ id: string }>(PATCH_handler, {
  source: 'notes.[id].PATCH',
});
export const DELETE = apiHandlerWithParams<{ id: string }>(DELETE_handler, {
  source: 'notes.[id].DELETE',
});
