import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getImageStudioSequenceRunById } from '@/features/ai/image-studio/server/sequence-run-repository';
import {
  resolveStudioSlotIdCandidates,
  slotHasRenderableImage,
} from '@/features/ai/image-studio/utils/sequence-slot-resolution';
import { getImageStudioSlotById } from '@/features/ai/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { notFoundError, validationError } from '@/shared/errors/app-error';

const paramsSchema = z.object({
  runId: z.string().trim().min(1, 'Run id is required'),
});

export async function GET_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { runId: string }
): Promise<Response> {
  const parsedParams = paramsSchema.safeParse(params);
  if (!parsedParams.success) {
    throw validationError('Invalid route parameters', {
      issues: parsedParams.error.flatten(),
    });
  }
  const { runId } = parsedParams.data;

  const run = await getImageStudioSequenceRunById(runId);
  if (!run) {
    throw notFoundError('Sequence run not found.', { runId });
  }

  const currentSlotCandidates = resolveStudioSlotIdCandidates(run.currentSlotId);
  let resolvedCurrentSlotId: string | null = null;
  let resolvedCurrentSlotImagePath: string | null = null;
  let resolvedCurrentSlotRenderable = false;

  for (const slotIdCandidate of currentSlotCandidates) {
    const slot = await getImageStudioSlotById(slotIdCandidate);
    if (slot?.projectId !== run.projectId) continue;
    resolvedCurrentSlotId = slot.id;
    resolvedCurrentSlotImagePath =
      slot.imageFile?.filepath?.trim() || slot.imageUrl?.trim() || null;
    resolvedCurrentSlotRenderable = slotHasRenderableImage(slot);
    if (resolvedCurrentSlotRenderable) break;
  }

  return NextResponse.json({
    run,
    currentSlot: {
      id: resolvedCurrentSlotId,
      imagePath: resolvedCurrentSlotImagePath,
      renderable: resolvedCurrentSlotRenderable,
    },
  });
}
