import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { deleteFileFromStorage, getImageFileRepository } from '@/features/files/server';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { notFoundError } from '@/shared/errors/app-error';

const tagsSchema = z.object({
  tags: z.array(z.string().trim().min(1)).default([]),
});

export async function DELETE_handler(
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
export async function PATCH_handler(
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
