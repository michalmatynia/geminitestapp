import { NextRequest, NextResponse } from 'next/server';

import { noteService } from '@/features/notesapp/server';
import type { RelatedNoteDto as RelatedNote } from '@/shared/contracts/notes';
import { badRequestError } from '@/shared/errors/app-error';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

/**
 * GET /api/notes/lookup
 * Fetches a minimal note payload for a list of ids.
 * Query params:
 * - ids: comma-separated note ids (required)
 */
export async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const idsParam = searchParams.get('ids');
  if (!idsParam) {
    throw badRequestError('ids query parameter is required');
  }
  const ids = idsParam
    .split(',')
    .map((id: string) => id.trim())
    .filter((id: string) => id.length > 0);
  if (ids.length === 0) {
    throw badRequestError('ids query parameter is empty');
  }

  // Keep order stable and dedupe to avoid redundant work.
  const uniqueIds: string[] = Array.from(new Set(ids));
  const results = await Promise.all(
    uniqueIds.map(async (id: string): Promise<RelatedNote | null> => {
      const note = await noteService.getById(id);
      if (!note) return null;
      return { 
        id: note.id, 
        title: note.title, 
        color: note.color ?? null,
        content: note.content 
      };
    }),
  );

  const map = new Map<string, RelatedNote>();
  results.forEach((note: RelatedNote | null) => {
    if (note) map.set(note.id, note);
  });

  // Return in the same order the caller asked for.
  const ordered = ids
    .map((id: string) => map.get(id) ?? null)
    .filter((note: RelatedNote | null): note is RelatedNote => note !== null);

  return NextResponse.json(ordered);
}
