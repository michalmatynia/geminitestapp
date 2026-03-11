import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { ensureImageStudioSlotFromUploadedAsset } from '@/features/ai/image-studio/server/ensure-slot-from-upload';
import { imageStudioEnsureSlotFromUploadResponseSchema } from '@/shared/contracts/image-studio';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';

const sanitizeProjectId = (value: string): string => value.trim().replace(/[^a-zA-Z0-9-_]/g, '_');

const ensureFromUploadSchema = z.object({
  uploadId: z.string().trim().optional().nullable(),
  filepath: z.string().trim().optional().nullable(),
  filename: z.string().trim().optional().nullable(),
  folderPath: z.string().trim().optional().nullable(),
  selectedSlotId: z.string().trim().optional().nullable(),
});

export async function POST_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { projectId: string }
): Promise<Response> {
  const projectId = sanitizeProjectId(params.projectId);
  if (!projectId) throw badRequestError('Project id is required');

  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = ensureFromUploadSchema.safeParse(body);
  if (!parsed.success) {
    throw badRequestError('Invalid payload', { errors: parsed.error.format() });
  }

  const uploadId = parsed.data.uploadId?.trim() ?? '';
  const filepath = parsed.data.filepath?.trim() ?? '';
  if (!uploadId && !filepath) {
    throw badRequestError('Upload id or filepath is required');
  }

  const ensured = await ensureImageStudioSlotFromUploadedAsset({
    projectId,
    uploadId,
    filepath,
    filename: parsed.data.filename ?? null,
    folderPath: parsed.data.folderPath ?? null,
    selectedSlotId: parsed.data.selectedSlotId ?? null,
  });

  return NextResponse.json(
    imageStudioEnsureSlotFromUploadResponseSchema.parse({
      slot: ensured.slot,
      created: ensured.created,
      action: ensured.action,
    })
  );
}
