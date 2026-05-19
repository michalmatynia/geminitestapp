import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { deleteFileFromStorage, getImageFileRepository } from '@/features/files/server';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { notFoundError } from '@/shared/errors/app-error';

/**
 * File Detail API Handlers
 *
 * HTTP request handlers for individual file operations.
 * Handlers: getHandler, deleteHandler
 *
 * - Retrieves and deletes file metadata
 * - Manages file access and permissions
 * - Handles file cleanup and storage removal
 */

const tagsSchema = z.object({
  tags: z.array(z.string().trim().min(1)).default([]),
});

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

  const imageFileRepository = await getImageFileRepository();
  const imageFile = await imageFileRepository.getImageFileById(id);

  if (!imageFile) {
    throw notFoundError('File not found');
  }

  await deleteFileFromStorage(imageFile.filepath);

  await imageFileRepository.deleteImageFile(id);

  return new Response(null, { status: 204 });
}
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
  const parsed = await parseJsonBody(req, tagsSchema, {
    logPrefix: 'files-tags',
  });
  if (!parsed.ok) return parsed.response;

  const imageFileRepository = await getImageFileRepository();
  const updated = await imageFileRepository.updateImageFileTags(id, parsed.data.tags);
  if (!updated) {
    throw notFoundError('File not found');
  }
  return NextResponse.json(updated);
}
