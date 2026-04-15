import { type NextRequest, NextResponse } from 'next/server';

import { themeUpdateSchema } from '@/features/notesapp/public';
import { noteService } from '@/features/notesapp/server';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import type { ThemeUpdateInput } from '@/shared/contracts/notes';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { notFoundError } from '@/shared/errors/app-error';
import { removeUndefined } from '@/shared/utils/object-utils';

/**
 * GET /api/notes/themes/[id]
 * Fetches a single theme by ID.
 */
export async function GET_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const { id } = params;
  const theme = await noteService.getThemeById(id);
  if (!theme) {
    throw notFoundError('Theme not found', { themeId: id });
  }
  return NextResponse.json(theme);
}

/**
 * PATCH /api/notes/themes/[id]
 * Updates a theme.
 */
export async function PATCH_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const { id } = params;
  const parsed = await parseJsonBody(req, themeUpdateSchema, {
    logPrefix: 'themes.PATCH',
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const updated = await noteService.updateTheme(
    id,
    removeUndefined(parsed.data) as ThemeUpdateInput
  );
  if (!updated) {
    throw notFoundError('Theme not found', { themeId: id });
  }
  return NextResponse.json(updated);
}

/**
 * DELETE /api/notes/themes/[id]
 * Deletes a theme.
 */
export async function DELETE_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const { id } = params;
  const success = await noteService.deleteTheme(id);
  if (!success) {
    throw notFoundError('Theme not found', { themeId: id });
  }
  return NextResponse.json({ success: true });
}
