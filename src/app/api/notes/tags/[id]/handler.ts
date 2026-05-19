import { type NextRequest, NextResponse } from 'next/server';

import { tagUpdateSchema } from '@/features/notesapp/public';
import { noteService } from '@/features/notesapp/server';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import type { TagUpdateInput } from '@/shared/contracts/notes';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { removeUndefined } from '@/shared/utils/object-utils';

/**
 * Note Tag Detail Handlers
 *
 * HTTP request handlers for individual tags.
 * Handlers: getHandler, putHandler, deleteHandler
 *
 * - Manages individual tag properties
 * - Updates tag settings and metadata
 * - Handles tag deletion
 */

/**
 * PATCH /api/notes/tags/[id]
 * Updates a tag.
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
  const parsed = await parseJsonBody(req, tagUpdateSchema, {
    logPrefix: 'tags.PATCH',
    allowEmpty: true,
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const tag = await noteService.updateTag(id, removeUndefined(parsed.data) as TagUpdateInput);
  return NextResponse.json(tag);
}

/**
 * DELETE /api/notes/tags/[id]
 * Deletes a tag.
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
  await noteService.deleteTag(id);
  return NextResponse.json({ success: true });
}
