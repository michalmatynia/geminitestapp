import { NextRequest, NextResponse } from 'next/server';

import { deleteNoteFile } from '@/features/files/server';
import { noteService } from '@/features/notesapp/server';
import type { NoteFileDto } from '@/shared/contracts/notes';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError, internalError, notFoundError } from '@/shared/errors/app-error';

const MAX_SLOT_INDEX = 9;

/**
 * DELETE /api/notes/[id]/files/[slotIndex]
 * Delete a file from a specific slot
 */
export async function DELETE_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string; slotIndex: string }
): Promise<Response> {
  const { id: noteId, slotIndex: slotIndexStr } = params;

  const slotIndex = parseInt(slotIndexStr, 10);
  if (isNaN(slotIndex) || slotIndex < 0 || slotIndex > MAX_SLOT_INDEX) {
    throw badRequestError(`Slot index must be between 0 and ${MAX_SLOT_INDEX}`, {
      slotIndex: slotIndexStr,
    });
  }

  // Get the file to find its filepath
  const files = await noteService.getNoteFiles(noteId);
  const file = files.find( (f: NoteFileDto) => f.slotIndex === slotIndex);

  if (!file) {
    throw notFoundError('File not found in this slot', { noteId, slotIndex });
  }

  const success = await deleteNoteFile(noteId, slotIndex, file.filepath);
  if (!success) {
    throw internalError('Failed to delete file', { noteId, slotIndex });
  }

  return NextResponse.json({ success: true });
}
