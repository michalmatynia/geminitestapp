export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';

import { themeCreateSchema } from '@/features/notesapp';
import { noteService } from '@/features/notesapp/server';
import { parseJsonBody } from '@/features/products/server';
import { apiHandler } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';
import type { ThemeCreateInput } from '@/shared/types/domain/notes';
import { removeUndefined } from '@/shared/utils';

/**
 * GET /api/notes/themes
 * Fetches themes for a notebook.
 */
async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const notebookIdParam = searchParams.get('notebookId');
  const notebookId = notebookIdParam
    ? notebookIdParam
    : (await noteService.getOrCreateDefaultNotebook()).id;
  const themes = await noteService.getAllThemes(notebookId);
  return NextResponse.json(themes);
}

/**
 * POST /api/notes/themes
 * Creates a new theme.
 */
async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const parsed = await parseJsonBody(req, themeCreateSchema, {
    logPrefix: 'themes.POST',
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const resolvedNotebookId =
    parsed.data.notebookId ?? (await noteService.getOrCreateDefaultNotebook()).id;
  const theme = await noteService.createTheme(removeUndefined({
    ...parsed.data,
    notebookId: resolvedNotebookId,
  }) as ThemeCreateInput);
  return NextResponse.json(theme, { status: 201 });
}

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
  { source: 'notes.themes.GET' });
export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
  { source: 'notes.themes.POST' });
