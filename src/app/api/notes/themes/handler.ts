import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { themeCreateSchema } from '@/features/notesapp';
import { noteService } from '@/features/notesapp/server';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import type { ThemeCreateInput } from '@/shared/contracts/notes';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { optionalTrimmedQueryString } from '@/shared/lib/api/query-schema';
import { removeUndefined } from '@/shared/utils';

export const querySchema = z.object({
  notebookId: optionalTrimmedQueryString(),
});

/**
 * GET /api/notes/themes
 * Fetches themes for a notebook.
 */
export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const query = (_ctx.query ?? {}) as z.infer<typeof querySchema>;
  const notebookId = query.notebookId
    ? query.notebookId
    : (await noteService.getOrCreateDefaultNotebook()).id;
  const themes = await noteService.getAllThemes(notebookId);
  return NextResponse.json(themes);
}

/**
 * POST /api/notes/themes
 * Creates a new theme.
 */
export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const parsed = await parseJsonBody(req, themeCreateSchema, {
    logPrefix: 'themes.POST',
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const resolvedNotebookId =
    parsed.data.notebookId ?? (await noteService.getOrCreateDefaultNotebook()).id;
  const theme = await noteService.createTheme(
    removeUndefined({
      ...parsed.data,
      notebookId: resolvedNotebookId,
    }) as ThemeCreateInput
  );
  return NextResponse.json(theme, { status: 201 });
}
