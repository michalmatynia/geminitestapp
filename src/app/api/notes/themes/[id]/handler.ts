import { type NextRequest, NextResponse } from 'next/server';

import { themeUpdateSchema } from '@/features/notesapp/public';
import { noteService } from '@/features/notesapp/server';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import type { ThemeUpdateInput } from '@/shared/contracts/notes';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { notFoundError } from '@/shared/errors/app-error';
import { removeUndefined } from '@/shared/utils/object-utils';

/**
 * Note Theme Detail Handlers
 *
 * HTTP request handlers for individual note themes.
 * Handlers: getHandler, putHandler, deleteHandler
 *
 * - Manages individual theme configurations
 * - Updates theme styles and properties
 * - Handles theme deletion and cleanup
 */

/**
 * GET /api/notes/themes/[id]
 * Fetches a single theme by ID.
 */
/**
 * Handles HTTP requests.
 *
 * - Validates request inputs
 * - Performs business logic
 * - Returns appropriate response
 *
 * @param req - NextRequest object
 * @param ctx - API handler context
 * @returns Response with operation result
 */
export async function getHandler(
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
/**
 * Handles HTTP requests.
 *
 * - Validates request inputs
 * - Performs business logic
 * - Returns appropriate response
 *
 * @param req - NextRequest object
 * @param ctx - API handler context
 * @returns Response with operation result
 */
export async function patchHandler(
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
/**
 * Handles HTTP requests.
 *
 * - Validates request inputs
 * - Performs business logic
 * - Returns appropriate response
 *
 * @param req - NextRequest object
 * @param ctx - API handler context
 * @returns Response with operation result
 */
export async function deleteHandler(
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
