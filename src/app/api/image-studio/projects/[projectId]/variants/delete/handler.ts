import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { deleteImageStudioVariant } from '@/features/ai/image-studio/server/variant-delete';
import { badRequestError } from '@/shared/errors/app-error';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

const sanitizeProjectId = (value: string): string =>
  value.trim().replace(/[^a-zA-Z0-9-_]/g, '_');

const deleteVariantSchema = z.object({
  slotId: z.string().trim().optional(),
  assetId: z.string().trim().optional(),
  filepath: z.string().trim().optional(),
  generationRunId: z.string().trim().optional(),
  generationOutputIndex: z.number().int().finite().optional(),
  sourceSlotId: z.string().trim().optional(),
});

export async function POST_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { projectId: string }
): Promise<Response> {
  const projectId = sanitizeProjectId(params.projectId);
  if (!projectId) throw badRequestError('Project id is required');

  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = deleteVariantSchema.safeParse(body);
  if (!parsed.success) {
    throw badRequestError('Invalid payload', { errors: parsed.error.format() });
  }

  const result = await deleteImageStudioVariant({
    projectId,
    slotId: parsed.data.slotId ?? null,
    assetId: parsed.data.assetId ?? null,
    filepath: parsed.data.filepath ?? null,
    generationRunId: parsed.data.generationRunId ?? null,
    generationOutputIndex: parsed.data.generationOutputIndex ?? null,
    sourceSlotId: parsed.data.sourceSlotId ?? null,
  });

  return NextResponse.json(result);
}

