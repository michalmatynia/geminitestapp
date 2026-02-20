import { NextRequest, NextResponse } from 'next/server';

import { getImageStudioSequenceRunById } from '@/features/ai/image-studio/server/sequence-run-repository';
import { getImageStudioSlotById } from '@/features/ai/image-studio/server/slot-repository';
import {
  resolveStudioSlotIdCandidates,
  slotHasRenderableImage,
} from '@/features/ai/image-studio/utils/sequence-slot-resolution';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

export async function GET_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { runId: string },
): Promise<Response> {
  const runId = params.runId?.trim();
  if (!runId) {
    throw badRequestError('Run id is required.');
  }

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
