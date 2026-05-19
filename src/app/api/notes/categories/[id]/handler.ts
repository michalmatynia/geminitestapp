import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { categoryUpdateSchema } from '@/features/notesapp/public';
import { noteService } from '@/features/notesapp/server';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import type { CategoryUpdateInput } from '@/shared/contracts/notes';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { optionalBooleanQuerySchema } from '@/shared/lib/api/query-schema';
import { removeUndefined } from '@/shared/utils/object-utils';

/**
 * Note Category Detail Handlers
 *
 * HTTP request handlers for individual note categories.
 * Handlers: getHandler, putHandler, deleteHandler
 *
 * - Manages individual note categories
 * - Updates category properties and organization
 * - Handles category deletion with cascading
 */

export const querySchema = z.object({
  recursive: optionalBooleanQuerySchema().default(false),
});

/**
 * PATCH /api/notes/categories/[id]
 * Updates a category.
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
  const parsed = await parseJsonBody(req, categoryUpdateSchema, {
    logPrefix: 'categories.PATCH',
    allowEmpty: true,
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const category = await noteService.updateCategory(
    params.id,
    removeUndefined(parsed.data) as CategoryUpdateInput
  );
  return NextResponse.json(category);
}

/**
 * DELETE /api/notes/categories/[id]
 * Deletes a category.
 *
 * Query params:
 * - recursive=true: Delete all subfolders and notes within the category
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
  const query = (_ctx.query ?? {}) as z.infer<typeof querySchema>;

  await noteService.deleteCategory(params.id, query.recursive);
  return NextResponse.json({ success: true });
}
