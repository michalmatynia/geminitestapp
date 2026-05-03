import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { noteService } from '@/features/notesapp/server';
import type { RelatedNote } from '@/shared/contracts/notes';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError } from '@/shared/errors/app-error';
import { optionalCsvQueryStringArray } from '@/shared/lib/api/query-schema';

export const querySchema = z.object({
  ids: optionalCsvQueryStringArray(),
});

/**
 * GET /api/notes/lookup
 * Fetches a minimal note payload for a list of ids.
 * Query params:
 * - ids: comma-separated note ids (required)
 */
export async function getHandler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const query = (_ctx.query ?? {}) as z.infer<typeof querySchema>;
  if (!query.ids) {
    throw badRequestError('ids query parameter is required');
  }
  const ids = query.ids;
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
        content: note.content,
      };
    })
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
