import { NextRequest, NextResponse } from 'next/server';

import { noteUpdateSchema } from '@/features/notesapp/public';
import { noteService } from '@/features/notesapp/server';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import type { NoteUpdateInput } from '@/shared/contracts/notes';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { notFoundError } from '@/shared/errors/app-error';
import { removeUndefined } from '@/shared/utils';

/**
 * GET /api/notes/[id]
 * Fetches a single note by ID.
 */
export async function GET_handler(
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
export async function PATCH_handler(
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
  const note = await noteService.update(id, removeUndefined(body) as NoteUpdateInput);

  return NextResponse.json(note);
}

/**
 * DELETE /api/notes/[id]
 * Deletes a note.
 */
export async function DELETE_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const id = params.id;
  await noteService.delete(id);
  return NextResponse.json({ success: true });
}
