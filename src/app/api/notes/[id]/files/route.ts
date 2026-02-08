export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';

import { uploadNoteFile } from '@/features/files/server';
import { noteService } from '@/features/notesapp/server';
import { badRequestError, conflictError, notFoundError } from '@/shared/errors/app-error';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_SLOT_INDEX = 9;

/**
 * GET /api/notes/[id]/files
 * Get all files for a note
 */
async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext, params: { id: string }): Promise<Response> {
  const { id } = params;
  const files = await noteService.getNoteFiles(id);
  return NextResponse.json(files);
}

/**
 * POST /api/notes/[id]/files
 * Upload a file to a specific slot
 */
async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext, params: { id: string }): Promise<Response> {
  const { id: noteId } = params;

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch (error) {
    throw badRequestError('Invalid form data', { error });
  }

  const file = formData.get('file') as File | null;
  const slotIndexStr = formData.get('slotIndex') as string | null;

  if (!file) {
    throw badRequestError('No file provided');
  }

  if (!slotIndexStr) {
    throw badRequestError('No slot index provided');
  }

  const slotIndex = parseInt(slotIndexStr, 10);
  if (isNaN(slotIndex) || slotIndex < 0 || slotIndex > MAX_SLOT_INDEX) {
    throw badRequestError(`Slot index must be between 0 and ${MAX_SLOT_INDEX}`, {
      slotIndex: slotIndexStr,
    });
  }

  if (file.size > MAX_FILE_SIZE) {
    throw badRequestError('File size exceeds 10MB limit', {
      size: file.size,
      maxSize: MAX_FILE_SIZE,
    });
  }

  // Check if note exists
  const note = await noteService.getById(noteId);
  if (!note) {
    throw notFoundError('Note not found', { noteId });
  }

  // Check if slot is already occupied
  const existingFiles = await noteService.getNoteFiles(noteId);
  const existingFile = existingFiles.find((f) => f.slotIndex === slotIndex);
  if (existingFile) {
    throw conflictError(
      `Slot ${slotIndex} is already occupied. Delete the existing file first.`,
      { noteId, slotIndex }
    );
  }

  const noteFile = await uploadNoteFile(file, noteId, slotIndex);
  return NextResponse.json(noteFile, { status: 201 });
}

export const GET = apiHandlerWithParams<{ id: string }>(GET_handler, { source: 'notes.[id].files.GET' });
export const POST = apiHandlerWithParams<{ id: string }>(POST_handler, { source: 'notes.[id].files.POST' });
